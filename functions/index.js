require("dotenv").config();

const crypto = require("node:crypto");
const cors = require("cors");
const express = require("express");
const webpush = require("web-push");

const app = express();
const corsMiddleware = cors({ origin: true });

const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.WEB_PUSH_SUBJECT || "mailto:admin@example.com";
const appBaseUrl = process.env.APP_BASE_URL || "https://cskalok616.github.io/coupon/";
const databaseUrl = (process.env.FIREBASE_DATABASE_URL || "https://coupon-62219-default-rtdb.asia-southeast1.firebasedatabase.app/").replace(/\/$/, "");
const port = Number(process.env.PORT || 3000);

const PUSH_SUBSCRIPTIONS_ROOT = "voucher_push/subscriptions";
const PUSH_DELIVERY_LOG_ROOT = "voucher_push/delivery_logs";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

app.use(corsMiddleware);
app.use(express.json({ limit: "256kb" }));

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function sanitizeUserId(value) {
  return String(value || "").trim();
}

function normalizeSubscription(input) {
  const source = input && typeof input === "object" ? input : {};
  const keys = source.keys && typeof source.keys === "object" ? source.keys : {};
  return {
    endpoint: typeof source.endpoint === "string" ? source.endpoint.trim() : "",
    expirationTime: source.expirationTime || null,
    keys: {
      p256dh: typeof keys.p256dh === "string" ? keys.p256dh : "",
      auth: typeof keys.auth === "string" ? keys.auth : ""
    }
  };
}

function validateSubscription(subscription) {
  return Boolean(
    subscription.endpoint
      && subscription.keys
      && subscription.keys.p256dh
      && subscription.keys.auth
  );
}

function createSubscriptionId(endpoint) {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

function pushConfigReady() {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}

function buildNotificationPayload(body) {
  const source = body && typeof body === "object" ? body : {};
  return {
    title: typeof source.title === "string" && source.title ? source.title : "消費券提醒",
    body: typeof source.body === "string" && source.body ? source.body : "你有一則新的消費券提醒。",
    tag: typeof source.tag === "string" && source.tag ? source.tag : "coupon-web-push",
    url: typeof source.url === "string" && source.url ? source.url : appBaseUrl,
    icon: typeof source.icon === "string" && source.icon ? source.icon : `${appBaseUrl}icon-192.png`,
    badge: typeof source.badge === "string" && source.badge ? source.badge : `${appBaseUrl}icon-192.png`
  };
}

function getDatabaseEndpoint(path) {
  return `${databaseUrl}/${String(path || "").replace(/^\/+|\/+$/g, "")}.json`;
}

async function databaseRequest(path, options) {
  const response = await fetch(getDatabaseEndpoint(path), Object.assign({
    headers: {
      "Content-Type": "application/json"
    }
  }, options || {}));

  if (!response.ok) {
    const body = await response.text().catch(function () {
      return "";
    });
    throw new Error(body || `database-request-failed-${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(function () {
    return null;
  });
}

function databaseGet(path) {
  return databaseRequest(path, { method: "GET" });
}

function databasePut(path, payload) {
  return databaseRequest(path, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

function databasePost(path, payload) {
  return databaseRequest(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function databaseDelete(path) {
  return databaseRequest(path, { method: "DELETE" });
}

app.get("/healthz", function (request, response) {
  sendJson(response, 200, {
    ok: true,
    pushReady: pushConfigReady(),
    databaseUrlConfigured: Boolean(databaseUrl)
  });
});

app.get("/getWebPushConfig", function (request, response) {
  sendJson(response, 200, {
    ok: true,
    vapidPublicKey,
    pushReady: pushConfigReady(),
    appBaseUrl,
    databaseUrlConfigured: Boolean(databaseUrl)
  });
});

app.post("/subscribeWebPush", async function (request, response) {
  try {
    const userId = sanitizeUserId(request.body && request.body.userId);
    const subscription = normalizeSubscription(request.body && request.body.subscription);

    if (!userId) {
      sendJson(response, 400, { ok: false, error: "missing-user-id" });
      return;
    }
    if (!validateSubscription(subscription)) {
      sendJson(response, 400, { ok: false, error: "invalid-subscription" });
      return;
    }

    const subscriptionId = createSubscriptionId(subscription.endpoint);
    const subscriptionPath = `${PUSH_SUBSCRIPTIONS_ROOT}/${userId}/${subscriptionId}`;
    const existingRecord = await databaseGet(subscriptionPath);
    const timestamp = Date.now();

    await databasePut(subscriptionPath, {
      userId,
      subscription,
      platform: typeof request.body.platform === "string" ? request.body.platform : "ios-pwa",
      userAgent: typeof request.body.userAgent === "string" ? request.body.userAgent : "",
      enabled: true,
      updatedAt: timestamp,
      createdAt: existingRecord && existingRecord.createdAt ? existingRecord.createdAt : timestamp
    });

    sendJson(response, 200, {
      ok: true,
      subscriptionId,
      pushReady: pushConfigReady()
    });
  } catch (error) {
    console.error("subscribeWebPush failed", error);
    sendJson(response, 500, {
      ok: false,
      error: error && error.message ? error.message : "internal-error"
    });
  }
});

app.post("/sendWebPushTest", async function (request, response) {
  try {
    if (!pushConfigReady()) {
      sendJson(response, 503, { ok: false, error: "push-config-not-ready" });
      return;
    }

    const userId = sanitizeUserId(request.body && request.body.userId);
    if (!userId) {
      sendJson(response, 400, { ok: false, error: "missing-user-id" });
      return;
    }

    const subscriptions = await databaseGet(`${PUSH_SUBSCRIPTIONS_ROOT}/${userId}`) || {};
    const entries = Object.entries(subscriptions).filter(function (entry) {
      return entry[1] && entry[1].enabled && entry[1].subscription;
    });

    if (!entries.length) {
      sendJson(response, 404, { ok: false, error: "no-active-subscription" });
      return;
    }

    const payload = buildNotificationPayload(request.body && request.body.notification);
    const results = [];

    for (const [subscriptionId, record] of entries) {
      try {
        await webpush.sendNotification(record.subscription, JSON.stringify(payload));
        await databasePost(`${PUSH_DELIVERY_LOG_ROOT}/${userId}/${subscriptionId}`, {
          type: "test",
          tag: payload.tag,
          sentAt: Date.now(),
          title: payload.title
        });
        results.push({ subscriptionId, ok: true });
      } catch (error) {
        console.error("sendWebPushTest failed", { userId, subscriptionId, error });
        const statusCode = error && error.statusCode ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await databaseDelete(`${PUSH_SUBSCRIPTIONS_ROOT}/${userId}/${subscriptionId}`);
        }
        results.push({
          subscriptionId,
          ok: false,
          error: error && error.message ? error.message : "push-send-failed"
        });
      }
    }

    sendJson(response, 200, {
      ok: results.some(function (item) {
        return item.ok;
      }),
      results
    });
  } catch (error) {
    console.error("sendWebPushTest request failed", error);
    sendJson(response, 500, {
      ok: false,
      error: error && error.message ? error.message : "internal-error"
    });
  }
});

app.use(function (request, response) {
  sendJson(response, 404, {
    ok: false,
    error: "not-found"
  });
});

if (require.main === module) {
  app.listen(port, function () {
    console.log(`coupon-web-push-backend listening on ${port}`);
  });
}

module.exports = app;