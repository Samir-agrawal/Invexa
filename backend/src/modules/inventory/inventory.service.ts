import { Prisma, StockMovementType } from "@prisma/client";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import {
  AdjustInventoryInput,
  ListLevelsQuery,
  ListMovementsQuery,
  TransferInventoryInput,
} from "./inventory.schema";

function decimalQty(value: number) {
  return new Prisma.Decimal(value.toFixed(3));
}

function decimalMoney(value?: number) {
  if (value === undefined) return undefined;
  return new Prisma.Decimal(value.toFixed(2));
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function ensureNonNegativeOrThrow(nextOnHand: Prisma.Decimal) {
  if (nextOnHand.lessThan(0)) {
    throw new AppError("Insufficient stock for this operation", 409);
  }
}

function buildLevelResponse(level: {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: Prisma.Decimal;
  quantityReserved: Prisma.Decimal;
  quantityAvailable: Prisma.Decimal;
  updatedAt: Date;
  product?: { id: string; sku: string; name: string };
  warehouse?: { id: string; code: string; name: string };
}) {
  return {
    id: level.id,
    productId: level.productId,
    warehouseId: level.warehouseId,
    quantityOnHand: toNumber(level.quantityOnHand),
    quantityReserved: toNumber(level.quantityReserved),
    quantityAvailable: toNumber(level.quantityAvailable),
    updatedAt: level.updatedAt,
    product: level.product,
    warehouse: level.warehouse,
  };
}

export async function listLevels(query: ListLevelsQuery) {
  const where: Prisma.InventoryLevelWhereInput = {};

  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.productId) where.productId = query.productId;

  const [total, levels] = await Promise.all([
    prisma.inventoryLevel.count({ where }),
    prisma.inventoryLevel.findMany({
      where,
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
        warehouse: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: levels.map(buildLevelResponse),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function adjustInventory(input: AdjustInventoryInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, deletedAt: null },
      select: { id: true },
    });

    if (!product) throw new AppError("Product not found", 404);

    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, deletedAt: null },
      select: { id: true },
    });

    if (!warehouse) throw new AppError("Warehouse not found", 404);

    const qty = decimalQty(input.quantity);
    const sign = input.operation === "IN" ? 1 : -1;

    let level = await tx.inventoryLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: input.productId,
          warehouseId: input.warehouseId,
        },
      },
    });

    if (!level) {
      if (input.operation === "OUT") {
        throw new AppError("Insufficient stock for this operation", 409);
      }

      level = await tx.inventoryLevel.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantityOnHand: "0.000",
          quantityReserved: "0.000",
          quantityAvailable: "0.000",
        },
      });
    }

    const nextOnHand = sign === 1 ? level.quantityOnHand.add(qty) : level.quantityOnHand.sub(qty);
    ensureNonNegativeOrThrow(nextOnHand);

    const nextAvailable = nextOnHand.sub(level.quantityReserved);
    ensureNonNegativeOrThrow(nextAvailable);

    const updatedLevel = await tx.inventoryLevel.update({
      where: { id: level.id },
      data: {
        quantityOnHand: nextOnHand,
        quantityAvailable: nextAvailable,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    const movementType = input.operation === "IN" ? StockMovementType.IN : StockMovementType.OUT;

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType,
        quantity: qty,
        unitCost: decimalMoney(input.unitCost),
        referenceDocument: input.referenceDocument,
        note: input.reason,
        createdById: actorId,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });

    return {
      level: buildLevelResponse(updatedLevel),
      movement: {
        id: movement.id,
        movementType: movement.movementType,
        quantity: toNumber(movement.quantity),
        unitCost: movement.unitCost ? toNumber(movement.unitCost) : null,
        reason: movement.note,
        referenceDocument: movement.referenceDocument,
        createdAt: movement.createdAt,
        actor: movement.createdBy,
        product: movement.product,
        warehouse: movement.warehouse,
      },
    };
  });
}

