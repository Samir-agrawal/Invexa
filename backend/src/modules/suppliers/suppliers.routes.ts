import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate, authorizeRoles } from "../auth/auth.middleware";
import {
  createSupplierSchema,
  listSuppliersSchema,
  ListSuppliersQuery,
  supplierIdSchema,
  updateSupplierSchema,
} from "./suppliers.schema";
import * as suppliersService from "./suppliers.service";

const suppliersRouter = Router();

suppliersRouter.get(
  "/suppliers",
  authenticate,
  validate(listSuppliersSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListSuppliersQuery;
    const result = await suppliersService.listSuppliers(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

suppliersRouter.get(
  "/suppliers/:id",
  authenticate,
  validate(supplierIdSchema),
  asyncHandler(async (req, res) => {
    const result = await suppliersService.getSupplierById(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

suppliersRouter.post(
  "/suppliers",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(createSupplierSchema),
  asyncHandler(async (req, res) => {
    const result = await suppliersService.createSupplier(req.body);

    return res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

suppliersRouter.put(
  "/suppliers/:id",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(updateSupplierSchema),
  asyncHandler(async (req, res) => {
    const result = await suppliersService.updateSupplier(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

suppliersRouter.delete(
  "/suppliers/:id",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(supplierIdSchema),
  asyncHandler(async (req, res) => {
    const result = await suppliersService.deleteSupplier(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

export { suppliersRouter };
