import { Prisma, PurchaseOrderStatus, StockMovementType } from "@prisma/client";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
} from "./purchase-orders.schema";

function qty(value: number) {
  return new Prisma.Decimal(value.toFixed(3));
}

function money(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function normalizeStatus(input: string): PurchaseOrderStatus {
  if (input === "CANCELED") {
    return PurchaseOrderStatus.CANCELLED;
  }

  return input as PurchaseOrderStatus;
}

function ensureTransition(current: PurchaseOrderStatus, next: PurchaseOrderStatus) {
  if (current === next) {
    return;
  }

  if (current === PurchaseOrderStatus.RECEIVED) {
    throw new AppError("Received purchase order is immutable", 409);
  }

  if (current === PurchaseOrderStatus.CANCELLED) {
    throw new AppError("Cancelled purchase order is immutable", 409);
  }

  if (current === PurchaseOrderStatus.DRAFT) {
    if (next === PurchaseOrderStatus.APPROVED || next === PurchaseOrderStatus.CANCELLED) {
      return;
    }

    throw new AppError("Invalid status transition from DRAFT", 409);
  }

  if (current === PurchaseOrderStatus.APPROVED) {
    if (next === PurchaseOrderStatus.RECEIVED || next === PurchaseOrderStatus.CANCELLED) {
      return;
    }

    throw new AppError("Invalid status transition from APPROVED", 409);
  }

  throw new AppError("Invalid status transition", 409);
}

function normalizePurchaseOrder(po: {
  id: string;
  orderNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedAt: Date | null;
  receivedAt: Date | null;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  supplier?: { id: string; code: string; name: string };
  warehouse?: { id: string; code: string; name: string };
  createdBy?: { id: string; email: string; fullName: string } | null;
  items?: Array<{
    id: string;
    productId: string;
    quantityOrdered: Prisma.Decimal;
    quantityReceived: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    product?: { id: string; sku: string; name: string };
  }>;
}) {
  return {
    id: po.id,
    orderNumber: po.orderNumber,
    supplierId: po.supplierId,
    warehouseId: po.warehouseId,
    status: po.status,
    orderDate: po.orderDate,
    expectedAt: po.expectedAt,
    receivedAt: po.receivedAt,
    subtotal: toNumber(po.subtotal),
    taxAmount: toNumber(po.taxAmount),
    totalAmount: toNumber(po.totalAmount),
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    supplier: po.supplier,
    warehouse: po.warehouse,
    createdBy: po.createdBy,
    items:
      po.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantityOrdered: toNumber(item.quantityOrdered),
        quantityReceived: toNumber(item.quantityReceived),
        unitCost: toNumber(item.unitCost),
        lineTotal: toNumber(item.lineTotal),
        product: item.product,
      })) ?? [],
  };
}

async function generateOrderNumber(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const orderNumber = `PO-${Date.now()}-${suffix}`;

    const existing = await tx.purchaseOrder.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    if (!existing) {
      return orderNumber;
    }
  }

  throw new AppError("Unable to generate unique purchase order number", 500, false);
}

export async function listPurchaseOrders(query: ListPurchaseOrdersQuery) {
  const where: Prisma.PurchaseOrderWhereInput = {
    deletedAt: null,
  };

  if (query.supplierId) where.supplierId = query.supplierId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.status) where.status = query.status;

  const [total, rows] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((row) => normalizePurchaseOrder(row)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getPurchaseOrderById(id: string) {
  const row = await prisma.purchaseOrder.findFirst({
    where: { id, deletedAt: null },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
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
    throw new AppError("Purchase order not found", 404);
  }

  return normalizePurchaseOrder(row);
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({
      where: { id: input.supplierId, deletedAt: null },
      select: { id: true },
    });

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, deletedAt: null },
      select: { id: true },
    });

    if (!warehouse) {
      throw new AppError("Warehouse not found", 404);
    }

    const uniqueProductIds = Array.from(new Set(input.items.map((item) => item.productId)));

    if (uniqueProductIds.length !== input.items.length) {
      throw new AppError("Duplicate products in purchase order items", 400);
    }

    const products = await tx.product.findMany({
      where: { id: { in: uniqueProductIds }, deletedAt: null },
      select: { id: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new AppError("One or more products are invalid", 400);
    }

    const mappings = await tx.supplierProduct.findMany({
      where: {
        supplierId: input.supplierId,
        productId: { in: uniqueProductIds },
      },
      select: {
        productId: true,
        supplierUnitCost: true,
      },
    });

    const mappingByProductId = new Map(mappings.map((mapping) => [mapping.productId, mapping]));

    let subtotal = new Prisma.Decimal(0);

    const lineItems = input.items.map((item) => {
      const mapping = mappingByProductId.get(item.productId);
      const resolvedCost =
        item.unitCost ?? (mapping?.supplierUnitCost ? Number(mapping.supplierUnitCost.toString()) : undefined);

      if (resolvedCost === undefined) {
        throw new AppError(
          "Supplier mapping with unit cost is required for each item or provide unitCost",
          400,
        );
      }

      const quantityOrdered = qty(item.quantityOrdered);
      const unitCost = money(resolvedCost);
      const lineTotal = quantityOrdered.mul(unitCost);
      subtotal = subtotal.add(lineTotal);

      return {
        productId: item.productId,
        quantityOrdered,
        quantityReceived: new Prisma.Decimal(0),
        unitCost,
        lineTotal,
      };
    });

    const taxAmount = money(input.taxAmount);
    const totalAmount = subtotal.add(taxAmount);
    const orderNumber = await generateOrderNumber(tx);

    const created = await tx.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        status: PurchaseOrderStatus.DRAFT,
        expectedAt: input.expectedAt,
        subtotal,
        taxAmount,
        totalAmount,
        createdById: actorId,
        items: {
          create: lineItems,
        },
      },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
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

    return normalizePurchaseOrder(created);
  });
}

export async function updatePurchaseOrderStatus(id: string, rawStatus: string, actorId: string) {
  const status = normalizeStatus(rawStatus);

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!po) {
      throw new AppError("Purchase order not found", 404);
    }

    ensureTransition(po.status, status);

    if (status === PurchaseOrderStatus.RECEIVED) {
      for (const item of po.items) {
        const qtyToReceive = item.quantityOrdered.sub(item.quantityReceived);

        if (qtyToReceive.lessThanOrEqualTo(0)) {
          continue;
        }

        const existingLevel = await tx.inventoryLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: po.warehouseId,
            },
          },
        });

        if (!existingLevel) {
          await tx.inventoryLevel.create({
            data: {
              productId: item.productId,
              warehouseId: po.warehouseId,
              quantityOnHand: qtyToReceive,
              quantityReserved: new Prisma.Decimal(0),
              quantityAvailable: qtyToReceive,
            },
          });
        } else {
          await tx.inventoryLevel.update({
            where: { id: existingLevel.id },
            data: {
              quantityOnHand: existingLevel.quantityOnHand.add(qtyToReceive),
              quantityAvailable: existingLevel.quantityAvailable.add(qtyToReceive),
            },
          });
        }

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            quantityReceived: item.quantityReceived.add(qtyToReceive),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: po.warehouseId,
            movementType: StockMovementType.IN,
            quantity: qtyToReceive,
            unitCost: item.unitCost,
            referenceDocument: po.orderNumber,
            note: `PO receipt ${po.orderNumber}`,
            createdById: actorId,
          },
        });
      }
    }

    const updated = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status,
        receivedAt: status === PurchaseOrderStatus.RECEIVED ? new Date() : po.receivedAt,
      },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
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

    return normalizePurchaseOrder(updated);
  });
}
