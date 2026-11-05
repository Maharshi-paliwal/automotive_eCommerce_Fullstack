import express from "express";
import auth from "../middlewares/Auth.js";
import {
  createPushSubscription,
  deletePushSubscription,
  getPushSubscriptionStatus,
} from "../controllers/pushSubscriptionController.js";

const notificationRouter = express.Router();

notificationRouter.use(auth);
notificationRouter.get("/push-subscriptions", getPushSubscriptionStatus);
notificationRouter.post("/push-subscriptions", createPushSubscription);
notificationRouter.delete("/push-subscriptions/:subscriptionId", deletePushSubscription);

export default notificationRouter;
