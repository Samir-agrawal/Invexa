import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export async function getHealth(_req: Request, res: Response, _next: NextFunction) {
  void _next;

  await prisma.$queryRaw`SELECT 1`;

  return res.status(200).json({
    success: true,
    service: "backend",
    status: "ok",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
}
