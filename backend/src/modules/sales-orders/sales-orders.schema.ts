import { SalesOrderStatus } from "@prisma/client";
import { z } from "zod";

const createSalesOrderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
});

export const listSalesOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    warehouseId: z.string().cuid().optional(),
    status: z.nativeEnum(SalesOrderStatus).optional(),
  }),
});

export const salesOrderIdSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const createSalesOrderSchema = z.object({
  body: z.object({
    warehouseId: z.string().cuid(),
    customerName: z.string().trim().min(2).max(120).optional(),
    taxAmount: z.coerce.number().nonnegative().default(0),
    items: z.array(createSalesOrderItemSchema).min(1).max(200),
  }),
});

export const updateSalesOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    status: z.nativeEnum(SalesOrderStatus),
  }),
});

export type ListSalesOrdersQuery = z.infer<typeof listSalesOrdersSchema>["query"];
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>["body"];
