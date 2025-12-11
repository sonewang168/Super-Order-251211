// ============================================
// 🎨 超級指令插畫生成器 - GAS 後端 v2.1
// ============================================
// 
// 【功能】
// ✅ 上傳圖片到 Google 相簿（相簿：超級指令插畫圖鑑）
// ✅ 建立圖文並茂 Google Doc 圖鑑
// ✅ 發送 LINE 完成通知
// ✅ 完整流程一次執行
// 
// 【部署步驟】
// 1. 前往 https://script.google.com 建立新專案
// 2. 貼上此程式碼
// 3. 修改下方設定區
// 4. 點擊「appsscript.json」加入 OAuth scope（見下方說明）
// 5. 部署為網頁應用程式
// 
// 【重要】appsscript.json 設定
// 點擊左側「專案設定」→ 勾選「在編輯器中顯示 appsscript.json」
// 然後修改 appsscript.json 加入：
// {
//   "timeZone": "Asia/Taipei",
//   "dependencies": {},
//   "exceptionLogging": "STACKDRIVER",
//   "runtimeVersion": "V8",
//   "oauthScopes": [
//     "https://www.googleapis.com/auth/script.external_request",
//     "https://www.googleapis.com/auth/photoslibrary",
//     "https://www.googleapis.com/auth/photoslibrary.appendonly",
//     "https://www.googleapis.com/auth/photoslibrary.sharing",
//     "https://www.googleapis.com/auth/documents",
//     "https://www.googleapis.com/auth/drive"
//   ]
// }
// 
// ============================================

// ============================================
// 🔧 設定區 - 請修改這裡
// ============================================

const CONFIG = {
  // 安全密鑰
  SECURITY_SECRET: 'your-secret-key-here',
  
  // LINE Messaging API
  LINE_CHANNEL_ACCESS_TOKEN: 'your-line-channel-access-token',
  LINE_USER_ID: 'your-line-user-id',
  
  // Google 相簿設定
  PHOTOS_ALBUM_NAME: '超級指令插畫圖鑑',
  
  // Google Doc 設定
  DOC_TITLE_PREFIX: '超級指令插畫圖鑑',
  DOCS_FOLDER_NAME: '插畫圖鑑收藏'
};

// ============================================
// 🌐 Web App 入口
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 驗證安全密鑰
    if (data.secret !== CONFIG.SECURITY_SECRET) {
      return jsonResponse({ success: false, error: '🔒 安全密鑰錯誤' });
    }
    
    const action = data.action;
    
    switch (action) {
      case 'uploadToPhotos':
        return handleUploadToPhotos(data);
      case 'createIllustrationBook':
        return handleCreateIllustrationBook(data);
      case 'sendNotification':
        return handleSendNotification(data);
      case 'fullProcess':
        return handleFullProcess(data);
      case 'test':
        return handleTest(data);
      default:
        return jsonResponse({ success: false, error: '未知的操作: ' + action });
    }
    
  } catch (error) {
    console.error('doPost 錯誤:', error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ 
    success: true, 
    message: '🎨 超級指令插畫生成器 GAS 後端 v2.0',
    timestamp: new Date().toISOString(),
    actions: [
      'uploadToPhotos - 上傳到 Google 相簿',
      'createIllustrationBook - 建立插畫圖鑑',
      'sendNotification - 發送 LINE 通知',
      'fullProcess - 完整流程'
    ]
  });
}

// ============================================
// 📷 上傳到 Google 相簿
// ============================================

