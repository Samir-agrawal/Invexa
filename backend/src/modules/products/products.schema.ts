import { z } from "zod";

export const listProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    brand: z.string().trim().optional(),
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid product id"),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(3).max(64),
    name: z.string().trim().min(2).max(160),
    category: z.string().trim().max(120).optional(),
    brand: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional(),
    unitPrice: z.coerce.number().nonnegative(),
    costPrice: z.coerce.number().nonnegative().optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid product id"),
  }),
  body: z
    .object({
      sku: z.string().trim().min(3).max(64).optional(),
      name: z.string().trim().min(2).max(160).optional(),
      category: z.string().trim().max(120).optional(),
      brand: z.string().trim().max(120).optional(),
      description: z.string().trim().max(500).optional(),
      unitPrice: z.coerce.number().nonnegative().optional(),
      costPrice: z.coerce.number().nonnegative().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>["query"];
export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];
