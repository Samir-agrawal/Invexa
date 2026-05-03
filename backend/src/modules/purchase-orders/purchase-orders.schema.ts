import { PurchaseOrderStatus } from "@prisma/client";
import { z } from "zod";

const createPurchaseOrderItemSchema = z.object({
  productId: z.string().cuid(),
  quantityOrdered: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().optional(),
});

export const listPurchaseOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    supplierId: z.string().cuid().optional(),
    warehouseId: z.string().cuid().optional(),
    status: z.nativeEnum(PurchaseOrderStatus).optional(),
  }),
});

export const purchaseOrderIdSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().cuid(),
    warehouseId: z.string().cuid(),
    expectedAt: z.coerce.date().optional(),
    taxAmount: z.coerce.number().nonnegative().default(0),
    items: z.array(createPurchaseOrderItemSchema).min(1).max(200),
  }),
});

export const updatePurchaseOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    status: z.enum(["DRAFT", "APPROVED", "RECEIVED", "CANCELLED", "CANCELED"]),
  }),
});

export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersSchema>["query"];
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>["body"];
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>["body"];