function handleUploadToPhotos(data) {
  const images = data.images || [];
  
  if (images.length === 0) {
    return jsonResponse({ success: false, error: '沒有圖片資料' });
  }
  
  try {
    // 取得或建立相簿
    const albumId = getOrCreateAlbum(CONFIG.PHOTOS_ALBUM_NAME);
    
    if (!albumId) {
      return jsonResponse({ success: false, error: '無法建立相簿' });
    }
    
    const uploadedItems = [];
    const uploadTokens = [];
    
    // Step 1: 上傳每張圖片取得 upload token
    images.forEach((img, index) => {
      const fileName = `${img.style || 'illustration'}_${String(index + 1).padStart(2, '0')}.png`;
      
      try {
        const uploadToken = uploadImageBytes(img.data, fileName);
        if (uploadToken) {
          uploadTokens.push({
            token: uploadToken,
            fileName: fileName,
            style: img.style,
            description: img.style || '超級指令插畫'
          });
        }
      } catch (e) {
        console.error('上傳圖片失敗:', e);
      }
    });
    
    // Step 2: 批次建立 media items 到相簿
    if (uploadTokens.length > 0) {
      const createdItems = batchCreateMediaItems(albumId, uploadTokens);
      uploadedItems.push(...createdItems);
    }
    
    // 取得相簿分享連結
    const albumUrl = `https://photos.google.com/album/${albumId}`;
    
    return jsonResponse({
      success: true,
      message: `✅ 已上傳 ${uploadedItems.length} 張圖片到「${CONFIG.PHOTOS_ALBUM_NAME}」`,
      albumName: CONFIG.PHOTOS_ALBUM_NAME,
      albumId: albumId,
      albumUrl: albumUrl,
      items: uploadedItems,
      totalCount: uploadedItems.length
    });
    
  } catch (error) {
    console.error('上傳圖片錯誤:', error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ============================================
// 📷 Google Photos API 輔助函數
// ============================================

// 取得或建立相簿
function getOrCreateAlbum(albumTitle) {
  const token = ScriptApp.getOAuthToken();
  
  // 先搜尋現有相簿
  try {
    const listResponse = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    
    const listData = JSON.parse(listResponse.getContentText());
    
    if (listData.albums) {
      for (const album of listData.albums) {
        if (album.title === albumTitle) {
          console.log('找到現有相簿:', album.id);
          return album.id;
        }
      }
    }
  } catch (e) {
    console.error('搜尋相簿錯誤:', e);
  }
  
  // 建立新相簿
  try {
    const createResponse = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/albums', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        album: { title: albumTitle }
      }),
      muteHttpExceptions: true
    });
    
    const createData = JSON.parse(createResponse.getContentText());
    
    if (createData.id) {
      console.log('建立新相簿:', createData.id);
      return createData.id;
    }
  } catch (e) {
    console.error('建立相簿錯誤:', e);
  }
  
  return null;
}

// 上傳圖片位元組，取得 upload token
function uploadImageBytes(base64Data, fileName) {
  const token = ScriptApp.getOAuthToken();
  
  try {
    const imageBytes = Utilities.base64Decode(base64Data);
    
    const response = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/uploads', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-File-Name': fileName,
        'X-Goog-Upload-Protocol': 'raw'
      },
      payload: imageBytes,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      return response.getContentText();
    } else {
      console.error('上傳失敗:', response.getContentText());
      return null;
    }
  } catch (e) {
    console.error('上傳錯誤:', e);
    return null;
  }
}

// 批次建立 media items
function batchCreateMediaItems(albumId, uploadTokens) {
  const token = ScriptApp.getOAuthToken();
  const createdItems = [];
  
  // 每次最多 50 個
  const batchSize = 50;
  
  for (let i = 0; i < uploadTokens.length; i += batchSize) {
    const batch = uploadTokens.slice(i, i + batchSize);
    
    const newMediaItems = batch.map(item => ({
      description: item.description,
      simpleMediaItem: {
        uploadToken: item.token,
        fileName: item.fileName
      }
    }));
    
    try {
      const response = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          albumId: albumId,
          newMediaItems: newMediaItems
        }),
        muteHttpExceptions: true
      });
      
      const data = JSON.parse(response.getContentText());
      
      if (data.newMediaItemResults) {
        data.newMediaItemResults.forEach((result, index) => {
          if (result.status && result.status.message === 'Success') {
            createdItems.push({
              id: result.mediaItem.id,
              productUrl: result.mediaItem.productUrl,
              fileName: batch[index].fileName,
              style: batch[index].style
            });
          }
        });
      }
    } catch (e) {
      console.error('批次建立錯誤:', e);
    }
  }
  
  return createdItems;
}

