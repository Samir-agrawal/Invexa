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

type InventoryLevel = {
  id: string;
  product: { sku: string; name: string };
  warehouse: { code: string; name: string };
  quantityOnHand: number;
  quantityAvailable: number;
  quantityReserved: number;
};

type InventoryMovement = {
  id: string;
  movementType: string;
  quantity: number;
  reason: string | null;
  referenceDocument: string | null;
  createdAt: string;
  product: { sku: string; name: string };
  warehouse: { code: string; name: string };
  actor: { fullName: string; email: string } | null;
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

export default function Inventory() {
  const [levels, setLevels] = useState<InventoryLevel[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
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

        const [levelsRes, movementsRes] = await Promise.all([
          fetchWithFallback("/inventory/levels?page=1&pageSize=12", { headers }),
          fetchWithFallback("/inventory/movements?page=1&pageSize=12", { headers }),
        ]);

        const levelsPayload = await parseJsonSafely<{ success: boolean; data: InventoryLevel[]; message?: string }>(levelsRes);
        const movementsPayload = await parseJsonSafely<{ success: boolean; data: InventoryMovement[]; message?: string }>(movementsRes);

        if (!levelsRes.ok || !levelsPayload?.success || !movementsRes.ok || !movementsPayload?.success) {
          const levelError = levelsPayload?.message;
          const movementError = movementsPayload?.message;
          const status = !levelsRes.ok ? levelsRes.status : movementsRes.status;

          if (status === 401) {
            throw new Error("Please log in to view inventory and movement history.");
          }

          throw new Error(levelError ?? movementError ?? "Failed to load inventory data");
        }

        setLevels(levelsPayload.data);
        setMovements(movementsPayload.data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <>
      <PageMeta
        title="Inventory | InveXa"
        description="Inventory Command Center view with live Reorder Alerts and Stockout Risk monitoring."
      />
      <PageBreadcrumb pageTitle="Inventory" />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tracked Levels</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{levels.length}</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Recent Movements</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{movements.length}</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Low Available Items</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {levels.filter((level) => level.quantityAvailable < 10).length}
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Warehouse Levels</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">See on-hand, available, and reserved stock by warehouse.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Warehouse</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">On Hand</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Available</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Reserved</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={5}>Loading inventory levels...</td>
                  </TableRow>
                ) : levels.length === 0 ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={5}>No inventory levels match the current view.</td>
                  </TableRow>
                ) : (
                  levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{level.product.sku} - {level.product.name}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{level.warehouse.code} - {level.warehouse.name}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{level.quantityOnHand}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{level.quantityAvailable}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{level.quantityReserved}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Latest Movements</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review recent adjustments, transfers, and stock movements.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Time</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Qty</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Reason</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={5}>Loading movements...</td>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={5}>No movements match the current view.</td>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(movement.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{movement.movementType}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{movement.product.sku}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{movement.quantity}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{movement.reason ?? "-"}</TableCell>
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
