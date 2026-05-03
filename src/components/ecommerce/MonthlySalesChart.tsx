import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/apiClient";

type MonthlySeries = {
  name: string;
  data: number[];
};

type MonthlySalesResponse = {
  labels: string[];
  series: MonthlySeries[];
};

function buildMonthLabels(months: number) {
  const labels: string[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-US", { month: "short" }));
  }

  return labels;
}

function buildEmptySeries(months: number): MonthlySeries[] {
  const zeros = Array.from({ length: months }, () => 0);
  return [{ name: "Sales", data: zeros }, { name: "Revenue", data: zeros }];
}

export default function MonthlySalesChart() {
  const [labels, setLabels] = useState<string[]>(buildMonthLabels(12));
  const [series, setSeries] = useState<MonthlySeries[]>(buildEmptySeries(12));
  const [isLoading, setIsLoading] = useState(true);
  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: labels,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },

    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${Math.round(val)}`,
      },
    },
  };

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadMonthlySales = async () => {
      try {
        const payload = await apiRequest<MonthlySalesResponse>(
          "/analytics/monthly-sales?months=12",
          undefined,
          true,
        );

        if (payload.data.labels.length > 0 && payload.data.series.length > 0) {
          setLabels(payload.data.labels);
          setSeries(payload.data.series);
        } else {
          setLabels(buildMonthLabels(12));
          setSeries(buildEmptySeries(12));
        }
      } catch {
        setLabels(buildMonthLabels(12));
        setSeries(buildEmptySeries(12));
      } finally {
        setIsLoading(false);
      }
    };

    void loadMonthlySales();
  }, []);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Monthly Sales
        </h3>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
      {isLoading ? (
        <p className="pb-4 text-xs text-gray-500 dark:text-gray-400">Loading monthly sales...</p>
      ) : null}
    </div>
  );
}
