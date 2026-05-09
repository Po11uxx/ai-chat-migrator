/**
 * Background Service Worker
 * 处理 popup 和 content script 之间的跨域通信
 */

// 监听来自 popup 的消息，转发给当前活跃 tab 的 content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'content') {
    // 获取当前活跃 tab 并转发消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: '未找到活跃标签页' });
        return;
      }

      const tabId = tabs[0].id;
      const message = { ...request };
      delete message.target;

      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: '无法连接到页面，请刷新后重试'
          });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // 保持消息通道开放
  }
});
