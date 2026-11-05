import { deletePushSubscription } from "./notificationApi";

type PushRegistration = { endpoint: string; subscriptionId: string };

const storageKey = (userId: string) => `torquenest.pushSubscription:${userId}`;

export const readStoredPushRegistration = (userId: string): PushRegistration | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) || "null");
    if (!value || typeof value !== "object") return null;
    const registration = value as Partial<PushRegistration>;
    return typeof registration.endpoint === "string" && typeof registration.subscriptionId === "string"
      ? { endpoint: registration.endpoint, subscriptionId: registration.subscriptionId }
      : null;
  } catch {
    return null;
  }
};

export const savePushRegistration = (userId: string, registration: PushRegistration) => {
  localStorage.setItem(storageKey(userId), JSON.stringify(registration));
};

export const clearStoredPushRegistration = (userId: string) => localStorage.removeItem(storageKey(userId));

export async function removeCurrentUserPushSubscription(userId: string) {
  const saved = readStoredPushRegistration(userId);
  if (!saved) return;

  try {
    await deletePushSubscription(saved.subscriptionId);
  } catch (error) {
    const registration = await navigator.serviceWorker?.getRegistration("/service-worker.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription?.endpoint === saved.endpoint && !(await subscription.unsubscribe())) {
      throw new Error("Could not remove this browser's push subscription before logout.");
    }
    clearStoredPushRegistration(userId);
    throw error;
  }

  clearStoredPushRegistration(userId);
  const registration = await navigator.serviceWorker?.getRegistration("/service-worker.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription?.endpoint === saved.endpoint && !(await subscription.unsubscribe())) {
    throw new Error("The browser could not remove its local push subscription.");
  }
}
