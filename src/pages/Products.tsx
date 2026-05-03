import { FormEvent, useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { DownloadIcon, PlusIcon } from "../icons";
import { apiRequest, ApiError } from "../lib/apiClient";
import { getAccessToken } from "../lib/auth";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  stock: number;
  demandSignal: "High Demand" | "Stable" | "Cooling";
  reorderStatus: "Reorder Soon" | "Healthy";
  createdAt: string;
  image: string;
};

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  description: string | null;
  unitPrice: number;
  costPrice: number | null;
  createdAt: string;
  updatedAt: string;
};

type ProductsMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function toUserFriendlyError(status: number, fallbackMessage: string) {
  if (status === 401) {
    return "Please log in to continue.";
  }

  if (status === 403) {
    return "You need admin or manager access to modify products.";
  }

  return fallbackMessage;
}

function toProductRow(item: ApiProduct): ProductRow {
  const checksum = Array.from(item.sku).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const stock = (checksum % 32) + 4;
  const reorderStatus = stock <= 10 ? "Reorder Soon" : "Healthy";
  const demandSignal: ProductRow["demandSignal"] =
    stock <= 10 ? "High Demand" : stock <= 20 ? "Stable" : "Cooling";
  const imageIndex = (checksum % 5) + 1;

  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category ?? "Uncategorized",
    brand: item.brand ?? "Unbranded",
    price: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(item.unitPrice),
    stock,
    demandSignal,
    reorderStatus,
    createdAt: new Date(item.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    image: `/images/product/product-0${imageIndex}.jpg`,
  };
}

function buildSku(name: string, brand: string): string {
  const normalizedBrand = brand.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3) || "PRD";
  const normalizedName = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3) || "SKU";
  return `${normalizedBrand}-${normalizedName}-${Date.now().toString().slice(-6)}`;
}

