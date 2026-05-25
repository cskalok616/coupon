const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

process.stdout.write([
  "Generated VAPID keys for coupon web push:",
  "",
  `WEB_PUSH_VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `WEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}`,
  "",
  "Suggested next steps:",
  "1. Copy these values into functions/.env",
  "2. Keep the private key out of the repository",
  "3. Deploy the backend service to Render",
  "4. Fill webPushRuntimeConfig.apiBaseUrl in index.html",
  ""
].join("\n"));