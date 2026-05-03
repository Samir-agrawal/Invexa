import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { getHealth } from "./health.controller";

const healthRouter = Router();

healthRouter.get("/health", asyncHandler(getHealth));

export { healthRouter };
