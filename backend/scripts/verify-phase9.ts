import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:4050/api";

type ApiResult = {
  status: number;
  body: any;
};

async function request(path: string, init?: RequestInit): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

function hasKeys(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(obj, key));
}

async function main() {
  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@example.com",
      password: "ChangeMe123!",
    }),
  });

  if (login.status !== 200) {
    console.log(JSON.stringify({ ok: false, step: "login", login }, null, 2));
    process.exit(1);
  }

  const token = login.body.data.accessToken as string;
  const headers = { Authorization: `Bearer ${token}` };

  const [
    reorderSoon,
    summary,
    monthlySales,
    recentOrders,
    stockRisk,
  ] = await Promise.all([
    request("/alerts/reorder-soon?lookbackDays=30&limit=10", { headers }),
    request("/analytics/summary", { headers }),
    request("/analytics/monthly-sales?months=12", { headers }),
    request("/analytics/recent-orders?limit=10", { headers }),
    request("/analytics/stock-risk?lookbackDays=30&limit=10&triggeredOnly=false", { headers }),
  ]);

  const monthlySeries = monthlySales.body?.data?.series ?? [];
  const salesSeries = monthlySeries.find((row: any) => row.name === "Sales")?.data ?? [];
  const revenueSeries = monthlySeries.find((row: any) => row.name === "Revenue")?.data ?? [];

  const nonZeroMonthly = [...salesSeries, ...revenueSeries].some((value: number) => value > 0);

  const result = {
    ok:
      reorderSoon.status === 200 &&
      summary.status === 200 &&
      monthlySales.status === 200 &&
      recentOrders.status === 200 &&
      stockRisk.status === 200 &&
      Array.isArray(monthlySales.body?.data?.labels) &&
      monthlySales.body.data.labels.length === 12 &&
      Array.isArray(monthlySeries) &&
      monthlySeries.length >= 2 &&
      Array.isArray(recentOrders.body?.data) &&
      recentOrders.body.data.length > 0 &&
      Array.isArray(stockRisk.body?.data) &&
      stockRisk.body.data.length > 0 &&
      hasKeys(summary.body?.data?.cards, ["customers", "orders", "revenue", "stockRisk"]) &&
      hasKeys(summary.body?.data?.kpis, [
        "totalProducts",
        "inventoryOnHand",
        "inventoryAvailable",
        "openPurchaseOrders",
        "reorderSoonCount",
      ]) &&
      nonZeroMonthly,
    checks: {
      reorderSoonStatus: reorderSoon.status,
      summaryStatus: summary.status,
      monthlySalesStatus: monthlySales.status,
      recentOrdersStatus: recentOrders.status,
      stockRiskStatus: stockRisk.status,
      reorderSoonCount: reorderSoon.body?.data?.length ?? 0,
      recentOrdersCount: recentOrders.body?.data?.length ?? 0,
      stockRiskCount: stockRisk.body?.data?.length ?? 0,
      monthlyLabelsCount: monthlySales.body?.data?.labels?.length ?? 0,
      monthlySeriesCount: monthlySeries.length,
      nonZeroMonthly,
      summaryHasCardsShape: hasKeys(summary.body?.data?.cards, ["customers", "orders", "revenue", "stockRisk"]),
      summaryHasKpisShape: hasKeys(summary.body?.data?.kpis, [
        "totalProducts",
        "inventoryOnHand",
        "inventoryAvailable",
        "openPurchaseOrders",
        "reorderSoonCount",
      ]),
    },
    samples: {
      reorderSoonFirst: reorderSoon.body?.data?.[0] ?? null,
      summary: summary.body?.data ?? null,
      monthlySales: monthlySales.body?.data ?? null,
      recentOrderFirst: recentOrders.body?.data?.[0] ?? null,
      stockRiskFirst: stockRisk.body?.data?.[0] ?? null,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
