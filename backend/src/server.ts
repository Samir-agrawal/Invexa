import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./lib/prisma";

async function startupChecks() {
  await prisma.$queryRaw`SELECT 1`;
}

async function bootstrap() {
  try {
    await startupChecks();

    const server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          nodeEnv: env.NODE_ENV,
          corsOrigins: env.CORS_ORIGINS,
          openApiEnabled: env.OPENAPI_ENABLED,
          docsPath: env.OPENAPI_ENABLED ? "/api/docs" : null,
        },
        "Backend started",
      );
    });

    const gracefulShutdown = async (signal: NodeJS.Signals) => {
      logger.info({ signal }, "Shutdown signal received");

      server.close(async () => {
        await prisma.$disconnect();
        logger.info("Server closed gracefully");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void gracefulShutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void gracefulShutdown("SIGTERM");
    });

    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason }, "Unhandled promise rejection");
    });

    process.on("uncaughtException", (error) => {
      logger.fatal({ err: error }, "Uncaught exception");
    });
  } catch (error) {
    logger.fatal({ err: error }, "Startup checks failed");
    process.exit(1);
  }
}

void bootstrap();
