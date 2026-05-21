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
# CouponAPP
