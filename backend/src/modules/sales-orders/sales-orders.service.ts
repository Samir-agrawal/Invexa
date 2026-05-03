import { Prisma, SalesOrderStatus, StockMovementType } from "@prisma/client";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import { CreateSalesOrderInput, ListSalesOrdersQuery } from "./sales-orders.schema";

function qty(value: number) {
  return new Prisma.Decimal(value.toFixed(3));
}

function money(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function normalizeSalesOrder(row: {
  id: string;
  orderNumber: string;
  warehouseId: string;
  status: SalesOrderStatus;
  customerName: string | null;
  orderDate: Date;
  fulfilledAt: Date | null;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  warehouse?: { id: string; code: string; name: string };
  createdBy?: { id: string; email: string; fullName: string } | null;
  items?: Array<{
    id: string;
    productId: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    product?: { id: string; sku: string; name: string };
  }>;
}) {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    warehouseId: row.warehouseId,
    status: row.status,
    customerName: row.customerName,
    orderDate: row.orderDate,
    fulfilledAt: row.fulfilledAt,
    subtotal: toNumber(row.subtotal),
    taxAmount: toNumber(row.taxAmount),
    totalAmount: toNumber(row.totalAmount),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    warehouse: row.warehouse,
    createdBy: row.createdBy,
    items:
      row.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        lineTotal: toNumber(item.lineTotal),
        product: item.product,
      })) ?? [],
  };
}

async function generateOrderNumber(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const orderNumber = `SO-${Date.now()}-${suffix}`;

    const existing = await tx.salesOrder.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    if (!existing) {
      return orderNumber;
    }
  }

  throw new AppError("Unable to generate unique sales order number", 500, false);
}

function canMutateTo(current: SalesOrderStatus, next: SalesOrderStatus) {
  if (current === next) return true;

  if (current === SalesOrderStatus.CANCELLED || current === SalesOrderStatus.FULFILLED) {
    return false;
  }

  if (current === SalesOrderStatus.DRAFT) {
    return next === SalesOrderStatus.CONFIRMED || next === SalesOrderStatus.CANCELLED;
  }

  if (current === SalesOrderStatus.CONFIRMED) {
    return next === SalesOrderStatus.FULFILLED || next === SalesOrderStatus.CANCELLED;
  }

  return false;
}

function statusRequiresDeduction(status: SalesOrderStatus) {
  return status === SalesOrderStatus.CONFIRMED || status === SalesOrderStatus.FULFILLED;
}

async function deductInventoryForOrder(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    warehouseId: string;
    status: SalesOrderStatus;
    items: Array<{ id: string; productId: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal }>;
  },
  actorId: string,
) {
  for (const item of order.items) {
    const level = await tx.inventoryLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: item.productId,
          warehouseId: order.warehouseId,
        },
      },
    });

    if (!level) {
      throw new AppError("Insufficient stock for one or more order items", 409);
    }

    const nextOnHand = level.quantityOnHand.sub(item.quantity);
    const nextAvailable = level.quantityAvailable.sub(item.quantity);

    if (nextOnHand.lessThan(0) || nextAvailable.lessThan(0)) {
      throw new AppError("Insufficient stock for one or more order items", 409);
    }

    await tx.inventoryLevel.update({
      where: { id: level.id },
      data: {
        quantityOnHand: nextOnHand,
        quantityAvailable: nextAvailable,
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        warehouseId: order.warehouseId,
        movementType: StockMovementType.OUT,
        quantity: item.quantity,
        unitCost: item.unitPrice,
        referenceDocument: order.orderNumber,
        note: `SO deduction ${order.orderNumber}`,
        createdById: actorId,
      },
    });
  }
}

export async function listSalesOrders(query: ListSalesOrdersQuery) {
  const where: Prisma.SalesOrderWhereInput = {
    deletedAt: null,
  };

  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.status) where.status = query.status;

  const [total, rows] = await Promise.all([
    prisma.salesOrder.count({ where }),
    prisma.salesOrder.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((row) => normalizeSalesOrder(row)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getSalesOrderById(id: string) {
  const row = await prisma.salesOrder.findFirst({
    where: { id, deletedAt: null },
    include: {
      warehouse: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, email: true, fullName: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!row) {
    throw new AppError("Sales order not found", 404);
  }

  return normalizeSalesOrder(row);
}

export async function createSalesOrder(input: CreateSalesOrderInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, deletedAt: null },
      select: { id: true },
    });

    if (!warehouse) {
      throw new AppError("Warehouse not found", 404);
    }

    const uniqueProductIds = Array.from(new Set(input.items.map((item) => item.productId)));

    if (uniqueProductIds.length !== input.items.length) {
      throw new AppError("Duplicate products in sales order items", 400);
    }

    const products = await tx.product.findMany({
      where: { id: { in: uniqueProductIds }, deletedAt: null },
      select: { id: true, unitPrice: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new AppError("One or more products are invalid", 400);
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    let subtotal = new Prisma.Decimal(0);

    const lineItems = input.items.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new AppError("One or more products are invalid", 400);
      }

      const quantity = qty(item.quantity);
      const unitPrice = money(item.unitPrice ?? Number(product.unitPrice.toString()));
      const lineTotal = quantity.mul(unitPrice);
      subtotal = subtotal.add(lineTotal);

      return {
        productId: item.productId,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const taxAmount = money(input.taxAmount);
    const totalAmount = subtotal.add(taxAmount);
    const orderNumber = await generateOrderNumber(tx);

    const created = await tx.salesOrder.create({
      data: {
        orderNumber,
        warehouseId: input.warehouseId,
        status: SalesOrderStatus.DRAFT,
        customerName: input.customerName,
        subtotal,
        taxAmount,
        totalAmount,
        createdById: actorId,
        items: {
          create: lineItems,
        },
      },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return normalizeSalesOrder(created);
  });
}

export async function updateSalesOrderStatus(id: string, nextStatus: SalesOrderStatus, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) {
      throw new AppError("Sales order not found", 404);
    }

    if (!canMutateTo(order.status, nextStatus)) {
      throw new AppError(`Invalid status transition from ${order.status}`, 409);
    }

    if (
      order.status === SalesOrderStatus.DRAFT &&
      statusRequiresDeduction(nextStatus)
    ) {
      await deductInventoryForOrder(tx, order, actorId);
    }

    const updated = await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        fulfilledAt: nextStatus === SalesOrderStatus.FULFILLED ? new Date() : order.fulfilledAt,
      },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return normalizeSalesOrder(updated);
  });
}
