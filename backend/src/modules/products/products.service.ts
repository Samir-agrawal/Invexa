import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./products.schema";

function toMoney(value?: number) {
  if (value === undefined) return undefined;
  return value.toFixed(2);
}

function toProductResponse(product: {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  description: string | null;
  unitPrice: Prisma.Decimal;
  costPrice: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    brand: product.brand,
    description: product.description,
    unitPrice: Number(product.unitPrice),
    costPrice: product.costPrice === null ? null : Number(product.costPrice),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function handleUniqueViolation(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError("SKU already exists", 409);
  }

  throw error;
}

export async function listProducts(query: ListProductsQuery) {
  const page = query.page;
  const pageSize = query.pageSize;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (query.search) {
    where.OR = [
      { sku: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.category) {
    where.category = {
      equals: query.category,
      mode: "insensitive",
    };
  }

  if (query.brand) {
    where.brand = {
      equals: query.brand,
      mode: "insensitive",
    };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: products.map(toProductResponse),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return toProductResponse(product);
}

export async function createProduct(input: CreateProductInput) {
  try {
    const created = await prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        category: input.category,
        brand: input.brand,
        description: input.description,
        unitPrice: toMoney(input.unitPrice)!,
        costPrice: toMoney(input.costPrice),
      },
    });

    return toProductResponse(created);
  } catch (error) {
    handleUniqueViolation(error);
    throw error;
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Product not found", 404);
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku: input.sku,
        name: input.name,
        category: input.category,
        brand: input.brand,
        description: input.description,
        unitPrice: toMoney(input.unitPrice),
        costPrice: toMoney(input.costPrice),
      },
    });

    return toProductResponse(updated);
  } catch (error) {
    handleUniqueViolation(error);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Product not found", 404);
  }

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  return {
    id,
    deleted: true,
  };
}
