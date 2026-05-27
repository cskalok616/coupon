const CACHE_NAME = "voucher-app-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./app icon.jpg",
  "./banner.jpg",
  "./MPay.webp",
  "./UePay.webp",
  "./boc.webp",
  "./icbc.webp",
  "./luso.webp",
  "./tfb.webp",
  "./gdb.webp",
  "./alipay.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});

function normalizeNotificationPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    title: typeof source.title === "string" && source.title ? source.title : "消費券提醒",
    body: typeof source.body === "string" ? source.body : "你有一則新的提醒。",
    tag: typeof source.tag === "string" && source.tag ? source.tag : "voucher-reminder",
    url: typeof source.url === "string" && source.url ? source.url : "./",
    icon: typeof source.icon === "string" && source.icon ? source.icon : "./icon-192.png",
    badge: typeof source.badge === "string" && source.badge ? source.badge : "./icon-192.png"
  };
}

function showAppNotification(payload) {
  const notification = normalizeNotificationPayload(payload);
  return self.registration.showNotification(notification.title, {
    body: notification.body,
    tag: notification.tag,
    icon: notification.icon,
    badge: notification.badge,
    data: {
      url: notification.url
    }
  });
}

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = {
        body: event.data.text()
      };
    }
  }
  event.waitUntil(showAppNotification(payload));
});

self.addEventListener("message", (event) => {
  const data = event.data && typeof event.data === "object" ? event.data : null;
  if (!data || (data.type !== "SHOW_LOCAL_NOTIFICATION_TEST" && data.type !== "SHOW_APP_NOTIFICATION")) {
    return;
  }
  event.waitUntil(showAppNotification(data.payload));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