// 分享相簿（取得分享連結）
function shareAlbum(albumId) {
  const token = ScriptApp.getOAuthToken();
  
  try {
    const response = UrlFetchApp.fetch(`https://photoslibrary.googleapis.com/v1/albums/${albumId}:share`, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        sharedAlbumOptions: {
          isCollaborative: false,
          isCommentable: true
        }
      }),
      muteHttpExceptions: true
    });
    
    const data = JSON.parse(response.getContentText());
    return data.shareInfo?.shareableUrl || null;
  } catch (e) {
    console.error('分享相簿錯誤:', e);
    return null;
  }
}

// ============================================
// 📚 建立插畫圖鑑（圖文並茂版）
// ============================================

function handleCreateIllustrationBook(data) {
  const subject = data.subject || '未命名主題';
  const images = data.images || [];
  const styles = data.styles || [];
  const model = data.model || 'Gemini';
  const folderUrl = data.albumUrl || '';
  
  try {
    // 取得或建立資料夾
    const mainFolder = getOrCreateFolder(CONFIG.DOCS_FOLDER_NAME);
    
    // 建立文件名稱
    const timestamp = formatDateTime(new Date());
    const docName = `${CONFIG.DOC_TITLE_PREFIX}_${timestamp}`;
    
    // 建立 Google Doc
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();
    
    // 設定頁面邊距
    body.setMarginTop(36);
    body.setMarginBottom(36);
    body.setMarginLeft(36);
    body.setMarginRight(36);
    
    // ====== 封面標題 ======
    const titlePara = body.appendParagraph('🎨 超級指令插畫圖鑑');
    titlePara.setHeading(DocumentApp.ParagraphHeading.TITLE);
    titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titlePara.setForegroundColor('#1a1a2e');
    
    body.appendParagraph('');
    
    // 裝飾線
    const decorLine1 = body.appendParagraph('✦ ═══════════════════════════════ ✦');
    decorLine1.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    decorLine1.setForegroundColor('#6c5ce7');
    
    body.appendParagraph('');
    
    // ====== 主題描述區塊 ======
    const subjectTitle = body.appendParagraph('📝 創作主題');
    subjectTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    subjectTitle.setForegroundColor('#2d3436');
    
    // 主題內容框
    const subjectTable = body.appendTable([[subject]]);
    const subjectCell = subjectTable.getRow(0).getCell(0);
    subjectCell.setBackgroundColor('#f8f9fa');
    subjectCell.setPaddingTop(16);
    subjectCell.setPaddingBottom(16);
    subjectCell.setPaddingLeft(20);
    subjectCell.setPaddingRight(20);
    subjectCell.getChild(0).asParagraph().setFontSize(12).setLineSpacing(1.5);
    
    body.appendParagraph('');
    
    // ====== 生成資訊 ======
    const infoTitle = body.appendParagraph('📊 生成資訊');
    infoTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    infoTitle.setForegroundColor('#2d3436');
    
    const infoData = [
      ['🤖 AI 模型', model],
      ['🎭 風格數量', styles.length + ' 種'],
      ['🖼️ 圖片總數', images.length + ' 張'],
      ['⏰ 生成時間', formatDateTime(new Date(), true)]
    ];
    
    const infoTable = body.appendTable(infoData);
    styleInfoTable(infoTable);
    
    body.appendParagraph('');
    
    // ====== 使用風格列表 ======
    const stylesTitle = body.appendParagraph('🎭 使用的藝術風格');
    stylesTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    stylesTitle.setForegroundColor('#2d3436');
    
    // 風格標籤雲
    let styleText = '';
    styles.forEach((style, index) => {
      styleText += (style.icon || '🎨') + ' ' + style.name;
      if (index < styles.length - 1) styleText += '  •  ';
    });
    
    const stylesPara = body.appendParagraph(styleText);
    stylesPara.setForegroundColor('#6c5ce7');
    stylesPara.setFontSize(11);
    stylesPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    body.appendParagraph('');
    
    // 分隔線
    const divider1 = body.appendParagraph('─'.repeat(60));
    divider1.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    divider1.setForegroundColor('#dfe6e9');
    
    body.appendParagraph('');
    
    // ====== 插畫展示區 ======
    const galleryTitle = body.appendParagraph('🖼️ 插畫展示');
    galleryTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    galleryTitle.setForegroundColor('#2d3436');
    
    body.appendParagraph('');
    
    // 逐一展示每張圖片
    images.forEach((img, index) => {
      // 風格標題
      const styleHeader = body.appendParagraph(`【 ${img.style || '風格 ' + (index + 1)} 】`);
      styleHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      styleHeader.setForegroundColor('#0984e3');
      styleHeader.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      
      // 插入圖片
      if (img.data) {
        try {
          const blob = Utilities.newBlob(
            Utilities.base64Decode(img.data),
            'image/png',
            `illustration_${index + 1}.png`
          );
          
          const image = body.appendImage(blob);
          
          // 調整圖片大小（最大寬度 450px，保持比例）
          const maxWidth = 450;
          const originalWidth = image.getWidth();
          const originalHeight = image.getHeight();
          
          if (originalWidth > maxWidth) {
            const ratio = maxWidth / originalWidth;
            image.setWidth(maxWidth);
            image.setHeight(originalHeight * ratio);
          }
          
          // 圖片置中
          const imgPara = image.getParent().asParagraph();
          imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          
        } catch (e) {
          const errorPara = body.appendParagraph('⚠️ 圖片載入失敗');
          errorPara.setForegroundColor('#e74c3c');
          errorPara.setItalic(true);
          errorPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        }
      }
      
      // 圖片說明
      if (img.desc) {
        const captionPara = body.appendParagraph(img.desc);
        captionPara.setFontSize(10);
        captionPara.setForegroundColor('#636e72');
        captionPara.setItalic(true);
        captionPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
      
      body.appendParagraph('');
      
      // 圖片之間的分隔
      if (index < images.length - 1) {
        const imgDivider = body.appendParagraph('• • •');
        imgDivider.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        imgDivider.setForegroundColor('#b2bec3');
        body.appendParagraph('');
      }
    });
    
    // ====== 頁尾 ======
    body.appendParagraph('');
    
    const footerLine = body.appendParagraph('✦ ═══════════════════════════════ ✦');
    footerLine.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    footerLine.setForegroundColor('#6c5ce7');
    
    body.appendParagraph('');
    
    // 相簿連結
    if (folderUrl) {
      const albumLink = body.appendParagraph('📁 圖片相簿：' + folderUrl);
      albumLink.setFontSize(10);
      albumLink.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      albumLink.setForegroundColor('#0984e3');
      body.appendParagraph('');
    }
    
    // 版權資訊
    const copyright = body.appendParagraph(
      '由「🎨 超級指令插畫生成器 Pro」自動生成\n' +
      '© ' + new Date().getFullYear() + ' Made with ❤️ and AI'
    );
    copyright.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    copyright.setFontSize(9);
    copyright.setForegroundColor('#b2bec3');
    
    // 移動文件到資料夾
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(mainFolder);
    
    // 設定為可分享
    docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const docUrl = doc.getUrl();
    
    return jsonResponse({
      success: true,
      message: `✅ 插畫圖鑑「${docName}」已建立`,
      docName: docName,
      docUrl: docUrl,
      docId: doc.getId(),
      imageCount: images.length,
      styleCount: styles.length
    });
    
  } catch (error) {
    console.error('建立圖鑑錯誤:', error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ============================================
// 💬 發送 LINE 通知
// ============================================

function handleSendNotification(data) {
  const customMessage = data.message;
  const results = data.results || {};
  
  if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN || CONFIG.LINE_CHANNEL_ACCESS_TOKEN === 'your-line-channel-access-token') {
    return jsonResponse({ success: false, error: 'LINE Channel Access Token 未設定' });
  }
  
  if (!CONFIG.LINE_USER_ID || CONFIG.LINE_USER_ID === 'your-line-user-id') {
    return jsonResponse({ success: false, error: 'LINE User ID 未設定' });
  }
  
  try {
    let message = customMessage;
    
    // 如果沒有自訂訊息，使用預設格式
    if (!message) {
      message = buildNotificationMessage(data, results);
    }
    
    const payload = {
      to: CONFIG.LINE_USER_ID,
      messages: [{
        type: 'text',
        text: message
      }]
    };
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return jsonResponse({ 
        success: true, 
        message: '✅ LINE 通知已發送'
      });
    } else {
      const result = JSON.parse(response.getContentText());
      return jsonResponse({ 
        success: false, 
        error: result.message || 'LINE API 回應碼: ' + responseCode 
      });
    }
    
  } catch (error) {
    console.error('LINE 通知錯誤:', error);
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// 建立通知訊息
function buildNotificationMessage(data, results) {
  const subject = data.subject || '未命名主題';
  const images = data.images || [];
  const styles = data.styles || [];
  const model = data.model || 'Gemini';
  
  let message = `
╔══════════════════════════════╗
║  🎨 超級指令插畫生成完成！  ║
╚══════════════════════════════╝

📝 創作主題
${subject.substring(0, 60)}${subject.length > 60 ? '...' : ''}

📊 生成統計
┣━ 🖼️ 圖片數量：${images.length} 張
┣━ 🎭 風格種類：${styles.length} 種
┗━ 🤖 使用模型：${model}

⏰ 完成時間
${formatDateTime(new Date(), true)}`;

  // 加入連結
  if (results.photos && results.photos.success) {
    message += `

📷 相簿位置
${results.photos.albumUrl}`;
  }
  
  if (results.book && results.book.success) {
    message += `

📚 插畫圖鑑
${results.book.docUrl}`;
  }

  message += `

✨ 感謝使用超級指令插畫生成器！`;

  return message;
}

// ============================================
// 🔄 完整流程
// ============================================

function handleFullProcess(data) {
  const results = {
    photos: null,
    book: null,
    notification: null
  };
  
  const options = data.options || { photos: true, book: true, notification: true };
  const startTime = new Date();
  
  console.log('🚀 開始完整流程...');
  
  // Step 1: 上傳到相簿
  if (options.photos !== false) {
    console.log('📷 Step 1: 上傳到相簿...');
    try {
      const photosResult = handleUploadToPhotos(data);
      results.photos = JSON.parse(photosResult.getContent());
      
      // 傳遞相簿 URL 給後續步驟
      if (results.photos.success) {
        data.albumUrl = results.photos.albumUrl;
      }
    } catch (e) {
      results.photos = { success: false, error: e.toString() };
    }
  }
  
  // Step 2: 建立插畫圖鑑
  if (options.book !== false) {
    console.log('📚 Step 2: 建立插畫圖鑑...');
    try {
      const bookResult = handleCreateIllustrationBook(data);
      results.book = JSON.parse(bookResult.getContent());
    } catch (e) {
      results.book = { success: false, error: e.toString() };
    }
  }
  
  // Step 3: 發送 LINE 通知
  if (options.notification !== false) {
    console.log('💬 Step 3: 發送 LINE 通知...');
    
    // 將結果傳給通知函數
    data.results = results;
    
    try {
      const notifyResult = handleSendNotification(data);
      results.notification = JSON.parse(notifyResult.getContent());
    } catch (e) {
      results.notification = { success: false, error: e.toString() };
    }
  }
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  
  console.log('✅ 完整流程完成，耗時 ' + duration + ' 秒');
  
  // 統計成功數
  let successCount = 0;
  let totalCount = 0;
  
  Object.keys(results).forEach(key => {
    if (results[key]) {
      totalCount++;
      if (results[key].success) successCount++;
    }
  });
  
  return jsonResponse({
    success: successCount === totalCount,
    message: `✅ 完整流程執行完成 (${successCount}/${totalCount} 成功)`,
    duration: duration + ' 秒',
    results: results,
    summary: {
      photosUploaded: results.photos?.success ? results.photos.totalCount : 0,
      bookCreated: results.book?.success ? true : false,
      notificationSent: results.notification?.success ? true : false,
      albumUrl: results.photos?.albumUrl || null,
      docUrl: results.book?.docUrl || null
    }
  });
}

// ============================================
// 🧪 測試功能
// ============================================

function handleTest(data) {
  return jsonResponse({
    success: true,
    message: '🎨 連線測試成功！',
    timestamp: new Date().toISOString(),
    config: {
      albumName: CONFIG.PHOTOS_ALBUM_NAME,
      docTitlePrefix: CONFIG.DOC_TITLE_PREFIX,
      lineConfigured: CONFIG.LINE_CHANNEL_ACCESS_TOKEN !== 'your-line-channel-access-token'
    }
  });
}

// ============================================
// 🛠️ 工具函數
// ============================================

function getOrCreateFolder(name, parent) {
  let folder;
  
  if (parent) {
    const folders = parent.getFoldersByName(name);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = parent.createFolder(name);
    }
  } else {
    const folders = DriveApp.getFoldersByName(name);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(name);
    }
  }
  
  return folder;
}

function styleInfoTable(table) {
  table.setBorderWidth(0);
  
  for (let i = 0; i < table.getNumRows(); i++) {
    const row = table.getRow(i);
    
    // 標題欄
    const labelCell = row.getCell(0);
    labelCell.setBackgroundColor('#f8f9fa');
    labelCell.setPaddingTop(10);
    labelCell.setPaddingBottom(10);
    labelCell.setPaddingLeft(16);
    labelCell.setPaddingRight(16);
    labelCell.setWidth(120);
    labelCell.getChild(0).asParagraph().setBold(true).setFontSize(11);
    
    // 內容欄
    const valueCell = row.getCell(1);
    valueCell.setBackgroundColor('#ffffff');
    valueCell.setPaddingTop(10);
    valueCell.setPaddingBottom(10);
    valueCell.setPaddingLeft(16);
    valueCell.setPaddingRight(16);
    valueCell.getChild(0).asParagraph().setFontSize(11);
  }
}

function formatDateTime(date, detailed) {
  if (detailed) {
    return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  }
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd_HH-mm');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 🧪 本地測試函數（在 GAS 編輯器中執行）
// ============================================

function testConnection() {
  console.log('🔗 測試連線...');
  const result = handleTest({});
  console.log(JSON.parse(result.getContent()));
}

function testSendLineNotification() {
  console.log('💬 測試 LINE 通知...');
  
  const result = handleSendNotification({
    message: `
🎨 超級指令插畫生成器測試通知

這是一則測試訊息。
如果您收到這則訊息，表示 LINE 通知功能正常運作！

⏰ ${formatDateTime(new Date(), true)}`
  });
  
  console.log(JSON.parse(result.getContent()));
}

function testCreateBook() {
  console.log('📚 測試建立圖鑑...');
  
  const result = handleCreateIllustrationBook({
    subject: '一隻戴著復古飛行員風鏡的柯基犬，坐在一架舊式雙翼飛機的開放式駕駛艙裡，背景是雲海和夕陽。',
    model: 'Gemini 2.0 Flash',
    styles: [
      { name: '皮克斯 3D', icon: '🎬' },
      { name: '吉卜力', icon: '🌿' },
      { name: '水彩', icon: '💧' }
    ],
    images: [
      { style: '皮克斯 3D', desc: '高品質 3D 動畫風格' },
      { style: '吉卜力', desc: '宮崎駿風格水彩動畫' },
      { style: '水彩', desc: '輕柔透明水彩畫風' }
    ]
  });
  
  console.log(JSON.parse(result.getContent()));
}

function testFullProcess() {
  console.log('🔄 測試完整流程（不含圖片）...');
  
  const result = handleFullProcess({
    subject: '測試主題：一隻可愛的柴犬在櫻花樹下',
    model: 'Gemini 2.0 Flash',
    styles: [
      { name: '皮克斯 3D', icon: '🎬' },
      { name: '吉卜力', icon: '🌿' }
    ],
    images: [
      { style: '皮克斯 3D' },
      { style: '吉卜力' }
    ],
    options: {
      photos: false,  // 跳過上傳（沒有實際圖片數據）
      book: true,
      notification: true
    }
  });
  
  console.log(JSON.parse(result.getContent()));
}