export async function transferInventory(input: TransferInventoryInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, deletedAt: null },
      select: { id: true },
    });

    if (!product) throw new AppError("Product not found", 404);

    const [fromWarehouse, toWarehouse] = await Promise.all([
      tx.warehouse.findFirst({
        where: { id: input.fromWarehouseId, deletedAt: null },
        select: { id: true, code: true, name: true },
      }),
      tx.warehouse.findFirst({
        where: { id: input.toWarehouseId, deletedAt: null },
        select: { id: true, code: true, name: true },
      }),
    ]);

    if (!fromWarehouse || !toWarehouse) {
      throw new AppError("Warehouse not found", 404);
    }

    const qty = decimalQty(input.quantity);

    const fromLevel = await tx.inventoryLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: input.productId,
          warehouseId: input.fromWarehouseId,
        },
      },
    });

    if (!fromLevel) {
      throw new AppError("Insufficient stock for transfer", 409);
    }

    const nextFromOnHand = fromLevel.quantityOnHand.sub(qty);
    ensureNonNegativeOrThrow(nextFromOnHand);

    const nextFromAvailable = nextFromOnHand.sub(fromLevel.quantityReserved);
    ensureNonNegativeOrThrow(nextFromAvailable);

    const updatedFromLevel = await tx.inventoryLevel.update({
      where: { id: fromLevel.id },
      data: {
        quantityOnHand: nextFromOnHand,
        quantityAvailable: nextFromAvailable,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    let toLevel = await tx.inventoryLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: input.productId,
          warehouseId: input.toWarehouseId,
        },
      },
    });

    if (!toLevel) {
      toLevel = await tx.inventoryLevel.create({
        data: {
          productId: input.productId,
          warehouseId: input.toWarehouseId,
          quantityOnHand: "0.000",
          quantityReserved: "0.000",
          quantityAvailable: "0.000",
        },
      });
    }

    const nextToOnHand = toLevel.quantityOnHand.add(qty);
    const nextToAvailable = nextToOnHand.sub(toLevel.quantityReserved);

    const updatedToLevel = await tx.inventoryLevel.update({
      where: { id: toLevel.id },
      data: {
        quantityOnHand: nextToOnHand,
        quantityAvailable: nextToAvailable,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    const commonMovementData = {
      productId: input.productId,
      quantity: qty,
      unitCost: decimalMoney(input.unitCost),
      referenceDocument: input.referenceDocument,
      note: input.reason,
      createdById: actorId,
    };

    const transferOutMovement = await tx.stockMovement.create({
      data: {
        ...commonMovementData,
        warehouseId: input.fromWarehouseId,
        movementType: StockMovementType.TRANSFER_OUT,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });

    const transferInMovement = await tx.stockMovement.create({
      data: {
        ...commonMovementData,
        warehouseId: input.toWarehouseId,
        movementType: StockMovementType.TRANSFER_IN,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
    });

    return {
      fromLevel: buildLevelResponse(updatedFromLevel),
      toLevel: buildLevelResponse(updatedToLevel),
      movements: [
        {
          id: transferOutMovement.id,
          movementType: transferOutMovement.movementType,
          quantity: toNumber(transferOutMovement.quantity),
          unitCost: transferOutMovement.unitCost ? toNumber(transferOutMovement.unitCost) : null,
          reason: transferOutMovement.note,
          referenceDocument: transferOutMovement.referenceDocument,
          createdAt: transferOutMovement.createdAt,
          actor: transferOutMovement.createdBy,
          product: transferOutMovement.product,
          warehouse: transferOutMovement.warehouse,
        },
        {
          id: transferInMovement.id,
          movementType: transferInMovement.movementType,
          quantity: toNumber(transferInMovement.quantity),
          unitCost: transferInMovement.unitCost ? toNumber(transferInMovement.unitCost) : null,
          reason: transferInMovement.note,
          referenceDocument: transferInMovement.referenceDocument,
          createdAt: transferInMovement.createdAt,
          actor: transferInMovement.createdBy,
          product: transferInMovement.product,
          warehouse: transferInMovement.warehouse,
        },
      ],
    };
  });
}

export async function listMovements(query: ListMovementsQuery) {
  const where: Prisma.StockMovementWhereInput = {};

  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.productId) where.productId = query.productId;
  if (query.movementType) where.movementType = query.movementType;

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantity: toNumber(movement.quantity),
      unitCost: movement.unitCost ? toNumber(movement.unitCost) : null,
      reason: movement.note,
      referenceDocument: movement.referenceDocument,
      createdAt: movement.createdAt,
      actor: movement.createdBy,
      product: movement.product,
      warehouse: movement.warehouse,
    })),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
