import {
  Prisma,
  PurchaseOrderStatus,
  SalesOrderStatus,
  StockMovementType,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  MonthlySalesQuery,
  RecentOrdersQuery,
  ReorderSoonQuery,
  StockRiskQuery,
} from "./analytics.schema";

type ReorderCandidate = {
  ruleId: string;
  productId: string;
  warehouseId: string;
  supplierId: string | null;
  product: { id: string; sku: string; name: string; category: string | null; brand: string | null };
  warehouse: { id: string; code: string; name: string };
  supplier: { id: string; code: string; name: string } | null;
  currentStock: { onHand: number; available: number; reserved: number };
  threshold: { minLevel: number; reorderQty: number; targetLevel: number | null };
  leadTimeDays: number;
  dailyOutflow: number;
  daysUntilStockout: number | null;
  shouldReorder: boolean;
  triggerReasons: string[];
  recommendedOrderQty: number;
  riskScore: number;
};

function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value.toString());
}

function asCurrency(value: number) {
  return Number(value.toFixed(2));
}

function toPercentDelta(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function trendFromDelta(delta: number): "up" | "down" | "flat" {
  if (delta > 0.001) return "up";
  if (delta < -0.001) return "down";
  return "flat";
}

function buildImagePath(seed: string) {
  const checksum = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const imageIndex = (checksum % 5) + 1;
  return `/images/product/product-0${imageIndex}.jpg`;
}

async function buildReorderCandidates(options: {
  lookbackDays: number;
  limit: number;
  triggeredOnly: boolean;
}): Promise<ReorderCandidate[]> {
  const rules = await prisma.reorderRule.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      product: { deletedAt: null },
      warehouse: { deletedAt: null },
    },
    include: {
      product: {
        select: { id: true, sku: true, name: true, category: true, brand: true },
      },
      warehouse: {
        select: { id: true, code: true, name: true },
      },
      supplier: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (rules.length === 0) {
    return [];
  }

  const productIds = Array.from(new Set(rules.map((rule) => rule.productId)));
  const warehouseIds = Array.from(new Set(rules.map((rule) => rule.warehouseId)));

  const since = new Date();
  since.setDate(since.getDate() - options.lookbackDays);

  const [levels, outflowAgg, supplierProducts] = await Promise.all([
    prisma.inventoryLevel.findMany({
      where: {
        productId: { in: productIds },
        warehouseId: { in: warehouseIds },
      },
      select: {
        productId: true,
        warehouseId: true,
        quantityOnHand: true,
        quantityAvailable: true,
        quantityReserved: true,
      },
    }),
    prisma.stockMovement.groupBy({
      by: ["productId", "warehouseId"],
      where: {
        productId: { in: productIds },
        warehouseId: { in: warehouseIds },
        createdAt: { gte: since },
        movementType: {
          in: [
            StockMovementType.OUT,
            StockMovementType.TRANSFER_OUT,
            StockMovementType.RETURN_OUT,
          ],
        },
      },
      _sum: {
        quantity: true,
      },
    }),
    prisma.supplierProduct.findMany({
      where: {
        productId: { in: productIds },
        leadTimeDays: { not: null },
      },
      select: {
        productId: true,
        supplierId: true,
        leadTimeDays: true,
      },
    }),
  ]);

  const levelByPair = new Map<string, (typeof levels)[number]>();
  for (const level of levels) {
    levelByPair.set(`${level.productId}:${level.warehouseId}`, level);
  }

  const outflowByPair = new Map<string, number>();
  for (const row of outflowAgg) {
    outflowByPair.set(
      `${row.productId}:${row.warehouseId}`,
      toNumber(row._sum.quantity),
    );
  }

  const leadTimeByProduct = new Map<string, number[]>();
  const leadTimeBySupplierProduct = new Map<string, number>();

  for (const row of supplierProducts) {
    if (!row.leadTimeDays) continue;

    const key = `${row.supplierId}:${row.productId}`;
    leadTimeBySupplierProduct.set(key, row.leadTimeDays);

    if (!leadTimeByProduct.has(row.productId)) {
      leadTimeByProduct.set(row.productId, []);
    }

    leadTimeByProduct.get(row.productId)!.push(row.leadTimeDays);
  }

  const candidates: ReorderCandidate[] = rules.map((rule) => {
    const pairKey = `${rule.productId}:${rule.warehouseId}`;
    const level = levelByPair.get(pairKey);

    const onHand = toNumber(level?.quantityOnHand);
    const available = toNumber(level?.quantityAvailable);
    const reserved = toNumber(level?.quantityReserved);

    const minLevel = toNumber(rule.minLevel);
    const reorderQty = toNumber(rule.reorderQty);
    const targetLevel = rule.targetLevel ? toNumber(rule.targetLevel) : null;

    const rawOutflow = outflowByPair.get(pairKey) ?? 0;
    const dailyOutflow = Number((rawOutflow / options.lookbackDays).toFixed(4));

    const productLeadTimes = leadTimeByProduct.get(rule.productId) ?? [];
    const fallbackLeadTime =
      productLeadTimes.length > 0
        ? Math.min(...productLeadTimes)
        : 7;

    const supplierLeadTime = rule.supplierId
      ? leadTimeBySupplierProduct.get(`${rule.supplierId}:${rule.productId}`)
      : undefined;

    const leadTimeDays = supplierLeadTime ?? fallbackLeadTime;

    const daysUntilStockout =
      dailyOutflow > 0 ? Number((available / dailyOutflow).toFixed(2)) : null;

    const triggerReasons: string[] = [];

    if (available <= 0) {
      triggerReasons.push("out_of_stock");
    }

    if (available <= minLevel) {
      triggerReasons.push("below_min_level");
    }

    if (daysUntilStockout !== null && daysUntilStockout <= leadTimeDays) {
      triggerReasons.push("stockout_before_lead_time");
    }

    const shouldReorder = triggerReasons.length > 0;
    const targetGap = targetLevel !== null ? Math.max(0, targetLevel - available) : 0;
    const minGap = Math.max(0, minLevel - available);
    const leadRisk =
      daysUntilStockout === null
        ? 0
        : Math.max(0, (leadTimeDays - daysUntilStockout) / Math.max(leadTimeDays, 1));

    const riskScore = Number((minGap + targetGap * 0.5 + leadRisk * Math.max(minLevel, 1)).toFixed(2));

    const recommendedOrderQty = Number(
      Math.max(reorderQty, targetGap > 0 ? targetGap : reorderQty).toFixed(3),
    );

    return {
      ruleId: rule.id,
      productId: rule.productId,
      warehouseId: rule.warehouseId,
      supplierId: rule.supplierId,
      product: rule.product,
      warehouse: rule.warehouse,
      supplier: rule.supplier,
      currentStock: {
        onHand,
        available,
        reserved,
      },
      threshold: {
        minLevel,
        reorderQty,
        targetLevel,
      },
      leadTimeDays,
      dailyOutflow,
      daysUntilStockout,
      shouldReorder,
      triggerReasons,
      recommendedOrderQty,
      riskScore,
    };
  });

  const filtered = options.triggeredOnly
    ? candidates.filter((candidate) => candidate.shouldReorder)
    : candidates;

  return filtered
    .sort((a, b) => {
      if (a.shouldReorder !== b.shouldReorder) {
        return a.shouldReorder ? -1 : 1;
      }

      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }

      const aDays = a.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    })
    .slice(0, options.limit);
}

