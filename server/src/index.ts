import http from "node:http";
import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./config/db";
import { logger } from "./config/logger";

const server = http.createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "server listening");
});

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutdown initiated");

  const forceExit = setTimeout(() => {
    logger.warn("forced exit after shutdown timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "error closing http server");
    }
    try {
      await pool.end();
      logger.info("db pool closed");
    } catch (poolErr) {
      logger.error({ err: poolErr }, "error closing db pool");
    }
    clearTimeout(forceExit);
    process.exit(err ? 1 : 0);
  });
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

export { server };
