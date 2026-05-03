import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate, authorizeRoles } from "../auth/auth.middleware";
import {
  adjustInventorySchema,
  listLevelsSchema,
  listMovementsSchema,
  ListLevelsQuery,
  ListMovementsQuery,
  transferInventorySchema,
} from "./inventory.schema";
import * as inventoryService from "./inventory.service";

const inventoryRouter = Router();

inventoryRouter.get(
  "/inventory/levels",
  authenticate,
  validate(listLevelsSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListLevelsQuery;
    const result = await inventoryService.listLevels(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

inventoryRouter.post(
  "/inventory/adjust",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(adjustInventorySchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.adjustInventory(req.body, req.user!.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

inventoryRouter.post(
  "/inventory/transfer",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(transferInventorySchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.transferInventory(req.body, req.user!.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

inventoryRouter.get(
  "/inventory/movements",
  authenticate,
  validate(listMovementsSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListMovementsQuery;
    const result = await inventoryService.listMovements(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

export { inventoryRouter };
