# 消費券記錄 App

這個版本已整理成可直接部署到 GitHub Pages 的靜態網站與 PWA。

## 內容

- `index.html`：主頁面
- `manifest.webmanifest`：PWA 設定
- `sw.js`：Service Worker
- `404.html`：GitHub Pages 找不到頁面時回跳首頁
- `.nojekyll`：避免 GitHub Pages 用 Jekyll 處理靜態檔
- `.gitignore`：忽略系統檔
- `.github/workflows/deploy-pages.yml`：推送到 `main` 後自動部署到 GitHub Pages

## 目前狀態

這個資料夾目前還不是 git repository，所以第一次上傳前要先初始化 git。

## 第一次上傳到 GitHub

在這個資料夾內執行：

```bash
git init
git branch -M main
git add .
git commit -m "Initial GitHub Pages version"
git remote add origin <你的 GitHub repository URL>
git push -u origin main
```

## 啟用 GitHub Pages

1. 到 GitHub repository 的 `Settings > Pages`。
2. 在 `Build and deployment` 選 `GitHub Actions`。
3. 之後每次 push 到 `main`，GitHub 都會自動部署。

## 部署後特性

- 可直接作為靜態網站運行
- 支援 PWA 安裝
- Service Worker 會快取核心殼層資源
- 使用 ASCII 圖片檔名，較適合 GitHub Pages 與一般靜態主機

## 注意

- PWA 需要在 `https` 或 GitHub Pages 網址下使用，不能直接開本機 `file://` 安裝。
- Firebase 仍使用目前頁面中的設定，不需要另外改路徑。
- 如果之後更換 repository 名稱或放到子路徑，可能需要再調整 `manifest.webmanifest` 的 `start_url` 和 `scope`。

## Web Push Backend

這個版本已加入一套最小可用的 Web Push backend，目的只有兩件事：

- 儲存主畫面 PWA 的 push subscription
- 送出一則測試推播

它不會覆寫既有消費券資料，新的推播資料只會寫到獨立的 Realtime Database 路徑：

- `voucher_push/subscriptions`
- `voucher_push/delivery_logs`

### 新增的檔案

- `render.yaml`
- `functions/package.json`
- `functions/index.js`
- `functions/scripts/generate-vapid.js`
- `functions/.env.example`

### Backend 需要的環境變數

在 `functions` 資料夾中建立 `.env`，可先參考 `.env.example`：

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `APP_BASE_URL`
- `FIREBASE_DATABASE_URL`

### 前端還要補的值

在 `index.html` 的 `webPushRuntimeConfig` 中填入：

- `apiBaseUrl`：你的 Render backend base URL
- `vapidPublicKeyOverride`：通常可留空，前端會優先從 `getWebPushConfig` 讀取

### 建議部署步驟

1. 進入 `functions` 後執行 `npm install`。
2. 執行 `npm run generate:vapid` 產生 VAPID 金鑰。
3. 依照 `.env.example` 建立 `functions/.env`，把剛才生成的公私鑰填進去。
4. 到 Render 建立一個新的 Web Service，指向這個 repo，並把 root directory 設為 `functions`。
5. 在 Render 填入環境變數：`WEB_PUSH_VAPID_PUBLIC_KEY`、`WEB_PUSH_VAPID_PRIVATE_KEY`、`WEB_PUSH_SUBJECT`、`APP_BASE_URL`、`FIREBASE_DATABASE_URL`。
6. Render 啟動後，確認 `/healthz` 可回傳 `ok: true`。
7. 把 Render 給你的 backend URL 填回 `index.html` 的 `webPushRuntimeConfig.apiBaseUrl`。
8. 重新部署前端到 GitHub Pages。

### 目前已完成

- 前端 reminder dialog 已有推播狀態區塊
- Service Worker 已能接 `push` / `notificationclick`

- Backend 已提供：
	- `getWebPushConfig`
	- `subscribeWebPush`
	- `sendWebPushTest`

### 目前還未完成

- Cloud Scheduler 自動排程到期提醒
- 後端依照消費券資料自動判斷誰該被提醒
- VAPID 金鑰與 Render backend URL 的正式填值
# CouponAPP
