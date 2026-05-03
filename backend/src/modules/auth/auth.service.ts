import { UserRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import { AuthRole } from "../../types/express";
import {
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schema";

type AccessTokenPayload = {
  sub: string;
  email: string;
  role: AuthRole;
};

type RefreshTokenPayload = {
  sub: string;
  tokenVersion: number;
};

type PasswordResetTokenPayload = {
  sub: string;
  purpose: "password_reset";
};

const ACCESS_EXPIRES_IN = env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"];
const PASSWORD_RESET_EXPIRES_IN: SignOptions["expiresIn"] = "15m";

function toAuthRole(role: UserRole): AuthRole {
  if (role === "ADMIN") return "admin";
  if (role === "MANAGER") return "manager";
  return "viewer";
}

function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
}

function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

function parseRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

    if (!decoded?.sub || typeof decoded.sub !== "string") {
      throw new AppError("Unauthorized", 401);
    }

    if (typeof decoded.tokenVersion !== "number") {
      throw new AppError("Unauthorized", 401);
    }

    return {
      sub: decoded.sub,
      tokenVersion: decoded.tokenVersion,
    };
  } catch {
    throw new AppError("Unauthorized", 401);
  }
}

function signPasswordResetToken(payload: PasswordResetTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: PASSWORD_RESET_EXPIRES_IN,
  });
}

function parsePasswordResetToken(token: string): PasswordResetTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (!decoded?.sub || typeof decoded.sub !== "string") {
      throw new AppError("Invalid or expired reset token", 400);
    }

    if (decoded.purpose !== "password_reset") {
      throw new AppError("Invalid or expired reset token", 400);
    }

    return {
      sub: decoded.sub,
      purpose: "password_reset",
    };
  } catch {
    throw new AppError("Invalid or expired reset token", 400);
  }
}

function buildAppUrl(path: string): string {
  const baseUrl = env.APP_BASE_URL || "http://localhost:5173";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (exists) {
    throw new AppError("Account already exists", 409);
  }

  const passwordHash = await hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      role: UserRole.STAFF,
      passwordChangedAt: new Date(),
      refreshTokenVersion: 0,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      refreshTokenVersion: true,
    },
  });

  const role = toAuthRole(user.role);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role });
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      deletedAt: true,
      passwordHash: true,
      refreshTokenVersion: true,
    },
  });

  const invalidCredentials = new AppError("Invalid credentials", 401);

  if (!user || !user.passwordHash || !user.isActive || user.deletedAt) {
    throw invalidCredentials;
  }

  const isValidPassword = await compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw invalidCredentials;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const role = toAuthRole(user.role);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role });
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(input: RefreshInput) {
  const parsed = parseRefreshToken(input.refreshToken);

  const user = await prisma.user.findUnique({
    where: { id: parsed.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      deletedAt: true,
      refreshTokenVersion: true,
    },
  });

  if (
    !user ||
    !user.isActive ||
    user.deletedAt ||
    user.refreshTokenVersion !== parsed.tokenVersion
  ) {
    throw new AppError("Unauthorized", 401);
  }

  const role = toAuthRole(user.role);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role });
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
    },
    accessToken,
    refreshToken,
  };
}

export async function logout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshTokenVersion: { increment: 1 },
    },
  });

  return { success: true };
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      isActive: true,
      deletedAt: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash || !user.isActive || user.deletedAt) {
    return { sent: true };
  }

  const resetToken = signPasswordResetToken({
    sub: user.id,
    purpose: "password_reset",
  });

  const resetUrl = buildAppUrl(`/reset-password?token=${encodeURIComponent(resetToken)}`);

  // Email transport is not configured in this project yet, so log the reset URL for dev/test.
  logger.info({ email: user.email, resetUrl }, "Password reset link generated");

  if (env.NODE_ENV !== "production") {
    return {
      sent: true,
      debugResetUrl: resetUrl,
      message: "No mail transport configured. Use debugResetUrl in development.",
    };
  }

  return { sent: true };
}

export async function resetPassword(input: ResetPasswordInput) {
  const parsed = parsePasswordResetToken(input.token);
  const user = await prisma.user.findUnique({
    where: { id: parsed.sub },
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const passwordHash = await hash(input.password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      refreshTokenVersion: { increment: 1 },
    },
  });

  return { success: true };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError("Unauthorized", 401);
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: toAuthRole(user.role),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function decodeAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (
      !decoded?.sub ||
      typeof decoded.sub !== "string" ||
      !decoded.email ||
      typeof decoded.email !== "string" ||
      !decoded.role ||
      (decoded.role !== "admin" && decoded.role !== "manager" && decoded.role !== "viewer")
    ) {
      throw new AppError("Unauthorized", 401);
    }

    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    throw new AppError("Unauthorized", 401);
  }
}
