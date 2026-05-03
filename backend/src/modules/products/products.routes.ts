import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate, authorizeRoles } from "../auth/auth.middleware";
import {
  createProductSchema,
  ListProductsQuery,
  listProductsSchema,
  productIdSchema,
  updateProductSchema,
} from "./products.schema";
import * as productService from "./products.service";

const productsRouter = Router();

productsRouter.get(
  "/products",
  validate(listProductsSchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListProductsQuery;
    const result = await productService.listProducts(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  }),
);

productsRouter.get(
  "/products/:id",
  validate(productIdSchema),
  asyncHandler(async (req, res) => {
    const result = await productService.getProductById(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

productsRouter.post(
  "/products",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const result = await productService.createProduct(req.body);

    return res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

productsRouter.put(
  "/products/:id",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    const result = await productService.updateProduct(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

productsRouter.delete(
  "/products/:id",
  authenticate,
  authorizeRoles(["admin", "manager"]),
  validate(productIdSchema),
  asyncHandler(async (req, res) => {
    const result = await productService.deleteProduct(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

export { productsRouter };
