
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const orderQueue = new Queue("order-processing", {
  connection: redisConnection,
});
