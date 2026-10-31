import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { parsePort } from "./config/runtimeConfig.js";
import { attachSocketServer, closeSocketServer } from "./config/socket.js";
import { prisma } from "./config/prisma.js";
import { redisConnection } from "./config/redis.js";
import { emailQueue } from "./bullmq/emailQueue.js";

const port = parsePort(process.env.PORT);
const httpServer = createServer(app);
attachSocketServer(httpServer);

let shuttingDown = false;
export const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; closing server connections`);
  let failed = false;
  const close = async (name: string, operation: () => Promise<unknown>) => {
    try {
      await operation();
    } catch (error) {
      failed = true;
      console.error(`Could not close ${name}`, error instanceof Error ? error.message : "Unknown shutdown error");
    }
  };
  await close("Socket.IO", closeSocketServer);
  await close("HTTP", () => new Promise<void>((resolve, reject) => {
    if (!httpServer.listening) return resolve();
    httpServer.close((error) => error ? reject(error) : resolve());
  }));
  await close("email queue", () => emailQueue.close());
  await close("Redis", () => redisConnection.quit());
  await close("Prisma", () => prisma.$disconnect());
  if (failed) process.exitCode = 1;
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

httpServer.listen(port, () => {
  console.info(`Server listening on port ${port}`);
});

httpServer.on("error", (error) => {
  console.error("HTTP server failed to start", error.message);
  process.exitCode = 1;
  void shutdown("server error");
});
