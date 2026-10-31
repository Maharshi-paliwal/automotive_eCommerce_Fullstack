import "dotenv/config";
import emailWorker from "./bullmq/emailWorker.js";
import { orderWorker } from "./bullmq/orderWorker.js";
import { riderAssignmentWorker } from "./bullmq/riderWorkerAssignment.js";
import { emailQueue } from "./bullmq/emailQueue.js";
import { orderQueue } from "./bullmq/orderQueue.js";
import { riderAssignmentQueue } from "./bullmq/riderAssignment.js";
import { riderOutboxQueue, startOutboxDispatcher } from "./bullmq/outboxDispatcher.js";
import { prisma } from "./config/prisma.js";
import { redisConnection } from "./config/redis.js";

const stopOutboxDispatcher = startOutboxDispatcher();
console.info("TorqueNest background workers started");

let shuttingDown = false;
export const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; closing background workers`);
  let failed = false;
  const close = async (name: string, operation: () => Promise<unknown>) => {
    try {
      await operation();
    } catch (error) {
      failed = true;
      console.error(`Could not close ${name}`, error instanceof Error ? error.message : "Unknown shutdown error");
    }
  };
  await close("outbox dispatcher", stopOutboxDispatcher);
  // Worker.close stops fetching new jobs and waits for active jobs to finish.
  await close("email worker", () => emailWorker.close());
  await close("order worker", () => orderWorker.close());
  await close("rider assignment worker", () => riderAssignmentWorker.close());
  await close("email queue", () => emailQueue.close());
  await close("order queue", () => orderQueue.close());
  await close("rider assignment queue", () => riderAssignmentQueue.close());
  await close("rider outbox queue", () => riderOutboxQueue.close());
  await close("Redis", () => redisConnection.quit());
  await close("Prisma", () => prisma.$disconnect());
  if (failed) process.exitCode = 1;
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
