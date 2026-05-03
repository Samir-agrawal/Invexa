import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate } from "./auth.middleware";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema";
import * as authService from "./auth.service";

const authRouter = Router();

authRouter.post(
  "/auth/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/auth/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/auth/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/auth/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/auth/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.post(
  "/auth/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user!.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

authRouter.get(
  "/auth/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.me(req.user!.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }),
);

export { authRouter };
