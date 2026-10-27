
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const orderWorker = new Worker(
  "order-processing",
  async (job) => {
    console.log(`Processing job: ${job.name}`);
    console.log("Job data:", job.data);

    switch (job.name) {
      case "process-order": {
        const { orderId } = job.data;
        console.log(`Processing order: ${orderId}`);

        // TODO: Add actual order-processing logic here.
        break;
      }

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

orderWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

orderWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});
