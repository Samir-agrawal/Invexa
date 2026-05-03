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

type Supplier = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  productMappings: Array<{
    id: string;
    product: { sku: string; name: string };
    supplierUnitCost: number | null;
    leadTimeDays: number | null;
  }>;
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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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

        const response = await fetchWithFallback("/suppliers?page=1&pageSize=20&includeMappings=true", {
          headers,
        });
        const payload = await parseJsonSafely<{ success: boolean; data: Supplier[]; message?: string }>(response);

        if (!response.ok || !payload?.success) {
          if (response.status === 401) {
            throw new Error("Please log in to view suppliers.");
          }

          throw new Error(payload?.message ?? "Failed to load suppliers");
        }

        setSuppliers(payload.data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load suppliers");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <>
      <PageMeta
        title="Suppliers | InveXa"
        description="Supplier network view focused on Supplier Reliability and replenishment readiness."
      />
      <PageBreadcrumb pageTitle="Suppliers" />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Suppliers</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{suppliers.length}</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Mapped SKUs</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {suppliers.reduce((acc, supplier) => acc + supplier.productMappings.length, 0)}
            </h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">With Contact Email</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {suppliers.filter((supplier) => Boolean(supplier.email)).length}
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Supplier Directory</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review supplier coverage, contactability, and mapped SKUs.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Supplier</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Code</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Contact</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Mapped SKUs</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>Loading suppliers...</td>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>No suppliers match the current view.</td>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{supplier.name}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{supplier.code}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {supplier.email ?? "-"}
                        {supplier.phone ? ` / ${supplier.phone}` : ""}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{supplier.productMappings.length}</TableCell>
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
