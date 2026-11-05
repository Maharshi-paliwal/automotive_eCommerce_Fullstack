import type { Request, Response } from "express";
import { getWebPushConfiguration } from "../config/webPush.js";
import {
  listPushSubscriptions,
  parsePushSubscription,
  PushSubscriptionConflictError,
  registerPushSubscription,
  removePushSubscription,
} from "../services/pushSubscriptionService.js";

export const getPushSubscriptionStatus = async (req: Request, res: Response) => {
  let configuration;
  try {
    configuration = getWebPushConfiguration();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid Web Push configuration");
    return res.status(503).json({ message: "Browser push is not configured" });
  }
  const subscriptions = await listPushSubscriptions(req.user!.id);
  return res.json({
    enabled: configuration !== null,
    vapidPublicKey: configuration?.publicKey ?? null,
    subscriptions,
  });
};

export const createPushSubscription = async (req: Request, res: Response) => {
  let configuration;
  try {
    configuration = getWebPushConfiguration();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid Web Push configuration");
    return res.status(503).json({ message: "Browser push is not configured" });
  }
  if (!configuration) return res.status(503).json({ message: "Browser push is not configured" });

  const subscription = parsePushSubscription(req.body);
  if (!subscription) return res.status(400).json({ message: "Invalid push subscription" });
  try {
    const result = await registerPushSubscription(req.user!.id, subscription);
    return res.status(201).json({ subscription: result });
  } catch (error) {
    if (error instanceof PushSubscriptionConflictError) {
      return res.status(409).json({ message: error.message });
    }
    throw error;
  }
};

export const deletePushSubscription = async (req: Request, res: Response) => {
  const subscriptionId = String(req.params.subscriptionId);
  const removed = await removePushSubscription(req.user!.id, subscriptionId);
  if (!removed) return res.status(404).json({ message: "Push subscription not found" });
  return res.status(204).send();
};
