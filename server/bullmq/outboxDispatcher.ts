import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/redis.js";
import { orderQueue } from "./orderQueue.js";

export const riderOutboxQueue = new Queue("rider-assignment", { connection: redisConnection });
const db = prisma;

const queueFor = (queue: string) => {
  if (queue === "order-processing") return orderQueue;
  if (queue === "rider-assignment") return riderOutboxQueue;
  throw new Error(`Unsupported outbox queue: ${queue}`);
};

export const retryOutboxJob = async (jobId: string | undefined) => {
  if (!jobId) return;

  const match = /^outbox-([0-9a-f-]{36})-dispatch-(\d+)$/.exec(jobId);
  if (!match) return;

  const eventId = match[1];
  const dispatchedGeneration = Number(match[2]);

  await db.outboxEvent.updateMany({
    where: {
      id: eventId,
      jobGeneration: dispatchedGeneration,
      processedAt: { not: null },
      leaseToken: null,
    },
    data: {
      processedAt: null,
      lockedUntil: null,
      leaseToken: null,
      attempts: { increment: 1 },
      jobGeneration: { increment: 1 },
      availableAt: new Date(
        Date.now() +
          Math.min(60 * 60_000, 1000 * 2 ** Math.min(dispatchedGeneration + 1, 12)),
      ),
      lastError: "Background job failed; scheduled for retry",
    },
  });
};

export const dispatchOutboxOnce = async () => {
  const now = new Date();
  const events = await db.outboxEvent.findMany({
    where: { processedAt: null, availableAt: { lte: now }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  for (const event of events) {
    const claimTime = new Date();
    const leaseUntil = new Date(claimTime.getTime() + 60_000);
    const leaseToken = randomUUID();
    const claimed = await db.outboxEvent.updateMany({
      where: {
        id: event.id,
        processedAt: null,
        availableAt: { lte: claimTime },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: claimTime } }],
      },
      data: { lockedUntil: leaseUntil, leaseToken },
    });
    if (claimed.count !== 1) continue;

    try {
      await queueFor(event.queue).add(event.jobName, event.payload as Record<string, unknown>, {
        // Dispatch retries reuse the same ID, including ambiguous Redis
        // timeouts. A new generation is created only after a final job failure.
        jobId: `outbox-${event.id}-dispatch-${event.jobGeneration}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Queue dispatch failed";
      await db.outboxEvent.updateMany({
        where: { id: event.id, processedAt: null, leaseToken },
        data: {
          attempts: { increment: 1 },
          lastError: message,
          availableAt: new Date(Date.now() + Math.min(60 * 60_000, 1000 * 2 ** Math.min(event.attempts, 12))),
          lockedUntil: null,
          leaseToken: null,
        },
      });
      continue;
    }

    // The token fences stale dispatchers after a lease expires and another
    // process claims the row. Queue acceptance is safe to repeat because the
    // job ID is stable for this dispatch generation.
    await db.outboxEvent.updateMany({
      where: { id: event.id, processedAt: null, leaseToken },
      data: { processedAt: new Date(), lockedUntil: null, leaseToken: null, lastError: null },
    });
  }
};

export const startOutboxDispatcher = () => {
  let stopped = false;
  let inFlight: Promise<void> | null = null;
  const poll = () => {
    if (stopped) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = dispatchOutboxOnce()
      .catch((error) => {
        console.error("Outbox dispatch cycle failed:", error instanceof Error ? error.message : "unknown error");
      })
      .finally(() => { inFlight = null; });
    return inFlight;
  };
  void poll();
  const timer = setInterval(() => { void poll(); }, 1000);
  timer.unref();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await inFlight;
  };
};
