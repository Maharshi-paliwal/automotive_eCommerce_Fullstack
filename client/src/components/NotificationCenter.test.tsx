import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const socketState = { connected: false };
  const socket = {
    get connected() { return socketState.connected; },
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      const callbacks = listeners.get(event) ?? new Set();
      callbacks.add(listener);
      listeners.set(event, callbacks);
    }),
    off: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(listener);
    }),
    connect: vi.fn(() => {
      socketState.connected = true;
      listeners.get("connect")?.forEach((listener) => listener());
    }),
    disconnect: vi.fn(() => {
      socketState.connected = false;
      listeners.get("disconnect")?.forEach((listener) => listener());
    }),
  };
  return {
    listeners,
    socketState,
    socket,
    getAdminNotifications: vi.fn(),
    getAdminUnreadCount: vi.fn(),
    markAdminNotificationRead: vi.fn(),
    markAllAdminNotificationsRead: vi.fn(),
    getPushSubscriptionStatus: vi.fn(),
    registerPushSubscription: vi.fn(),
    deletePushSubscription: vi.fn(),
  };
});

vi.mock("../mapbox/socket", () => ({ socket: mocks.socket }));
vi.mock("../api/notificationApi", () => ({
  getAdminNotifications: mocks.getAdminNotifications,
  getAdminUnreadCount: mocks.getAdminUnreadCount,
  markAdminNotificationRead: mocks.markAdminNotificationRead,
  markAllAdminNotificationsRead: mocks.markAllAdminNotificationsRead,
  getPushSubscriptionStatus: mocks.getPushSubscriptionStatus,
  registerPushSubscription: mocks.registerPushSubscription,
  deletePushSubscription: mocks.deletePushSubscription,
}));

import NotificationCenter from "./NotificationCenter";
import { removeCurrentUserPushSubscription } from "../api/pushSubscriptionLifecycle";

const notification = {
  id: "notification-1",
  type: "LOW_STOCK",
  title: "Low stock alert",
  message: "A product is running low.",
  referenceType: null,
  referenceId: null,
  readAt: null,
  createdAt: "2026-11-04T10:00:00.000Z",
};

const subscription = {
  endpoint: "https://fcm.googleapis.com/push/example",
  toJSON: () => ({
    endpoint: "https://fcm.googleapis.com/push/example",
    expirationTime: null,
    keys: { p256dh: "public-key", auth: "auth-key" },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const registration = {
  pushManager: {
    getSubscription: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockResolvedValue(subscription),
  },
};

const setupBrowserPush = (permission = "default") => {
  const notificationApi = {
    permission,
    requestPermission: vi.fn().mockResolvedValue("granted"),
  };
  Object.defineProperty(window, "Notification", { configurable: true, value: notificationApi });
  Object.defineProperty(window, "PushManager", { configurable: true, value: class PushManager {} });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
    },
  });
  return notificationApi;
};

const renderCentre = () => render(
  <MemoryRouter>
    <NotificationCenter userId="admin-1" />
  </MemoryRouter>,
);

