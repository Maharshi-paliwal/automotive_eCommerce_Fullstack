import webPush from "web-push";
import { prisma } from "../config/prisma.js";
import { getWebPushConfiguration } from "../config/webPush.js";

type PushError = Error & { statusCode?: number };

const getNavigationTarget = (notification: {
  type: string;
  referenceType: string | null;
  referenceId: string | null;
}) => notification.type === "CUSTOMER_COMPLAINT" &&
  notification.referenceType === "Complaint" &&
  notification.referenceId
? `/admin/complaints/${encodeURIComponent(notification.referenceId)}`
  : "/admin";

export const buildPushPayload = (notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
}) => ({
  notificationId: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.type === "CUSTOMER_COMPLAINT"
    ? "A customer complaint needs review."
    : notification.message,
  navigationTarget: getNavigationTarget(notification),
});

export const deliverNotificationPush = async (notificationId: string, subscriptionId: string) => {
  const configuration = getWebPushConfiguration();
  if (!configuration) {
    console.warn("Web Push is not configured; skipped push notification delivery");
    return { skipped: true as const };
  }

  const subscription = await prisma.pushSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
  });
  if (!subscription) return { skipped: true as const };

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: subscription.userId },
    select: { id: true, type: true, title: true, message: true, referenceType: true, referenceId: true },
  });
  if (!notification) return { skipped: true as const };

  webPush.setVapidDetails(configuration.subject, configuration.publicKey, configuration.privateKey);
  try {
    await webPush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, JSON.stringify(buildPushPayload(notification)), { TTL: 60 * 60 });
    return { delivered: true as const };
  } catch (error) {
    const pushError = error as PushError;
    if (pushError.statusCode === 404 || pushError.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({
        where: { id: subscription.id, userId: subscription.userId },
      });
      return { removed: true as const };
    }
    throw error;
  }
};