export async function getReorderSoon(query: ReorderSoonQuery) {
  const items = await buildReorderCandidates({
    lookbackDays: query.lookbackDays,
    limit: query.limit,
    triggeredOnly: true,
  });

  return {
    items,
    meta: {
      lookbackDays: query.lookbackDays,
      total: items.length,
    },
  };
}

export async function getSummary() {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);

  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 60);

  const [
    productsCount,
    inventoryAgg,
    customers,
    salesCurrent,
    salesPrevious,
    purchaseOpenCount,
    reorderCandidates,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.inventoryLevel.aggregate({
      _sum: {
        quantityOnHand: true,
        quantityAvailable: true,
      },
    }),
    prisma.salesOrder.findMany({
      where: {
        deletedAt: null,
        customerName: { not: null },
      },
      distinct: ["customerName"],
      select: { customerName: true },
    }),
    prisma.salesOrder.aggregate({
      where: {
        deletedAt: null,
        orderDate: { gte: currentStart },
        status: {
          in: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.FULFILLED],
        },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.salesOrder.aggregate({
      where: {
        deletedAt: null,
        orderDate: { gte: previousStart, lt: currentStart },
        status: {
          in: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.FULFILLED],
        },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.purchaseOrder.count({
      where: {
        deletedAt: null,
        status: {
          in: [
            PurchaseOrderStatus.DRAFT,
            PurchaseOrderStatus.SUBMITTED,
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ],
        },
      },
    }),
    buildReorderCandidates({
      lookbackDays: 30,
      limit: 100,
      triggeredOnly: true,
    }),
  ]);

  const currentOrders = salesCurrent._count._all;
  const previousOrders = salesPrevious._count._all;
  const currentRevenue = toNumber(salesCurrent._sum.totalAmount);
  const previousRevenue = toNumber(salesPrevious._sum.totalAmount);

  const ordersDelta = toPercentDelta(currentOrders, previousOrders);
  const revenueDelta = toPercentDelta(currentRevenue, previousRevenue);

  return {
    cards: {
      customers: {
        label: "Customers",
        value: customers.length,
        changePct: 0,
        trend: "flat" as const,
      },
      orders: {
        label: "Orders",
        value: currentOrders,
        changePct: ordersDelta,
        trend: trendFromDelta(ordersDelta),
      },
      revenue: {
        label: "Revenue",
        value: asCurrency(currentRevenue),
        changePct: revenueDelta,
        trend: trendFromDelta(revenueDelta),
      },
      stockRisk: {
        label: "Stock Risk",
        value: reorderCandidates.length,
        changePct: 0,
        trend: "flat" as const,
      },
    },
    kpis: {
      totalProducts: productsCount,
      inventoryOnHand: asCurrency(toNumber(inventoryAgg._sum.quantityOnHand)),
      inventoryAvailable: asCurrency(toNumber(inventoryAgg._sum.quantityAvailable)),
      openPurchaseOrders: purchaseOpenCount,
      reorderSoonCount: reorderCandidates.length,
    },
    meta: {
      windowDays: 30,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function getMonthlySales(query: MonthlySalesQuery) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (query.months - 1), 1);

  const rows = await prisma.$queryRaw<
    Array<{ month_key: string; order_count: bigint; revenue: number | null }>
  >`
    SELECT
      to_char(date_trunc('month', "orderDate"), 'YYYY-MM') AS month_key,
      COUNT(*)::bigint AS order_count,
      COALESCE(SUM("totalAmount")::float8, 0) AS revenue
    FROM "SalesOrder"
    WHERE "deletedAt" IS NULL
      AND "status" IN ('CONFIRMED', 'FULFILLED')
      AND "orderDate" >= ${start}
    GROUP BY 1
    ORDER BY 1
  `;

  const byMonth = new Map(rows.map((row) => [row.month_key, row]));

  const labels: string[] = [];
  const salesSeries: number[] = [];
  const revenueSeries: number[] = [];

  for (let i = 0; i < query.months; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = d.toLocaleString("en-US", { month: "short" });

    labels.push(monthLabel);

    const row = byMonth.get(monthKey);
    salesSeries.push(row ? Number(row.order_count) : 0);
    revenueSeries.push(row ? asCurrency(row.revenue ?? 0) : 0);
  }

  return {
    labels,
    series: [
      { name: "Sales", data: salesSeries },
      { name: "Revenue", data: revenueSeries },
    ],
    meta: {
      months: query.months,
      generatedAt: new Date().toISOString(),
    },
  };
}

function mapOrderStatusToTableStatus(status: string): "Delivered" | "Pending" | "Canceled" {
  if (status === "RECEIVED" || status === "FULFILLED") {
    return "Delivered";
  }

  if (status === "CANCELLED") {
    return "Canceled";
  }

  return "Pending";
}

export async function getRecentOrders(query: RecentOrdersQuery) {
  const takeCount = query.limit;

  const [purchaseOrders, salesOrders] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, category: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { orderDate: "desc" },
      take: takeCount,
    }),
    prisma.salesOrder.findMany({
      where: { deletedAt: null },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, category: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { orderDate: "desc" },
      take: takeCount,
    }),
  ]);

  const mappedPurchase = purchaseOrders.map((order) => {
    const leadItem = order.items[0];
    const variants = Math.max(order.items.length, 1);

    return {
      id: order.id,
      type: "purchase" as const,
      orderNumber: order.orderNumber,
      name: leadItem?.product.name ?? "Purchase Order",
      variants: `${variants} Variant${variants > 1 ? "s" : ""}`,
      category: leadItem?.product.category ?? "Procurement",
      price: `$${toNumber(order.totalAmount).toFixed(2)}`,
      status: mapOrderStatusToTableStatus(order.status),
      image: buildImagePath(order.orderNumber),
      createdAt: order.orderDate,
    };
  });

  const mappedSales = salesOrders.map((order) => {
    const leadItem = order.items[0];
    const variants = Math.max(order.items.length, 1);

    return {
      id: order.id,
      type: "sales" as const,
      orderNumber: order.orderNumber,
      name: leadItem?.product.name ?? order.customerName ?? "Sales Order",
      variants: `${variants} Variant${variants > 1 ? "s" : ""}`,
      category: leadItem?.product.category ?? "Sales",
      price: `$${toNumber(order.totalAmount).toFixed(2)}`,
      status: mapOrderStatusToTableStatus(order.status),
      image: buildImagePath(order.orderNumber),
      createdAt: order.orderDate,
    };
  });

  const items = [...mappedPurchase, ...mappedSales]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, takeCount);

  return {
    items,
    meta: {
      limit: takeCount,
      generatedAt: new Date().toISOString(),
    },
  };
}

