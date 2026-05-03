import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { AppError } from "../errors/app-error";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  void next;

  if (err instanceof Error && err.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed by CORS policy",
    });
  }

  if (err instanceof ZodError) {
    logger.warn(
      {
        reqId: req.requestId,
        method: req.method,
        path: req.path,
        issues: err.issues,
      },
      "Validation error",
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      issues: err.issues,
    });
  }

  if (err instanceof AppError) {
    logger.warn(
      {
        reqId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: err.statusCode,
        expose: err.expose,
        message: err.message,
      },
      "Application error",
    );

    return res.status(err.statusCode).json({
      success: false,
      message: err.expose ? err.message : "Request failed",
    });
  }

  logger.error(
    {
      reqId: req.requestId,
      method: req.method,
      path: req.path,
      err,
    },
    "Unhandled error",
  );

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
