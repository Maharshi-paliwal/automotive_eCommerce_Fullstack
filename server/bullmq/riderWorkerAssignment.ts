import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { assignRiderAfterDelay } from "./riderAssignment.js";
import { retryOutboxJob } from "./outboxDispatcher.js";

const RIDER_ASSIGNMENT_QUEUE = "rider-assignment";

export const riderAssignmentWorker = new Worker(
  RIDER_ASSIGNMENT_QUEUE,
  async (job) => {
    if (job.name !== "auto-assign-rider") {
      throw new Error(`Unknown rider assignment job: ${job.name}`);
    }

    return assignRiderAfterDelay(job.data.orderId);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

riderAssignmentWorker.on("completed", (job, result) => {
  console.log(`Rider assignment job ${job.id} completed:`, result);
});

riderAssignmentWorker.on("failed", (job, error) => {
  console.error(`Rider assignment job ${job?.id} failed:`, error.message);
  if (job && job.attemptsMade >= Number(job.opts.attempts ?? 1)) {
    void retryOutboxJob(job.id).catch((outboxError) => console.error("Could not schedule rider outbox retry:", outboxError instanceof Error ? outboxError.message : "unknown error"));
  }
});

riderAssignmentWorker.on("error", (error) => {
  console.error("Rider assignment worker error:", error);
});
