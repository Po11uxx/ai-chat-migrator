/**
 * Popup 脚本 - 处理用户交互和与 content script 的通信
 */
(function () {
  'use strict';

  // DOM 元素引用
  const els = {
    platformIcon: document.getElementById('platformIcon'),
    platformName: document.getElementById('platformName'),
    unsupported: document.getElementById('unsupported'),
    mainArea: document.getElementById('mainArea'),
    captureBtn: document.getElementById('captureBtn'),
    loading: document.getElementById('loading'),
    statsArea: document.getElementById('statsArea'),
    statRounds: document.getElementById('statRounds'),
    statOriginal: document.getElementById('statOriginal'),
    statCompressed: document.getElementById('statCompressed'),
    compressionRate: document.getElementById('compressionRate'),
    targetArea: document.getElementById('targetArea'),
    targetPlatform: document.getElementById('targetPlatform'),
    copyBtn: document.getElementById('copyBtn'),
    copySuccess: document.getElementById('copySuccess'),
    errorMsg: document.getElementById('errorMsg')
  };

  // 平台配置：域名 → 名称 + 图标
  const PLATFORMS = {
    'claude.ai':            { name: 'Claude',   icon: '\uD83D\uDFE3' },
    'chatgpt.com':          { name: 'ChatGPT',  icon: '\uD83D\uDFE2' },
    'gemini.google.com':    { name: 'Gemini',   icon: '\uD83D\uDD35' },
    'chat.deepseek.com':    { name: 'DeepSeek', icon: '\uD83D\uDD37' },
    'kimi.moonshot.cn':     { name: 'Kimi',     icon: '\uD83D\uDFE1' },
    'kimi.com':             { name: 'Kimi',     icon: '\uD83D\uDFE1' },
    'www.doubao.com':       { name: '豆包',     icon: '\uD83D\uDFE0' }
  };

  // 需要注入的脚本列表
  const CONTENT_SCRIPTS = [
    'content/parsers/claude.js',
    'content/parsers/chatgpt.js',
    'content/parsers/gemini.js',
    'content/parsers/deepseek.js',
    'content/parsers/kimi.js',
    'content/parsers/doubao.js',
    'content/content.js'
  ];

  // 存储抓取结果和当前 tab 信息
  let capturedData = null;
  let currentTabId = null;

  /**
   * 根据 URL 检测平台（不依赖 content script）
   */
  function detectPlatformByUrl(url) {
    try {
      const hostname = new URL(url).hostname;
      for (const [domain, info] of Object.entries(PLATFORMS)) {
        if (hostname.includes(domain)) {
          return info;
        }
      }
    } catch (e) { /* invalid URL */ }
    return null;
  }

  /**
   * 确保 content script 已注入到目标 tab
   * 先尝试通信，失败则主动注入
   */
  async function ensureContentScript(tabId) {
    // 先尝试 ping content script
    const alive = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'detectPlatform' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (alive) return true;

    // content script 未加载，主动注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: CONTENT_SCRIPTS
      });
      // 注入后等一小段时间让脚本初始化
      await new Promise(r => setTimeout(r, 200));
      return true;
    } catch (e) {
      console.error('[AI Chat Migrator] 注入脚本失败:', e);
      return false;
    }
  }

  /**
   * 向当前 tab 的 content script 发送消息
   */
  function sendToContent(message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: '无法连接到页面，请刷新后重试' });
        } else {
          resolve(response || { success: false, error: '未收到响应' });
        }
      });
    });
  }

  /**
   * 显示错误信息
   */
  function showError(msg) {
    els.errorMsg.textContent = msg;
    els.errorMsg.style.display = 'block';
    setTimeout(() => { els.errorMsg.style.display = 'none'; }, 5000);
  }

  /**
   * 初始化：通过 URL 检测平台，然后注入 content script
   */
  async function init() {
    // 获取当前活跃 tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      els.platformName.textContent = '未识别';
      els.mainArea.style.display = 'none';
      els.unsupported.style.display = 'block';
      return;
    }

    const tab = tabs[0];
    currentTabId = tab.id;

    // 通过 URL 检测平台（无需 content script）
    const platform = detectPlatformByUrl(tab.url);

    if (!platform) {
      els.platformName.textContent = '未识别';
      els.mainArea.style.display = 'none';
      els.unsupported.style.display = 'block';
      return;
    }

    // 显示平台信息
    els.platformIcon.textContent = platform.icon;
    els.platformName.textContent = platform.name;
    els.platformName.classList.add('detected');
    els.mainArea.style.display = 'flex';
    els.unsupported.style.display = 'none';

    // 在目标平台下拉菜单中排除当前平台
    const options = els.targetPlatform.querySelectorAll('option');
    options.forEach(opt => {
      if (opt.value === platform.name) {
        opt.disabled = true;
      }
    });

    // 预先注入 content script（后台执行，不阻塞 UI）
    ensureContentScript(currentTabId);
  }

  /**
   * 抓取对话
   */
  async function captureConversation() {
    // 重置状态
    els.captureBtn.disabled = true;
    els.loading.style.display = 'flex';
    els.statsArea.style.display = 'none';
    els.targetArea.style.display = 'none';
    els.copyBtn.style.display = 'none';
    els.copySuccess.style.display = 'none';
    els.errorMsg.style.display = 'none';

    // 确保 content script 已注入
    const injected = await ensureContentScript(currentTabId);
    if (!injected) {
      els.loading.style.display = 'none';
      els.captureBtn.disabled = false;
      showError('无法注入脚本，请刷新页面后重试');
      return;
    }

    const response = await sendToContent({ action: 'parseConversation' });

    els.loading.style.display = 'none';
    els.captureBtn.disabled = false;

    if (!response.success) {
      showError(response.error || '抓取失败');
      return;
    }

    capturedData = response.data;
    const { stats } = capturedData.summaryResult;

    // 显示统计信息
    const rounds = Math.ceil(stats.messageCount / 2);
    els.statRounds.textContent = rounds;
    els.statOriginal.textContent = stats.originalTokens.toLocaleString();
    els.statCompressed.textContent = stats.compressedTokens.toLocaleString();

    // 计算压缩率
    if (stats.originalTokens > 0) {
      const rate = ((1 - stats.compressedTokens / stats.originalTokens) * 100).toFixed(1);
      els.compressionRate.textContent = `压缩率：${rate}%（节省约 ${(stats.originalTokens - stats.compressedTokens).toLocaleString()} tokens）`;
    }

    els.statsArea.style.display = 'block';
    els.targetArea.style.display = 'flex';
    els.copyBtn.style.display = 'flex';
    els.copyBtn.disabled = false;
  }

  /**
   * 复制迁移 Prompt
   */
  async function copyMigrationPrompt() {
    if (!capturedData) return;

    const targetPlatform = els.targetPlatform.value;
    const response = await sendToContent({
      action: 'buildPrompt',
      summaryResult: capturedData.summaryResult,
      sourcePlatform: capturedData.sourcePlatform,
      targetPlatform
    });

    if (!response.success) {
      showError('生成 Prompt 失败');
      return;
    }

    try {
      await navigator.clipboard.writeText(response.prompt);
      els.copySuccess.style.display = 'block';
      setTimeout(() => { els.copySuccess.style.display = 'none'; }, 3000);
    } catch (e) {
      // fallback: 使用旧 API
      const textarea = document.createElement('textarea');
      textarea.value = response.prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      els.copySuccess.style.display = 'block';
      setTimeout(() => { els.copySuccess.style.display = 'none'; }, 3000);
    }
  }

  // 事件绑定
  els.captureBtn.addEventListener('click', captureConversation);
  els.copyBtn.addEventListener('click', copyMigrationPrompt);

  // 初始化
  init();
})();
