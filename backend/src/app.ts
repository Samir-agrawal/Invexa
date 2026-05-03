import cors from "cors";
import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { openApiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { echoRouter } from "./modules/echo/echo.routes";
import { healthRouter } from "./modules/health/health.routes";
import { inventoryRouter } from "./modules/inventory/inventory.routes";
import { purchaseOrdersRouter } from "./modules/purchase-orders/purchase-orders.routes";
import { productsRouter } from "./modules/products/products.routes";
import { salesOrdersRouter } from "./modules/sales-orders/sales-orders.routes";
import { suppliersRouter } from "./modules/suppliers/suppliers.routes";
import swaggerUi from "swagger-ui-express";

export const app = express();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

const allowedOrigins = new Set(env.CORS_ORIGINS);

const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again shortly.",
  },
});

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again shortly.",
  },
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  req.requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
  next();
});
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.requestId ?? randomUUID(),
    customProps: (req) => ({ requestId: req.requestId }),
  }),
);

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

app.use("/api", healthRouter);
app.use("/api", echoRouter);
app.use("/api", authRouter);
app.use("/api", analyticsRouter);
app.use("/api", inventoryRouter);
app.use("/api", productsRouter);
app.use("/api", suppliersRouter);
app.use("/api", purchaseOrdersRouter);
app.use("/api", salesOrdersRouter);

if (env.OPENAPI_ENABLED) {
  app.get("/api/openapi.json", (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend foundation is running",
  });
});

app.use(notFoundHandler);
app.use(errorHandler);
