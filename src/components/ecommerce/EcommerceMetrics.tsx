import {
  AlertHexaIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  DollarLineIcon,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/apiClient";

type Trend = "up" | "down" | "flat";

type SummaryResponse = {
  cards: {
    customers: {
      label: string;
      value: number;
      changePct: number;
      trend: Trend;
    };
    orders: {
      label: string;
      value: number;
      changePct: number;
      trend: Trend;
    };
    revenue: {
      label: string;
      value: number;
      changePct: number;
      trend: Trend;
    };
    stockRisk: {
      label: string;
      value: number;
      changePct: number;
      trend: Trend;
    };
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDelta(value: number) {
  return `${Math.abs(value).toFixed(2)}%`;
}

export default function EcommerceMetrics() {
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

  const cards = summary?.cards;

  const metrics = [
    {
      key: "customers",
      label: "Customers",
      icon: GroupIcon,
      value: cards?.customers.value ?? 0,
      changePct: cards?.customers.changePct ?? 0,
      trend: cards?.customers.trend ?? "flat",
      formatter: formatNumber,
    },
    {
      key: "orders",
      label: "Orders",
      icon: BoxIconLine,
      value: cards?.orders.value ?? 0,
      changePct: cards?.orders.changePct ?? 0,
      trend: cards?.orders.trend ?? "flat",
      formatter: formatNumber,
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: DollarLineIcon,
      value: cards?.revenue.value ?? 0,
      changePct: cards?.revenue.changePct ?? 0,
      trend: cards?.revenue.trend ?? "flat",
      formatter: formatCurrency,
    },
    {
      key: "stockRisk",
      label: "Stock Risk",
      icon: AlertHexaIcon,
      value: cards?.stockRisk.value ?? 0,
      changePct: cards?.stockRisk.changePct ?? 0,
      trend: cards?.stockRisk.trend ?? "flat",
      formatter: formatNumber,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {metrics.map((metric) => {
        const TrendIcon = metric.trend === "down" ? ArrowDownIcon : ArrowUpIcon;
        return (
          <div
            key={metric.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <metric.icon className="text-gray-800 size-6 dark:text-white/90" />
            </div>

            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {metric.label}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {isLoading ? "..." : metric.formatter(metric.value)}
                </h4>
              </div>
              <Badge
                color={
                  metric.trend === "up" ? "success" : metric.trend === "down" ? "error" : "info"
                }
              >
                <TrendIcon />
                {formatDelta(metric.changePct)}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
