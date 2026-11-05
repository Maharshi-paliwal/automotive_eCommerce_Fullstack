import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon, CheckCheckIcon, CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  deletePushSubscription,
  getAdminNotifications,
  getAdminUnreadCount,
  getPushSubscriptionStatus,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  registerPushSubscription,
  type NotificationRecord,
  type PushSubscriptionStatus,
} from "../api/notificationApi";
import {
  clearStoredPushRegistration,
  readStoredPushRegistration,
  savePushRegistration,
} from "../api/pushSubscriptionLifecycle";
import { socket } from "../mapbox/socket";

type Props = { userId: string };
type SocketNotificationEvent = { notificationId?: unknown; notification?: unknown };

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const decodeVapidKey = (key: string) => {
  const padding = "=".repeat((4 - key.length % 4) % 4);
  const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

const subscriptionPayload = (subscription: PushSubscription) => {
  const value = subscription.toJSON();
  if (!value.endpoint || !value.keys?.p256dh || !value.keys.auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }
  return {
    endpoint: value.endpoint,
    keys: { p256dh: value.keys.p256dh, auth: value.keys.auth },
  };
};

const notificationDestination = (notification: NotificationRecord) => {
  switch (notification.type) {
    case "LOW_STOCK":
      return "/admin/inventory";
    case "PAYMENT_FAILED":
      return "/admin/orders";
    case "CUSTOMER_COMPLAINT":
    default:
      return "/admin";
  }
};

const eventNotification = (event: SocketNotificationEvent): NotificationRecord | null => {
  if (!event.notification || typeof event.notification !== "object") return null;
  const notification = event.notification as Partial<NotificationRecord>;
  const id = typeof notification.id === "string" ? notification.id : event.notificationId;
  if (
    typeof id !== "string" ||
    typeof notification.type !== "string" ||
    typeof notification.title !== "string" ||
    typeof notification.message !== "string"
  ) return null;
  return {
    id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    referenceType: typeof notification.referenceType === "string" ? notification.referenceType : null,
    referenceId: typeof notification.referenceId === "string" ? notification.referenceId : null,
    readAt: typeof notification.readAt === "string" ? notification.readAt : null,
    createdAt: typeof notification.createdAt === "string" ? notification.createdAt : new Date().toISOString(),
  };
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString();
};

export default function NotificationCenter({ userId }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [pushStatus, setPushStatus] = useState<PushSubscriptionStatus | null>(null);
  const [pushActive, setPushActive] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [pushError, setPushError] = useState("");
  const notificationIds = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const [history, unread] = await Promise.all([
        getAdminNotifications(),
        getAdminUnreadCount(),
      ]);
      notificationIds.current = new Set(history.notifications.map((notification) => notification.id));
      setNotifications(history.notifications);
      setUnreadCount(unread);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ownsConnection = false;
    let active = true;
    const loadAfterConnect = () => {
      setConnected(true);
      void refresh();
    };
    const handleDisconnect = () => setConnected(false);
    const handleConnectError = () => setConnected(false);
    const handleNotification = (payload: SocketNotificationEvent) => {
      const notification = eventNotification(payload);
      if (!notification || notificationIds.current.has(notification.id)) return;
      notificationIds.current.add(notification.id);
      setNotifications((current) => {
        return [notification, ...current].slice(0, 25);
      });
      setUnreadCount((count) => count + 1);
    };

    // Load over the network after commit rather than updating state during effect setup.
    // oxlint-disable-next-line react/set-state-in-effect
    void Promise.resolve().then(() => {
      if (active) void refresh();
    });
    socket.on("connect", loadAfterConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("notification:new", handleNotification);
    if (!socket.connected) {
      ownsConnection = true;
      socket.connect();
    }

    return () => {
      active = false;
      socket.off("connect", loadAfterConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("notification:new", handleNotification);
      if (ownsConnection && socket.connected) socket.disconnect();
    };
  }, [refresh, userId]);

  useEffect(() => {
    let cancelled = false;
    const syncPushSubscription = async () => {
      if (!isSupported()) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js");
        const status = await getPushSubscriptionStatus();
        if (cancelled) return;
        setPushStatus(status);
        const browserSubscription = await registration.pushManager.getSubscription();
        setPushActive(browserSubscription !== null || readStoredPushRegistration(userId) !== null);
        if (browserSubscription && status.enabled) {
          const saved = await registerPushSubscription(subscriptionPayload(browserSubscription));
          if (cancelled) return;
          savePushRegistration(userId, {
            endpoint: browserSubscription.endpoint,
            subscriptionId: saved.id,
          });
        }
        if (!status.enabled) setPushMessage("Browser push is not configured for this server.");
        else if (Notification.permission === "denied") setPushMessage("Notifications are blocked in browser settings.");
        else setPushMessage("");
      } catch (requestError) {
        if (!cancelled) {
          const message = requestError instanceof Error ? requestError.message : "Could not sync browser notifications.";
          if (message.toLowerCase().includes("push is not configured")) setPushMessage(message);
          else setPushError(message);
        }
      }
    };
    void syncPushSubscription();
    return () => { cancelled = true; };
  }, [userId]);

  const markRead = async (notificationId: string) => {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification || notification.readAt) return;
    try {
      const updated = await markAdminNotificationRead(notificationId);
      setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not mark notification as read.");
    }
  };

  const markAllRead = async () => {
    try {
      await markAllAdminNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnreadCount(0);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not mark notifications as read.");
    }
  };

  const handleNotificationOpen = async (notification: NotificationRecord) => {
    if (!notification.readAt) await markRead(notification.id);
    setOpen(false);
    navigate(notificationDestination(notification));
  };

  const enablePush = async () => {
    setPushBusy(true);
    setPushError("");
    setPushMessage("");
    try {
      if (!isSupported()) {
        setPushMessage("Browser push is not supported on this device.");
        return;
      }

      const status = await getPushSubscriptionStatus();
      setPushStatus(status);
      if (!status.enabled || !status.vapidPublicKey) {
        setPushMessage("Browser push is not configured for this server.");
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMessage(permission === "denied"
          ? "Notifications are blocked in browser settings."
          : "Allow notifications in your browser to continue.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const subscription = await registration.pushManager.getSubscription() ??
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(status.vapidPublicKey),
        });
      const saved = await registerPushSubscription(subscriptionPayload(subscription));
      savePushRegistration(userId, { endpoint: subscription.endpoint, subscriptionId: saved.id });
      setPushActive(true);
      setPushStatus((current) => current
        ? { ...current, subscriptions: current.subscriptions.some((item) => item.id === saved.id)
          ? current.subscriptions
          : [...current.subscriptions, saved] }
        : current);
      setPushMessage("Browser notifications are enabled on this device.");
    } catch (requestError) {
      setPushError(requestError instanceof Error ? requestError.message : "Could not enable browser notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    setPushError("");
    setPushMessage("");
    try {
      if (!isSupported()) {
        setPushMessage("Browser push is not supported on this device.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const saved = readStoredPushRegistration(userId);
      let subscriptionId: string | null = saved?.subscriptionId ?? null;

      if (subscription && saved?.endpoint !== subscription.endpoint && subscriptionId) {
        await deletePushSubscription(subscriptionId);
        subscriptionId = null;
      }

      if (subscription && !subscriptionId) {
        const registered = await registerPushSubscription(subscriptionPayload(subscription));
        subscriptionId = registered.id;
      }
      if (subscriptionId) await deletePushSubscription(subscriptionId);
      if (subscription && !(await subscription.unsubscribe())) {
        throw new Error("The browser could not remove its local push subscription.");
      }
      clearStoredPushRegistration(userId);
      setPushActive(false);
      setPushStatus((current) => current
        ? { ...current, subscriptions: subscriptionId
          ? current.subscriptions.filter((item) => item.id !== subscriptionId)
          : current.subscriptions }
        : current);
      setPushMessage("Browser notifications are disabled on this device.");
    } catch (requestError) {
      setPushError(requestError instanceof Error ? requestError.message : "Could not disable browser notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl p-2 text-app-blue transition-colors hover:bg-app-cream"
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-app-amber px-1 text-[10px] font-semibold text-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            aria-label="Notification centre"
            className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-app-border bg-white shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <div>
                <h2 className="font-semibold text-app-blue">Notifications</h2>
                <p className="text-xs text-app-text-light">
                  {connected ? "Live updates enabled" : "Reconnecting to live updates…"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Mark all notifications as read"
                  title="Mark all as read"
                  disabled={unreadCount === 0}
                  onClick={() => void markAllRead()}
                  className="rounded-lg p-2 text-app-blue hover:bg-app-cream disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCheckIcon className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Close notification centre"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-app-text-light hover:bg-app-cream"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </header>

            {error && (
              <div className="flex items-center justify-between gap-3 bg-red-50 px-4 py-2 text-sm text-app-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => void refresh()} className="shrink-0 font-semibold underline">
                  Retry
                </button>
              </div>
            )}

            <div className="max-h-[min(55vh,28rem)] overflow-y-auto">
              {loading ? (
                <p className="flex items-center gap-2 px-4 py-8 text-sm text-app-text-light" role="status">
                  <LoaderCircleIcon className="size-4 animate-spin" /> Loading notifications…
                </p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-app-text-light">You’re all caught up.</p>
              ) : (
                <ul className="divide-y divide-app-border">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`px-4 py-3 ${notification.readAt ? "bg-white" : "bg-sky-50/80"}`}
                    >
                      <button
                        type="button"
                        onClick={() => void handleNotificationOpen(notification)}
                        className="block w-full text-left"
                      >
                        <span className="flex items-start gap-2">
                          {!notification.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-app-amber" />}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-app-blue">{notification.title}</span>
                            <span className="mt-0.5 block text-sm text-app-text-light">{notification.message}</span>
                            <time className="mt-1 block text-xs text-zinc-400" dateTime={notification.createdAt}>
                              {formatTimestamp(notification.createdAt)}
                            </time>
                          </span>
                        </span>
                      </button>
                      {!notification.readAt && (
                        <button
                          type="button"
                          aria-label={`Mark ${notification.title} as read`}
                          onClick={() => void markRead(notification.id)}
                          className="ml-4 mt-2 inline-flex items-center gap-1 text-xs font-medium text-app-blue hover:text-app-amber-dark"
                        >
                          <CheckIcon className="size-3.5" /> Mark as read
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-app-border bg-app-background/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-app-blue">Browser notifications</p>
                  {!isSupported()
                    ? <p className="mt-0.5 text-xs text-app-text-light">Browser push is not supported on this device.</p>
                    : pushMessage && <p className="mt-0.5 text-xs text-app-text-light">{pushMessage}</p>}
                  {pushError && <p className="mt-0.5 text-xs text-app-error" role="alert">{pushError}</p>}
                  {pushStatus?.enabled && pushStatus.subscriptions.length > 0 && (
                    <p className="mt-0.5 text-xs text-app-text-light">
                      Enabled on {pushStatus.subscriptions.length} device{pushStatus.subscriptions.length === 1 ? "" : "s"}
                    </p>
                  )}
                  {isSupported() && Notification.permission === "denied" && !pushMessage && (
                    <p className="mt-0.5 text-xs text-app-text-light">Notifications are blocked in browser settings.</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={pushBusy || !isSupported()}
                  onClick={() => void (pushActive ? disablePush() : enablePush())}
                  className="shrink-0 rounded-lg bg-app-blue px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-app-blue-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pushBusy ? "Working…" : pushActive ? "Disable" : "Enable"}
                </button>
              </div>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
