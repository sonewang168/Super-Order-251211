# 🚀 部署教學

## 1. 取得 Gemini API Key

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 點擊「Create API Key」
3. 複製 API Key

## 2. 部署 GAS 後端（雲端功能）

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
3. 存取權：所有人
4. 複製部署 URL

## 3. 設定前端
1. 開啟 `index.html`
2. 進入設定頁
3. 填入 API Key 和 GAS URL

## 4. LINE 通知設定（選用）

1. 前往 [LINE Developers](https://developers.line.biz/)
2. 建立 Messaging API Channel
3. 取得 Channel Access Token
4. 填入 GAS CONFIG
