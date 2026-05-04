import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(25),
  OPENAPI_ENABLED: z.enum(["true", "false"]).default("true"),
  APP_BASE_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required"),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  TRUST_PROXY: parsed.TRUST_PROXY === "true",
  OPENAPI_ENABLED: parsed.OPENAPI_ENABLED === "true",
  CORS_ORIGINS: parsed.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  JWT_ACCESS_SECRET: parsed.JWT_ACCESS_SECRET ?? parsed.JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN: parsed.JWT_ACCESS_EXPIRES_IN ?? parsed.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: parsed.JWT_REFRESH_SECRET ?? parsed.JWT_SECRET,
  JWT_REFRESH_EXPIRES_IN: parsed.JWT_REFRESH_EXPIRES_IN ?? "7d",
};
