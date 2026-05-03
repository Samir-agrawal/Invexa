import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate, authorizeRoles } from "../auth/auth.middleware";
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersSchema,
  ListPurchaseOrdersQuery,
  purchaseOrderIdSchema,
  updatePurchaseOrderStatusSchema,
} from "./purchase-orders.schema";
import * as purchaseOrdersService from "./purchase-orders.service";

const purchaseOrdersRouter = Router();

purchaseOrdersRouter.get(
  "/purchase-orders",
  authenticate,
  validate(listPurchaseOrdersSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListPurchaseOrdersQuery;
    const result = await purchaseOrdersService.listPurchaseOrders(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

purchaseOrdersRouter.get(
  "/purchase-orders/:id",
  authenticate,
  validate(purchaseOrderIdSchema),
  asyncHandler(async (req, res) => {
    const result = await purchaseOrdersService.getPurchaseOrderById(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

purchaseOrdersRouter.post(
  "/purchase-orders",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(createPurchaseOrderSchema),
  asyncHandler(async (req, res) => {
    const result = await purchaseOrdersService.createPurchaseOrder(req.body, req.user!.id);

    return res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

purchaseOrdersRouter.put(
  "/purchase-orders/:id/status",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(updatePurchaseOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const result = await purchaseOrdersService.updatePurchaseOrderStatus(
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

export { purchaseOrdersRouter };
