# 📡 GAS API 文件

## 端點
`POST https://script.google.com/macros/s/{ID}/exec`

## Actions

| Action | 說明 |
|--------|------|
| `test` | 測試連線 |
| `uploadToPhotos` | 上傳圖片 |
| `createIllustrationBook` | 建立圖鑑 |
| `sendNotification` | LINE 通知 |
| `fullProcess` | 完整流程 |

## 請求範例

```json
{
  "secret": "your-secret",
  "action": "fullProcess",
  "subject": "主題描述",
  "model": "Gemini 2.0 Flash",
  "styles": [{"name": "皮克斯 3D", "icon": "🎬"}],
  "images": [{"style": "皮克斯 3D", "data": "base64..."}],
  "options": {
    "photos": true,
    "book": true,
    "notification": true
  }
}
```

## 回應範例

```json
{
  "success": true,
  "message": "✅ 完整流程執行完成",
  "summary": {
    "folderUrl": "https://drive.google.com/...",
    "docUrl": "https://docs.google.com/..."
  }
}
```
