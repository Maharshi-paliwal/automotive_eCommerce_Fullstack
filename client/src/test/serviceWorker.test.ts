import { describe, expect, it, vi } from "vitest";
import serviceWorkerSource from "../../public/service-worker.js?raw";

const createWorker = () => {
  const listeners = new Map<string, (event: any) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const self = {
    location: { origin: "https://torquenest.test" },
    addEventListener: (event: string, listener: (event: any) => void) => listeners.set(event, listener),
    registration: { showNotification },
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow },
  };
  new Function("self", "URL", serviceWorkerSource)(self, URL);
  return { listeners, showNotification, openWindow };
};

describe("notification service worker", () => {
  it("shows a safe fallback notification for missing or malformed payloads", async () => {
    const worker = createWorker();
    let delivery: Promise<void> | undefined;
    worker.listeners.get("push")?.({
      data: { json: () => null },
      waitUntil: (promise: Promise<void>) => { delivery = promise; },
    });
    await delivery;

    expect(worker.showNotification).toHaveBeenCalledWith(
      "TorqueNest notification",
      expect.objectContaining({
        body: "You have a new notification.",
        data: { notificationId: "", type: "UNKNOWN", target: "/admin" },
      }),
    );
  });

  it("opens only allowed same-origin notification destinations", async () => {
    const worker = createWorker();
    let delivery: Promise<void> | undefined;
    worker.listeners.get("push")?.({
      data: { json: () => ({
        notificationId: "notification-1",
        type: "LOW_STOCK",
        title: "Low stock",
        message: "Review inventory.",
        navigationTarget: "https://attacker.test/",
      }) },
      waitUntil: (promise: Promise<void>) => { delivery = promise; },
    });
    await delivery;
    expect(worker.showNotification).toHaveBeenCalledWith(
      "Low stock",
      expect.objectContaining({ data: expect.objectContaining({ target: "/admin" }) }),
    );

    worker.listeners.get("notificationclick")?.({
      notification: { close: vi.fn(), data: { target: "//attacker.test/" } },
      waitUntil: (promise: Promise<void>) => { delivery = promise; },
    });
    await delivery;
    expect(worker.openWindow).toHaveBeenCalledWith("/admin");
  });
});