describe("NotificationCenter", () => {
  beforeEach(() => {
    mocks.listeners.clear();
    mocks.socketState.connected = false;
    vi.clearAllMocks();
    mocks.getAdminNotifications.mockResolvedValue({
      notifications: [notification],
      pagination: { page: 1, limit: 25, total: 1 },
    });
    mocks.getAdminUnreadCount.mockResolvedValue(1);
    mocks.markAdminNotificationRead.mockResolvedValue({ ...notification, readAt: "2026-11-04T11:00:00.000Z" });
    mocks.markAllAdminNotificationsRead.mockResolvedValue(1);
    mocks.getPushSubscriptionStatus.mockResolvedValue({
      enabled: false,
      vapidPublicKey: null,
      subscriptions: [],
    });
    mocks.registerPushSubscription.mockResolvedValue({ id: "subscription-1", createdAt: "2026-11-04T10:00:00.000Z" });
    mocks.deletePushSubscription.mockResolvedValue(undefined);
    registration.pushManager.getSubscription.mockResolvedValue(null);
    registration.pushManager.subscribe.mockResolvedValue(subscription);
    subscription.unsubscribe.mockResolvedValue(true);
    setupBrowserPush();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(window, "PushManager");
  });

  it("renders history and unread count, and marks one notification read", async () => {
    renderCentre();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(await screen.findByText("Low stock alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark Low stock alert as read" }));

    await waitFor(() => {
      expect(mocks.markAdminNotificationRead).toHaveBeenCalledWith("notification-1");
      expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    });
  });

  it("marks all notifications read", async () => {
    renderCentre();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark all notifications as read" }));

    await waitFor(() => {
      expect(mocks.markAllAdminNotificationsRead).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    });
  });

  it("adds socket events once and refreshes history after reconnection", async () => {
    renderCentre();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await screen.findByText("Low stock alert");
    const newNotification = {
      ...notification,
      id: "notification-2",
      title: "Payment failed",
      type: "PAYMENT_FAILED",
    };
    act(() => {
      const listener = mocks.listeners.get("notification:new")?.values().next().value;
      listener?.({ notificationId: newNotification.id, notification: newNotification });
      listener?.({ notificationId: newNotification.id, notification: newNotification });
    });
    expect(await screen.findByText("Payment failed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toBeTruthy();

    const initialRequestCount = mocks.getAdminNotifications.mock.calls.length;
    act(() => {
      mocks.listeners.get("disconnect")?.forEach((listener) => listener());
      mocks.listeners.get("connect")?.forEach((listener) => listener());
    });
    await waitFor(() => expect(mocks.getAdminNotifications.mock.calls.length).toBeGreaterThan(initialRequestCount));
  });

  it("registers the service worker and subscribes only after an explicit enable action", async () => {
    const permission = setupBrowserPush();
    mocks.getPushSubscriptionStatus.mockResolvedValue({
      enabled: true,
      vapidPublicKey: "AQIDBA",
      subscriptions: [],
    });
    renderCentre();
    await waitFor(() => expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/service-worker.js"));
    expect(permission.requestPermission).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Enable" }));
    await waitFor(() => {
      expect(permission.requestPermission).toHaveBeenCalledOnce();
      expect(registration.pushManager.subscribe).toHaveBeenCalledOnce();
      expect(mocks.registerPushSubscription).toHaveBeenCalledWith({
        endpoint: subscription.endpoint,
        keys: { p256dh: "public-key", auth: "auth-key" },
      });
    });
  });

  it("removes the current browser subscription from the backend and browser", async () => {
    setupBrowserPush("granted");
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    mocks.getPushSubscriptionStatus.mockResolvedValue({
      enabled: true,
      vapidPublicKey: "AQIDBA",
      subscriptions: [],
    });
    renderCentre();
    await waitFor(() => expect(mocks.registerPushSubscription).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Disable" }));
    await waitFor(() => {
      expect(mocks.deletePushSubscription).toHaveBeenCalledWith("subscription-1");
      expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    });
  });

  it("removes a saved device subscription even if the browser subscription is gone", async () => {
    setupBrowserPush("granted");
    registration.pushManager.getSubscription.mockResolvedValue(null);
    mocks.getPushSubscriptionStatus.mockResolvedValue({
      enabled: true,
      vapidPublicKey: "AQIDBA",
      subscriptions: [{ id: "subscription-1", createdAt: "2026-11-04T10:00:00.000Z" }],
    });
    window.localStorage.setItem("torquenest.pushSubscription:admin-1", JSON.stringify({
      endpoint: subscription.endpoint,
      subscriptionId: "subscription-1",
    }));
    renderCentre();
    await waitFor(() => expect(mocks.getPushSubscriptionStatus).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Disable" }));
    await waitFor(() => expect(mocks.deletePushSubscription).toHaveBeenCalledWith("subscription-1"));
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it("removes account-scoped push state before logout", async () => {
    setupBrowserPush("granted");
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    window.localStorage.setItem("torquenest.pushSubscription:admin-1", JSON.stringify({
      endpoint: subscription.endpoint,
      subscriptionId: "subscription-1",
    }));

    await removeCurrentUserPushSubscription("admin-1");

    expect(mocks.deletePushSubscription).toHaveBeenCalledWith("subscription-1");
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("torquenest.pushSubscription:admin-1")).toBeNull();
  });

  it("does not request permission when the backend has no VAPID configuration", async () => {
    const permission = setupBrowserPush();
    renderCentre();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(await screen.findByText("Browser push is not configured for this server.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() => expect(mocks.getPushSubscriptionStatus).toHaveBeenCalled());
    expect(permission.requestPermission).not.toHaveBeenCalled();
  });

  it("does not subscribe when the user has denied notification permission", async () => {
    const permission = setupBrowserPush("denied");
    mocks.getPushSubscriptionStatus.mockResolvedValue({
      enabled: true,
      vapidPublicKey: "AQIDBA",
      subscriptions: [],
    });
    renderCentre();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Enable" }));

    expect(await screen.findByText("Notifications are blocked in browser settings.")).toBeTruthy();
    expect(permission.requestPermission).not.toHaveBeenCalled();
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("reports unsupported browsers and removes socket listeners on unmount", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "PushManager");
    const { unmount } = renderCentre();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(await screen.findByText("Browser push is not supported on this device.")).toBeTruthy();
    unmount();
    expect(mocks.socket.off).toHaveBeenCalledWith("notification:new", expect.any(Function));
  });
});
