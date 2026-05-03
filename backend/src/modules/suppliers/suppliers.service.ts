import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from "./suppliers.schema";

function money(value?: number) {
  if (value === undefined) return undefined;
  return new Prisma.Decimal(value.toFixed(2));
}

function qty(value?: number) {
  if (value === undefined) return undefined;
  return new Prisma.Decimal(value.toFixed(3));
}

function numberOrNull(value?: Prisma.Decimal | null) {
  if (!value) return null;
  return Number(value.toString());
}

function normalizeSupplier(supplier: {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplierProducts?: Array<{
    id: string;
    productId: string;
    supplierSku: string | null;
    supplierUnitCost: Prisma.Decimal | null;
    leadTimeDays: number | null;
    minimumOrderQty: Prisma.Decimal | null;
    product?: { id: string; sku: string; name: string };
  }>;
}) {
  return {
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
    productMappings:
      supplier.supplierProducts?.map((mapping) => ({
        id: mapping.id,
        productId: mapping.productId,
        supplierSku: mapping.supplierSku,
        supplierUnitCost: numberOrNull(mapping.supplierUnitCost),
        leadTimeDays: mapping.leadTimeDays,
        minimumOrderQty: numberOrNull(mapping.minimumOrderQty),
        product: mapping.product,
      })) ?? [],
  };
}

async function ensureProductsExist(productIds: string[]) {
  const distinctIds = Array.from(new Set(productIds));

  if (distinctIds.length === 0) return;

  const products = await prisma.product.findMany({
    where: { id: { in: distinctIds }, deletedAt: null },
    select: { id: true },
  });

  if (products.length !== distinctIds.length) {
    throw new AppError("One or more products are invalid", 400);
  }
}

export async function listSuppliers(query: ListSuppliersQuery) {
  const where: Prisma.SupplierWhereInput = {
    deletedAt: null,
  };

  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const include = query.includeMappings
    ? {
        supplierProducts: {
          include: {
            product: {
              select: { id: true, sku: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" as const },
        },
      }
    : undefined;

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: suppliers.map((supplier) => normalizeSupplier(supplier)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function createSupplier(input: CreateSupplierInput) {
  await ensureProductsExist((input.productMappings ?? []).map((item) => item.productId));

  try {
    return await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          code: input.code,
          name: input.name,
          email: input.email,
          phone: input.phone,
        },
      });

      if (input.productMappings && input.productMappings.length > 0) {
        for (const mapping of input.productMappings) {
          await tx.supplierProduct.upsert({
            where: {
              supplierId_productId: {
                supplierId: supplier.id,
                productId: mapping.productId,
              },
            },
            create: {
              supplierId: supplier.id,
              productId: mapping.productId,
              supplierSku: mapping.supplierSku,
              supplierUnitCost: money(mapping.supplierUnitCost),
              leadTimeDays: mapping.leadTimeDays,
              minimumOrderQty: qty(mapping.minimumOrderQty),
            },
            update: {
              supplierSku: mapping.supplierSku,
              supplierUnitCost: money(mapping.supplierUnitCost),
              leadTimeDays: mapping.leadTimeDays,
              minimumOrderQty: qty(mapping.minimumOrderQty),
            },
          });
        }
      }

      const created = await tx.supplier.findUniqueOrThrow({
        where: { id: supplier.id },
        include: {
          supplierProducts: {
            include: {
              product: {
                select: { id: true, sku: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return normalizeSupplier(created);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Supplier code already exists", 409);
    }

    throw error;
  }
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
    include: {
      supplierProducts: {
        include: {
          product: {
            select: { id: true, sku: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!supplier) {
    throw new AppError("Supplier not found", 404);
  }

  return normalizeSupplier(supplier);
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  await ensureProductsExist((input.productMappings ?? []).map((item) => item.productId));

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.supplier.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      if (!existing) {
        throw new AppError("Supplier not found", 404);
      }

      await tx.supplier.update({
        where: { id },
        data: {
          code: input.code,
          name: input.name,
          email: input.email === undefined ? undefined : input.email,
          phone: input.phone === undefined ? undefined : input.phone,
        },
      });

      if (input.productMappings) {
        if (input.replaceMappings) {
          await tx.supplierProduct.deleteMany({ where: { supplierId: id } });
        }

        for (const mapping of input.productMappings) {
          await tx.supplierProduct.upsert({
            where: {
              supplierId_productId: {
                supplierId: id,
                productId: mapping.productId,
              },
            },
            create: {
              supplierId: id,
              productId: mapping.productId,
              supplierSku: mapping.supplierSku,
              supplierUnitCost: money(mapping.supplierUnitCost),
              leadTimeDays: mapping.leadTimeDays,
              minimumOrderQty: qty(mapping.minimumOrderQty),
            },
            update: {
              supplierSku: mapping.supplierSku,
              supplierUnitCost: money(mapping.supplierUnitCost),
              leadTimeDays: mapping.leadTimeDays,
              minimumOrderQty: qty(mapping.minimumOrderQty),
            },
          });
        }
      }

      const updated = await tx.supplier.findUniqueOrThrow({
        where: { id },
        include: {
          supplierProducts: {
            include: {
              product: {
                select: { id: true, sku: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return normalizeSupplier(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Supplier code already exists", 409);
    }

    throw error;
  }
}

export async function deleteSupplier(id: string) {
  const existing = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Supplier not found", 404);
  }

  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { id, deleted: true };
}
