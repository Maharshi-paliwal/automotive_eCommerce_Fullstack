import express from "express";
import { chat } from "../controllers/chatController.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";

const chatRouter = express.Router();

const chatRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 6,
  message: "You're sending messages too quickly; please wait a moment",
});

chatRouter.post("/", chatRateLimit, chat);

export default chatRouter;
