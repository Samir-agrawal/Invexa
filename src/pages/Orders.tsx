import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  supplier: { code: string; name: string };
  warehouse: { code: string; name: string };
  totalAmount: number;
  orderDate: string;
};

type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  warehouse: { code: string; name: string };
  totalAmount: number;
  orderDate: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const API_FALLBACK_URL = "http://localhost:4010/api";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const directKeys = ["accessToken", "token", "authToken", "jwtToken"];
  for (const key of directKeys) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }

  const authDataRaw = window.localStorage.getItem("auth");
  if (!authDataRaw) return null;

  try {
    const authData = JSON.parse(authDataRaw) as { accessToken?: string };
    return authData.accessToken ?? null;
  } catch {
    return null;
  }
}

async function fetchWithFallback(path: string, init?: RequestInit) {
  const candidates = API_BASE_URL === API_FALLBACK_URL ? [API_BASE_URL] : [API_BASE_URL, API_FALLBACK_URL];
  let lastError: unknown;

  for (const baseUrl of candidates) {
    try {
      return await fetch(`${baseUrl}${path}`, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to fetch");
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function Orders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {};

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const [poRes, soRes] = await Promise.all([
          fetchWithFallback("/purchase-orders?page=1&pageSize=10", { headers }),
          fetchWithFallback("/sales-orders?page=1&pageSize=10", { headers }),
        ]);

        const poPayload = await parseJsonSafely<{ success: boolean; data: PurchaseOrder[]; message?: string }>(poRes);
        const soPayload = await parseJsonSafely<{ success: boolean; data: SalesOrder[]; message?: string }>(soRes);

        if (!poRes.ok || !poPayload?.success || !soRes.ok || !soPayload?.success) {
          const status = !poRes.ok ? poRes.status : soRes.status;
          if (status === 401) {
            throw new Error("Please log in to view purchase and sales orders.");
          }

          throw new Error(poPayload?.message ?? soPayload?.message ?? "Failed to load orders");
        }

        setPurchaseOrders(poPayload.data);
        setSalesOrders(soPayload.data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <>
      <PageMeta title="Orders | InveXa" description="Manage purchase and sales orders with Reorder Alerts and Supplier Reliability context." />
      <PageBreadcrumb pageTitle="Orders" />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Orders</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{purchaseOrders.length}</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Sales Orders</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{salesOrders.length}</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Fulfillment Done</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {salesOrders.filter((order) => order.status === "FULFILLED").length}
            </h3>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800/60 dark:bg-error-500/10 dark:text-error-300">
            {errorMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Purchase Orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track procurement activity that supports replenishment timing.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Order #</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Supplier</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Total</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>Loading purchase orders...</td>
                  </TableRow>
                ) : purchaseOrders.length === 0 ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>No purchase orders match the current view.</td>
                  </TableRow>
                ) : (
                  purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{order.orderNumber}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{order.supplier.code} - {order.supplier.name}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{order.status}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">${order.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Sales Orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review customer demand that affects inventory availability.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Order #</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Customer</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Total</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>Loading sales orders...</td>
                  </TableRow>
                ) : salesOrders.length === 0 ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>No sales orders match the current view.</td>
                  </TableRow>
                ) : (
                  salesOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{order.orderNumber}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{order.customerName ?? "-"}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{order.status}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">${order.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
