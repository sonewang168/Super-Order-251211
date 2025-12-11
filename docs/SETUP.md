# 🚀 部署教學

## 1. 取得 Gemini API Key

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 點擊「Create API Key」
3. 複製 API Key

## 2. 設定 Google 相簿（前端 OAuth）

### Step 1：建立 Google Cloud 專案
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊「建立專案」
3. 名稱：`Super-Order-Photos`

### Step 2：啟用 Photos Library API
1. 左側選單 → API 和服務 → 程式庫
2. 搜尋「**Photos Library API**」
3. 點擊「**啟用**」

### Step 3：設定 OAuth 同意畫面
1. 左側選單 → OAuth 同意畫面
2. 用戶類型：**外部**
3. 填寫應用程式名稱
4. 新增測試使用者：**你的 Gmail**
5. 儲存

### Step 4：建立 OAuth 用戶端 ID
1. 左側選單 → 憑證
2. 建立憑證 → **OAuth 用戶端 ID**
3. 應用程式類型：**網頁應用程式**
4. 授權的 JavaScript 來源：
   - `http://localhost` （本機測試）
   - `https://你的網站.netlify.app` （正式部署）
5. 複製 **Client ID**

### Step 5：在 APP 中設定
1. 開啟 `index.html`
2. 進入設定頁 ⚙️
3. 在「Google 相簿」區塊貼上 Client ID
4. 點擊「💾 儲存」
5. 點擊「🔐 授權」
6. 登入 Google 帳號並允許

## 3. 部署 GAS 後端（Doc + LINE）

如需使用「插畫圖鑑 Doc」和「LINE 通知」功能：

### Step 1：建立專案
1. 前往 [Google Apps Script](https://script.google.com)
2. 點擊「新專案」

### Step 2：貼上程式碼
1. 複製 `Code.gs` 內容
2. 貼上到 GAS 編輯器

### Step 3：修改設定
```javascript
const CONFIG = {
  SECURITY_SECRET: 'your-secret-key',      // 自訂密鑰
  LINE_CHANNEL_ACCESS_TOKEN: 'xxx',        // LINE Token
  LINE_USER_ID: 'Uxxx',                    // LINE User ID
};
```

### Step 4：部署
1. 部署 → 新增部署作業
2. 類型：網頁應用程式
3. 執行身分：我
4. 存取權：所有人
5. 複製部署 URL

### Step 5：在 APP 中設定
1. 進入設定頁 ⚙️
2. 在「GAS 後端設定」區塊填入 URL 和密鑰

## 4. LINE 通知設定（選用）

1. 前往 [LINE Developers](https://developers.line.biz/)
2. 建立 Messaging API Channel
3. 取得 Channel Access Token
4. 填入 GAS CONFIG