function toRiskLevel(candidate: ReorderCandidate) {
  if (candidate.currentStock.available <= 0) return "critical";
  if (candidate.currentStock.available <= candidate.threshold.minLevel) return "high";
  if (
    candidate.daysUntilStockout !== null &&
    candidate.daysUntilStockout <= candidate.leadTimeDays
  ) {
    return "medium";
  }

  return "low";
}

export async function getStockRisk(query: StockRiskQuery) {
  const items = await buildReorderCandidates({
    lookbackDays: query.lookbackDays,
    limit: query.limit,
    triggeredOnly: query.triggeredOnly,
  });

  return {
    items: items.map((candidate) => ({
      ruleId: candidate.ruleId,
      product: candidate.product,
      warehouse: candidate.warehouse,
      supplier: candidate.supplier,
      available: candidate.currentStock.available,
      onHand: candidate.currentStock.onHand,
      minLevel: candidate.threshold.minLevel,
      reorderQty: candidate.threshold.reorderQty,
      leadTimeDays: candidate.leadTimeDays,
      dailyOutflow: candidate.dailyOutflow,
      daysUntilStockout: candidate.daysUntilStockout,
      shouldReorder: candidate.shouldReorder,
      riskLevel: toRiskLevel(candidate),
      triggerReasons: candidate.triggerReasons,
      riskScore: candidate.riskScore,
    })),
    meta: {
      lookbackDays: query.lookbackDays,
      triggeredOnly: query.triggeredOnly,
      total: items.length,
    },
  };
}
