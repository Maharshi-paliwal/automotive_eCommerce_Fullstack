self.addEventListener("push", (event) => {
  let payload = {};
  try {
    const parsed = event.data ? event.data.json() : {};
    if (parsed && typeof parsed === "object") payload = parsed;
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : "TorqueNest notification";
  const body = typeof payload.message === "string" ? payload.message : "You have a new notification.";
  const notificationId = typeof payload.notificationId === "string" ? payload.notificationId : "";
  const type = typeof payload.type === "string" ? payload.type : "UNKNOWN";
  const rawTarget = typeof payload.navigationTarget === "string" ? payload.navigationTarget : "/admin";
  let target = "/admin";
  try {
    const url = new URL(rawTarget, self.location.origin);
    if (url.origin === self.location.origin && rawTarget.startsWith("/") && !rawTarget.startsWith("//")) {
      const path = url.pathname.startsWith("/admin/complaints/") ? "/admin" : url.pathname;
      if (["/admin", "/admin/inventory", "/admin/orders"].includes(path)) {
        target = `${path}${url.search}${url.hash}`;
      }
    }
  } catch {
    target = "/admin";
  }

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: notificationId || undefined,
    data: { notificationId, type, target },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawTarget = event.notification.data && typeof event.notification.data.target === "string"
    ? event.notification.data.target
    : "/admin";
  let target = "/admin";
  try {
    const url = new URL(rawTarget, self.location.origin);
    if (url.origin === self.location.origin && rawTarget.startsWith("/") && !rawTarget.startsWith("//")) {
      const path = url.pathname.startsWith("/admin/complaints/") ? "/admin" : url.pathname;
      if (["/admin", "/admin/inventory", "/admin/orders"].includes(path)) {
        target = `${path}${url.search}${url.hash}`;
      }
    }
  } catch {
    target = "/admin";
  }

  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      return existing.navigate(target).then(() => existing.focus());
    }
    return self.clients.openWindow(target);
  }));
});
