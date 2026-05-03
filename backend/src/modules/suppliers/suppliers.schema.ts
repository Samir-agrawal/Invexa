import { z } from "zod";

const mappingSchema = z.object({
  productId: z.string().cuid(),
  supplierSku: z.string().trim().max(120).optional(),
  supplierUnitCost: z.coerce.number().nonnegative().optional(),
  leadTimeDays: z.coerce.number().int().positive().max(365).optional(),
  minimumOrderQty: z.coerce.number().positive().optional(),
});

export const listSuppliersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    includeMappings: z.coerce.boolean().default(true),
  }),
});

export const supplierIdSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const createSupplierSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(40),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    productMappings: z.array(mappingSchema).max(200).optional(),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    code: z.string().trim().min(2).max(40).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(120).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    replaceMappings: z.coerce.boolean().default(false),
    productMappings: z.array(mappingSchema).max(200).optional(),
  }),
});

export type ListSuppliersQuery = z.infer<typeof listSuppliersSchema>["query"];
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>["body"];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>["body"];
