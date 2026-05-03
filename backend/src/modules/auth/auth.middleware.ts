import { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/app-error";
import { AuthRole } from "../../types/express";
import { decodeAccessToken } from "./auth.service";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const payload = decodeAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    tokenVersion: 0,
  };

  next();
}

export function authorizeRoles(allowedRoles: AuthRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("Forbidden", 403);
    }

    next();
  };
}
