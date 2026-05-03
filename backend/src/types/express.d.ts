import "express-serve-static-core";

export type AuthRole = "admin" | "manager" | "viewer";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AuthRole;
  tokenVersion: number;
}

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
  }
}
