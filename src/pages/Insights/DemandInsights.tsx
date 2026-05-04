import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { apiRequest } from "../../lib/apiClient";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

type SummaryResponse = {
  cards: {
    stockRisk: {
      label: string;
      value: number;
      changePct: number;
      trend: "up" | "down" | "flat";
    };
  };
  kpis: {
    inventoryOnHand: number;
    inventoryAvailable: number;
    reorderSoonCount: number;
  };
};

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

type InventoryLevel = {
  warehouse: { id: string; code: string; name: string };
};

type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

type ProductOption = {
  category: string | null;
};

const trendWindows = [7, 14, 21, 28, 35, 42];

function normalizeCategory(value: string | null) {
  return value?.trim() || "Uncategorized";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function renderTriggers(triggers: string[]) {
  if (!triggers.length) return "No triggers";
  return triggers
    .map((trigger) => trigger.replace(/_/g, " "))
    .join(", ");
}

export default function DemandInsights() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [stockRiskItems, setStockRiskItems] = useState<ReorderCandidate[]>([]);
  const [reorderSoonItems, setReorderSoonItems] = useState<ReorderCandidate[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<InventoryLevel["warehouse"][]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [riskTrendSeries, setRiskTrendSeries] = useState<number[]>([]);
  const [riskTrendLabels, setRiskTrendLabels] = useState<string[]>(
    trendWindows.map((days) => `${days}d`),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const trendRequests = trendWindows.map((days) =>
          apiRequest<ReorderCandidate[]>(
            `/analytics/stock-risk?lookbackDays=${days}&limit=200&triggeredOnly=true`,
            undefined,
            true,
          ),
        );

        const results = await Promise.allSettled([
          apiRequest<SummaryResponse>("/analytics/summary", undefined, true),
          apiRequest<ReorderCandidate[]>(
            "/analytics/stock-risk?lookbackDays=30&limit=8&triggeredOnly=true",
            undefined,
            true,
          ),
          apiRequest<ReorderCandidate[]>(
            "/alerts/reorder-soon?lookbackDays=30&limit=8",
            undefined,
            true,
          ),
          apiRequest<InventoryLevel[]>("/inventory/levels?page=1&pageSize=100", undefined, true),
          apiRequest<SupplierOption[]>("/suppliers?page=1&pageSize=100", undefined, true),
          apiRequest<ProductOption[]>("/products?page=1&pageSize=100", undefined, true),
          ...trendRequests,
        ]);

        const summaryResult = results[0];
        const stockResult = results[1];
        const reorderResult = results[2];
        const levelsResult = results[3];
        const suppliersResult = results[4];
        const productsResult = results[5];
        const trendResults = results.slice(6);

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value.data);
        }

        if (stockResult.status === "fulfilled") {
          const items = stockResult.value.data;
          setStockRiskItems(Array.isArray(items) ? items : []);
        }

        if (reorderResult.status === "fulfilled") {
          const items = reorderResult.value.data;
          setReorderSoonItems(Array.isArray(items) ? items : []);
        }

        if (levelsResult.status === "fulfilled") {
          const levelsData = levelsResult.value.data;
          if (Array.isArray(levelsData)) {
            const warehouseMap = new Map<string, InventoryLevel["warehouse"]>();
            levelsData.forEach((level) => {
              if (level?.warehouse?.id) {
                warehouseMap.set(level.warehouse.id, level.warehouse);
              }
            });
            setWarehouseOptions(Array.from(warehouseMap.values()));
          }
        }

        if (suppliersResult.status === "fulfilled") {
          const suppliersData = suppliersResult.value.data;
          setSupplierOptions(Array.isArray(suppliersData) ? suppliersData : []);
        }

        if (productsResult.status === "fulfilled") {
          const categories = new Set(
            productsResult.value.data.map((product) => normalizeCategory(product.category)),
          );
          setCategoryOptions(Array.from(categories).sort((a, b) => a.localeCompare(b)));
        }

        const trendSeries = trendResults
          .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof apiRequest<ReorderCandidate[]>>>> =>
            result.status === "fulfilled",
          )
          .map((payload) => payload.value.data.length);

        setRiskTrendSeries(trendSeries);
        setRiskTrendLabels(trendWindows.map((days) => `${days}d`));
      } finally {
        setIsLoading(false);
      }
    };

    void loadInsights();
  }, []);

  const stockRiskCount = summary?.cards.stockRisk.value ?? 0;
  const reorderSoonCount = summary?.kpis.reorderSoonCount ?? 0;
  const inventoryOnHand = summary?.kpis.inventoryOnHand ?? 0;
  const inventoryAvailable = summary?.kpis.inventoryAvailable ?? 0;

  const summaryCards = useMemo(
    () => [
      {
        label: "Stock Risk",
        value: formatNumber(stockRiskCount),
        helper: "Triggered in last 30 days",
      },
      {
        label: "Reorder Soon",
        value: formatNumber(reorderSoonCount),
        helper: "Active reorder alerts",
      },
      {
        label: "Inventory On Hand",
        value: formatCompact(inventoryOnHand),
        helper: "Total units",
      },
      {
        label: "Inventory Available",
        value: formatCompact(inventoryAvailable),
        helper: "Ready to sell",
      },
    ],
    [stockRiskCount, reorderSoonCount, inventoryOnHand, inventoryAvailable],
  );

  const filteredStockRiskItems = useMemo(() => {
    return stockRiskItems.filter((item) => {
      if (selectedWarehouse && item.warehouse?.id !== selectedWarehouse) return false;
      if (selectedSupplier && item.supplier?.id !== selectedSupplier) return false;
      if (selectedCategory && normalizeCategory(item.product?.category ?? null) !== selectedCategory) return false;
      return true;
    });
  }, [stockRiskItems, selectedWarehouse, selectedSupplier, selectedCategory]);

  const filteredReorderSoonItems = useMemo(() => {
    return reorderSoonItems.filter((item) => {
      if (selectedWarehouse && item.warehouse?.id !== selectedWarehouse) return false;
      if (selectedSupplier && item.supplier?.id !== selectedSupplier) return false;
      if (selectedCategory && normalizeCategory(item.product?.category ?? null) !== selectedCategory) return false;
      return true;
    });
  }, [reorderSoonItems, selectedWarehouse, selectedSupplier, selectedCategory]);

  const trendSeries = riskTrendSeries.length > 0 ? riskTrendSeries : trendWindows.map(() => 0);
  const trendOptions: ApexOptions = {
    chart: {
      type: "line",
      sparkline: { enabled: true },
      toolbar: { show: false },
    },
    stroke: { width: 2, curve: "smooth" },
    colors: ["#f59e0b"],
    tooltip: {
      enabled: true,
      x: { formatter: (_value, opts) => riskTrendLabels[opts.dataPointIndex] ?? "" },
    },
  };

  return (
    <div>
      <PageMeta
        title="Demand Insights | InveXa"
        description="Track stock risk, reorder alerts, and inventory health signals."
      />
      <PageBreadcrumb pageTitle="Demand Insights" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Query-Based Demand Insights
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Prioritize replenishment and protect availability with risk and reorder signals.
        </p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Warehouse</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              value={selectedWarehouse}
              onChange={(event) => setSelectedWarehouse(event.target.value)}
            >
              <option value="">All warehouses</option>
              {warehouseOptions.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Supplier</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              value={selectedSupplier}
              onChange={(event) => setSelectedSupplier(event.target.value)}
            >
              <option value="">All suppliers</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} - {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Category</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <button
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => {
              setSelectedWarehouse("");
              setSelectedSupplier("");
              setSelectedCategory("");
            }}
            type="button"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <h3 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {isLoading ? "..." : card.value}
            </h3>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Stock Risk Signals
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Products trending toward stockout within lead time.
              </p>
            </div>
            <Badge color="warning">{filteredStockRiskItems.length} items</Badge>
          </div>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">Stock risk trend</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-200/80">Triggered alerts by lookback window</p>
              </div>
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-200">
                {trendSeries[trendSeries.length - 1] ?? 0} latest
              </div>
            </div>
            <div className="mt-2">
              <Chart
                options={trendOptions}
                series={[{ name: "Risk alerts", data: trendSeries }]}
                type="line"
                height={80}
              />
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Product
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Warehouse
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Available
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Days to stockout
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Risk score
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Triggers
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <TableRow>
                    <TableCell className="py-6 text-theme-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                      Loading stock risk signals...
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && filteredStockRiskItems.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-6 text-theme-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                      No stock risk alerts right now.
                    </TableCell>
                  </TableRow>
                ) : null}

                {filteredStockRiskItems.map((item) => (
                  <TableRow key={item.ruleId}>
                    <TableCell className="py-4 text-theme-sm text-gray-700 dark:text-gray-200">
                      <div className="font-medium text-gray-800 dark:text-white/90">
                        {item.product?.name ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.product?.sku ?? "—"}</div>
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {item.warehouse?.code ?? "—"}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {formatNumber(item.currentStock?.available ?? 0)}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {item.daysUntilStockout == null ? "—" : item.daysUntilStockout}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {(item.riskScore ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-4 text-theme-xs text-gray-500 dark:text-gray-400">
                      {renderTriggers(item.triggerReasons ?? [])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Reorder Soon
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Recommended replenishments based on demand and thresholds.
              </p>
            </div>
            <Badge color="info">{filteredReorderSoonItems.length} alerts</Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Product
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Warehouse
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Available
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Min level
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Recommended
                  </TableCell>
                  <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Lead time
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <TableRow>
                    <TableCell className="py-6 text-theme-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                      Loading reorder alerts...
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && filteredReorderSoonItems.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-6 text-theme-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                      No reorder alerts right now.
                    </TableCell>
                  </TableRow>
                ) : null}

                {filteredReorderSoonItems.map((item) => (
                  <TableRow key={item.ruleId}>
                    <TableCell className="py-4 text-theme-sm text-gray-700 dark:text-gray-200">
                      <div className="font-medium text-gray-800 dark:text-white/90">
                        {item.product?.name ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.product?.sku ?? "—"}</div>
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {item.warehouse?.code ?? "—"}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {formatNumber(item.currentStock?.available ?? 0)}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {formatNumber(item.threshold?.minLevel ?? 0)}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {formatNumber(item.recommendedOrderQty ?? 0)}
                    </TableCell>
                    <TableCell className="py-4 text-theme-sm text-gray-600 dark:text-gray-300">
                      {item.leadTimeDays ?? 0} days
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
