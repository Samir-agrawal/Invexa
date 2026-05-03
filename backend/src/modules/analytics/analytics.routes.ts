import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate } from "../auth/auth.middleware";
import {
  analyticsSummarySchema,
  monthlySalesSchema,
  MonthlySalesQuery,
  recentOrdersSchema,
  RecentOrdersQuery,
  reorderSoonSchema,
  ReorderSoonQuery,
  stockRiskSchema,
  StockRiskQuery,
} from "./analytics.schema";
import * as analyticsService from "./analytics.service";

const analyticsRouter = Router();

analyticsRouter.get(
  "/alerts/reorder-soon",
  authenticate,
  validate(reorderSoonSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ReorderSoonQuery;
    const result = await analyticsService.getReorderSoon(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

analyticsRouter.get(
  "/analytics/summary",
  authenticate,
  validate(analyticsSummarySchema),
  asyncHandler(async (_req, res) => {
    const result = await analyticsService.getSummary();

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

analyticsRouter.get(
  "/analytics/monthly-sales",
  authenticate,
  validate(monthlySalesSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as MonthlySalesQuery;
    const result = await analyticsService.getMonthlySales(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

analyticsRouter.get(
  "/analytics/recent-orders",
  authenticate,
  validate(recentOrdersSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as RecentOrdersQuery;
    const result = await analyticsService.getRecentOrders(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

analyticsRouter.get(
  "/analytics/stock-risk",
  authenticate,
  validate(stockRiskSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as StockRiskQuery;
    const result = await analyticsService.getStockRisk(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

export { analyticsRouter };
