import { StockMovementType } from "@prisma/client";
import { z } from "zod";

export const listLevelsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    warehouseId: z.string().cuid().optional(),
    productId: z.string().cuid().optional(),
  }),
});

export const adjustInventorySchema = z.object({
  body: z.object({
    productId: z.string().cuid(),
    warehouseId: z.string().cuid(),
    operation: z.enum(["IN", "OUT"]),
    quantity: z.coerce.number().positive(),
    reason: z.string().trim().min(3).max(240),
    unitCost: z.coerce.number().nonnegative().optional(),
    referenceDocument: z.string().trim().max(120).optional(),
  }),
});

export const transferInventorySchema = z.object({
  body: z
    .object({
      productId: z.string().cuid(),
      fromWarehouseId: z.string().cuid(),
      toWarehouseId: z.string().cuid(),
      quantity: z.coerce.number().positive(),
      reason: z.string().trim().min(3).max(240),
      unitCost: z.coerce.number().nonnegative().optional(),
      referenceDocument: z.string().trim().max(120).optional(),
    })
    .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
      message: "Source and destination warehouses must be different",
      path: ["toWarehouseId"],
    }),
});

export const listMovementsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    warehouseId: z.string().cuid().optional(),
    productId: z.string().cuid().optional(),
    movementType: z.nativeEnum(StockMovementType).optional(),
  }),
});

export type ListLevelsQuery = z.infer<typeof listLevelsSchema>["query"];
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>["body"];
export type TransferInventoryInput = z.infer<typeof transferInventorySchema>["body"];
export type ListMovementsQuery = z.infer<typeof listMovementsSchema>["query"];
