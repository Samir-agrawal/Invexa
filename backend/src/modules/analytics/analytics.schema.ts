import { z } from "zod";

const queryBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

export const reorderSoonSchema = z.object({
  query: z.object({
    lookbackDays: z.coerce.number().int().min(1).max(365).default(30),
    limit: z.coerce.number().int().min(1).max(200).default(20),
  }),
});

export const analyticsSummarySchema = z.object({
  query: z.object({}),
});

export const monthlySalesSchema = z.object({
  query: z.object({
    months: z.coerce.number().int().min(3).max(24).default(12),
  }),
});

export const recentOrdersSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const stockRiskSchema = z.object({
  query: z.object({
    lookbackDays: z.coerce.number().int().min(1).max(365).default(30),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    triggeredOnly: queryBoolean.default(false),
  }),
});

export type ReorderSoonQuery = z.infer<typeof reorderSoonSchema>["query"];
export type MonthlySalesQuery = z.infer<typeof monthlySalesSchema>["query"];
export type RecentOrdersQuery = z.infer<typeof recentOrdersSchema>["query"];
export type StockRiskQuery = z.infer<typeof stockRiskSchema>["query"];
