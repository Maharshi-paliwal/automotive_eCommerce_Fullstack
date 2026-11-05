import { http } from "./http";

export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type PushSubscriptionStatus = {
  enabled: boolean;
  vapidPublicKey: string | null;
  subscriptions: Array<{ id: string; createdAt: string }>;
};

export async function getAdminNotifications() {
  const { data } = await http.get<{
    notifications: NotificationRecord[];
    pagination: { page: number; limit: number; total: number };
  }>("/admin/notifications", { params: { page: 1, limit: 25 } });
  return data;
}

export async function getAdminUnreadCount() {
  const { data } = await http.get<{ unreadCount: number }>("/admin/notifications/unread-count");
  return data.unreadCount;
}

export async function markAdminNotificationRead(notificationId: string) {
  const { data } = await http.patch<{ notification: NotificationRecord }>(
    `/admin/notifications/${encodeURIComponent(notificationId)}/read`,
  );
  return data.notification;
}

export async function markAllAdminNotificationsRead() {
  const { data } = await http.patch<{ updatedCount: number }>("/admin/notifications/read-all");
  return data.updatedCount;
}

export async function getPushSubscriptionStatus() {
  const { data } = await http.get<PushSubscriptionStatus>("/notifications/push-subscriptions");
  return data;
}

export async function registerPushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { data } = await http.post<{ subscription: { id: string; createdAt: string } }>(
    "/notifications/push-subscriptions",
    subscription,
  );
  return data.subscription;
}

export async function deletePushSubscription(subscriptionId: string) {
  await http.delete(`/notifications/push-subscriptions/${encodeURIComponent(subscriptionId)}`);
}
