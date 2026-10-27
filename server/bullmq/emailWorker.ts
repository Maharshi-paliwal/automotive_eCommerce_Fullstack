
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { processEmailJob } from "./Emailjob.js";
export { processEmailJob } from "./Emailjob.js";

const emailWorker = new Worker(
  "email-processing",
  (job) => processEmailJob(job),
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, error) => {
  console.error(`Email job ${job?.id} failed:`, error.message);
});

emailWorker.on("error", (error) => {
  console.error("Email worker error:", error);
});

export default emailWorker;