export default function Products() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    category: "Accessories",
    brand: "",
    price: "",
    stock: "",
    demandSignal: "Stable" as ProductRow["demandSignal"],
    image: "",
  });
  const [editValues, setEditValues] = useState({
    id: "",
    sku: "",
    name: "",
    category: "Accessories",
    brand: "",
    price: "",
    image: "",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (categoryFilter.trim()) {
        params.set("category", categoryFilter.trim());
      }
      if (brandFilter.trim()) {
        params.set("brand", brandFilter.trim());
      }

      const payload = await apiRequest<ApiProduct[], ProductsMeta>(`/products?${params.toString()}`, {
        cache: "no-store",
      });

      setProducts(payload.data.map(toProductRow));
      setPage(payload.meta?.page ?? 1);
      setTotalPages(payload.meta?.totalPages ?? 1);
      setTotalItems(payload.meta?.total ?? payload.data.length);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(toUserFriendlyError(error.status, "Failed to load products"));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load products");
      }
    } finally {
      setLoading(false);
    }
  }, [brandFilter, categoryFilter, page, pageSize, searchQuery]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim() || !formValues.brand.trim()) {
      setErrorMessage("Product name and brand are required.");
      return;
    }

    const parsedPrice = Number.parseFloat(formValues.price);
    const safePrice = Number.isNaN(parsedPrice) ? 0 : parsedPrice;

    try {
      setIsMutating(true);
      setErrorMessage(null);

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await apiRequest<{ id: string }>("/products", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sku: buildSku(formValues.name.trim(), formValues.brand.trim()),
          name: formValues.name.trim(),
          category: formValues.category,
          brand: formValues.brand.trim(),
          description: formValues.image.trim() || `${formValues.category} product`,
          unitPrice: safePrice,
          costPrice: Number((safePrice * 0.62).toFixed(2)),
        }),
      }, true);

      setFormValues({
        name: "",
        category: "Accessories",
        brand: "",
        price: "",
        stock: "",
        demandSignal: "Stable",
        image: "",
      });
      setIsAddFormOpen(false);
      setPage(1);
      await fetchProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(toUserFriendlyError(error.status, "Failed to create product"));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Failed to create product");
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleStartEdit = (item: ProductRow) => {
    setErrorMessage(null);
    setEditValues({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      brand: item.brand,
      price: item.price.replace(/[^0-9.]/g, ""),
      image: item.image,
    });
    setIsEditFormOpen(true);
    setIsAddFormOpen(false);
  };

  const handleSubmitEditProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = editValues.name.trim();
    const nextCategory = editValues.category.trim();
    const nextBrand = editValues.brand.trim();

    if (!nextName || !nextCategory || !nextBrand) {
      setErrorMessage("Name, category, and brand are required for edit.");
      return;
    }

    const parsedPrice = Number.parseFloat(editValues.price.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage("Price must be a valid non-negative number.");
      return;
    }

    try {
      setIsMutating(true);
      setErrorMessage(null);

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await apiRequest<{ id: string }>(`/products/${editValues.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: nextName,
          category: nextCategory,
          brand: nextBrand,
          unitPrice: parsedPrice,
          costPrice: Number((parsedPrice * 0.62).toFixed(2)),
          description: editValues.image.trim() || `${nextCategory} product`,
        }),
      }, true);

      setIsEditFormOpen(false);
      await fetchProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(toUserFriendlyError(error.status, "Failed to update product"));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Failed to update product");
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setIsMutating(true);
      setErrorMessage(null);

      const token = getAccessToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await apiRequest<{ id: string }>(`/products/${productId}`, {
        method: "DELETE",
        headers,
      }, true);

      await fetchProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(toUserFriendlyError(error.status, "Failed to delete product"));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Failed to delete product");
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenFilterPrompt = () => {
    const nextCategory = window.prompt("Category filter (leave empty to clear)", categoryFilter);
    if (nextCategory === null) {
      return;
    }

    const nextBrand = window.prompt("Brand filter (leave empty to clear)", brandFilter);
    if (nextBrand === null) {
      return;
    }

    setPage(1);
    setCategoryFilter(nextCategory.trim());
    setBrandFilter(nextBrand.trim());
  };

  const reorderSoonCount = products.filter(
    (item) => item.reorderStatus === "Reorder Soon",
  ).length;

  return (
    <>
      <PageMeta
        title="Products | InveXa"
        description="Product planning workspace for Query-Based Demand Insights, Reorder Alerts, and Stockout Risk signals."
      />
      <PageBreadcrumb pageTitle="Products" />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total SKUs</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{products.length}</h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">High-Demand Products</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {products.filter((item) => item.demandSignal === "High Demand").length}
            </h3>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Reorder Alerts</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{reorderSoonCount}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-800/60 dark:bg-brand-500/10">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-400">Query-Based Demand Insights</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
            Query: Which products are at risk of stockout in the next 14 days based on recent sell-through?
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Result: ASUS ROG Gaming Laptop and Apple Watch Ultra should be replenished within one cycle.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Products List</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review SKUs, monitor stock health, and prioritize demand-driven replenishment.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
                <DownloadIcon className="size-4" />
                Export
              </button>
              <button
                onClick={() => {
                  setIsAddFormOpen((prev) => !prev);
                  if (!isAddFormOpen) {
                    setIsEditFormOpen(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                <PlusIcon className="size-4" />
                Add Product
              </button>
            </div>
          </div>

          {isAddFormOpen && (
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  required
                  type="text"
                  value={formValues.name}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Product name"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <input
                  required
                  type="text"
                  value={formValues.brand}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, brand: event.target.value }))
                  }
                  placeholder="Brand"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={formValues.stock}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, stock: event.target.value }))
                  }
                  placeholder="Stock"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.price}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="Price (USD)"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <select
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Wearables">Wearables</option>
                  <option value="Audio">Audio</option>
                  <option value="Components">Components</option>
                </select>
                <select
                  value={formValues.demandSignal}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      demandSignal: event.target.value as ProductRow["demandSignal"],
                    }))
                  }
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                >
                  <option value="High Demand">High Demand</option>
                  <option value="Stable">Stable</option>
                  <option value="Cooling">Cooling</option>
                </select>
                <input
                  type="text"
                  value={formValues.image}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, image: event.target.value }))
                  }
                  placeholder="Image path (optional)"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 md:col-span-2"
                />
                <div className="flex items-center gap-3 md:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    Save Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isEditFormOpen && (
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <form onSubmit={handleSubmitEditProduct} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  disabled
                  type="text"
                  value={editValues.sku}
                  placeholder="SKU"
                  className="h-11 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400"
                />
                <input
                  required
                  type="text"
                  value={editValues.name}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Product name"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <input
                  required
                  type="text"
                  value={editValues.brand}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, brand: event.target.value }))
                  }
                  placeholder="Brand"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValues.price}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="Price (USD)"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                />
                <select
                  value={editValues.category}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Office">Office</option>
                  <option value="Home">Home</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Tools">Tools</option>
                  <option value="Food">Food</option>
                  <option value="Accessories">Accessories</option>
                </select>
                <input
                  type="text"
                  value={editValues.image}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, image: event.target.value }))
                  }
                  placeholder="Image path (optional)"
                  className="h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 md:col-span-2"
                />
                <div className="flex items-center gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={isMutating}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    Update Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditFormOpen(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div className="w-full max-w-md">
              <input
                type="text"
                placeholder="Search by product, category, or brand"
                value={searchQuery}
                onChange={(event) => {
                  setPage(1);
                  setSearchQuery(event.target.value);
                }}
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
              />
            </div>
            <button
              onClick={handleOpenFilterPrompt}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Filter
            </button>
          </div>

          {errorMessage && (
            <div className="border-b border-gray-100 px-5 py-3 text-sm text-error-600 dark:border-gray-800">
              {errorMessage}
            </div>
          )}

          {(categoryFilter || brandFilter) && (
            <div className="border-b border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Active filters: category={categoryFilter || "(none)"}, brand={brandFilter || "(none)"}
            </div>
          )}

          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Products
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Category
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Brand
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Price
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Stock
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Demand Signal
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Created At
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Action
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={8}>
                      Loading products...
                    </td>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <td className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400" colSpan={8}>
                      No products found for the current query.
                    </td>
                  </TableRow>
                ) : (
                products.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-5 py-4 text-left">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.category}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.brand}</TableCell>
                    <TableCell className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{item.price}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.stock}</TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          size="sm"
                          color={
                            item.demandSignal === "High Demand"
                              ? "warning"
                              : item.demandSignal === "Stable"
                              ? "success"
                              : "info"
                          }
                        >
                          {item.demandSignal}
                        </Badge>
                        <Badge
                          size="sm"
                          color={item.reorderStatus === "Reorder Soon" ? "error" : "success"}
                        >
                          {item.reorderStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{item.createdAt}</TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700"
                          disabled={isMutating}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDeleteProduct(item.id)}
                          className="text-sm font-medium text-error-600 hover:text-error-700"
                          disabled={isMutating}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))) }
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
            <span>
              Page {page} of {totalPages} | Total {totalItems} items
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
                disabled={page <= 1 || loading}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
                disabled={page >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}