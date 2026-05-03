import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate, authorizeRoles } from "../auth/auth.middleware";
import {
  createSalesOrderSchema,
  listSalesOrdersSchema,
  ListSalesOrdersQuery,
  salesOrderIdSchema,
  updateSalesOrderStatusSchema,
} from "./sales-orders.schema";
import * as salesOrdersService from "./sales-orders.service";

const salesOrdersRouter = Router();

salesOrdersRouter.get(
  "/sales-orders",
  authenticate,
  validate(listSalesOrdersSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListSalesOrdersQuery;
    const result = await salesOrdersService.listSalesOrders(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

salesOrdersRouter.get(
  "/sales-orders/:id",
  authenticate,
  validate(salesOrderIdSchema),
  asyncHandler(async (req, res) => {
    const result = await salesOrdersService.getSalesOrderById(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

salesOrdersRouter.post(
  "/sales-orders",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(createSalesOrderSchema),
  asyncHandler(async (req, res) => {
    const result = await salesOrdersService.createSalesOrder(req.body, req.user!.id);

    return res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

salesOrdersRouter.put(
  "/sales-orders/:id/status",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(updateSalesOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const result = await salesOrdersService.updateSalesOrderStatus(
      req.params.id,
      req.body.status,
      req.user!.id,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

export { salesOrdersRouter };
