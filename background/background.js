/**
 * Background Service Worker
 * - 转发 popup ↔ content script 消息
 * - 调用 Gemini API 生成 AI 摘要
 */

// 按优先级尝试的模型列表（免费额度从高到低）
// gemini-2.5-flash-lite: 最快最便宜，免费额度高
// gemini-2.5-flash: 性价比最佳
// gemini-3.1-flash-lite: 最新一代轻量模型
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite'
];
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * 调用 Gemini API 生成对话摘要
 * @param {string} apiKey - Gemini API Key
 * @param {Array} conversation - 标准格式对话数组
 * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
 */
async function callGeminiSummary(apiKey, conversation) {
  // 将对话拼接为文本
  const conversationText = conversation.map(msg => {
    const role = msg.role === 'user' ? 'User' : 'AI';
    return `[${role}]: ${msg.content}`;
  }).join('\n\n');

  const prompt = `You are a conversation summarizer. Summarize the following AI chat conversation for migration to another AI platform.

Rules:
1. Keep ALL user questions/requests in full — do not shorten them
2. For AI responses, extract only the key points, conclusions, code snippets, and actionable items
3. Preserve any code blocks completely
4. Note any ongoing tasks or unresolved questions
5. Output in the SAME language as the original conversation
6. Format each turn as 【User】or 【AI】

Conversation:
${conversationText}

Output a concise summary following the rules above:`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096
    }
  });

  // 依次尝试每个模型，直到成功或全部失败
  let lastError = '';
  for (const model of GEMINI_MODELS) {
    try {
      const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${response.status}`;
        const isQuota = response.status === 429 || errMsg.toLowerCase().includes('quota');
        lastError = `[${model}] ${errMsg}`;
        // 如果是配额问题，尝试下一个模型；其他错误直接返回
        if (isQuota) continue;
        return { success: false, error: `Gemini API error: ${lastError}` };
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = `[${model}] Empty response`;
        continue;
      }

      return { success: true, summary: text.trim(), model };
    } catch (e) {
      lastError = `[${model}] ${e.message}`;
      continue;
    }
  }

  return { success: false, error: `All models failed. Last: ${lastError}` };
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 转发消息到 content script
  if (request.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found.' });
        return;
      }
      const message = { ...request };
      delete message.target;
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: 'Cannot connect to page.' });
        } else {
          sendResponse(response);
        }
      });
    });
    return true;
  }

  // Gemini AI 摘要请求
  if (request.action === 'geminiSummarize') {
    const { apiKey, conversation } = request;
    callGeminiSummary(apiKey, conversation).then(sendResponse);
    return true;
  }
});
