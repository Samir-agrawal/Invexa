import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { apiRequest } from "../../lib/apiClient";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import RecentOrders from "../../components/ecommerce/RecentOrders";

type SummaryResponse = {
  kpis: {
    totalProducts: number;
    inventoryOnHand: number;
    inventoryAvailable: number;
    openPurchaseOrders: number;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function Reports() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const payload = await apiRequest<SummaryResponse>("/analytics/summary", undefined, true);
        setSummary(payload.data);
      } catch {
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Total Products",
        value: summary?.kpis.totalProducts ?? 0,
        helper: "Active catalog items",
      },
      {
        label: "Inventory On Hand",
        value: summary?.kpis.inventoryOnHand ?? 0,
        helper: "Units across warehouses",
      },
      {
        label: "Inventory Available",
        value: summary?.kpis.inventoryAvailable ?? 0,
        helper: "Ready to fulfill",
      },
      {
        label: "Open Purchase Orders",
        value: summary?.kpis.openPurchaseOrders ?? 0,
        helper: "In progress",
      },
    ],
    [summary],
  );

  return (
    <div>
      <PageMeta
        title="Reports | InveXa"
        description="Generate operational reports for inventory turnover, stockouts, and procurement cycles."
      />
      <PageBreadcrumb pageTitle="Reports" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Operational Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Summaries that highlight fulfillment, purchasing, and inventory performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <h3 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {isLoading ? "..." : formatNumber(card.value)}
            </h3>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-7">
          <MonthlySalesChart />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <RecentOrders />
        </div>
        <div className="col-span-12">
          <StatisticsChart />
        </div>
      </div>
    </div>
  );
}
