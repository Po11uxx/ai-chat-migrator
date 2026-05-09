/**
 * Popup - interaction logic, settings, and content script communication
 */
(function () {
  'use strict';

  const els = {
    settingsToggle: document.getElementById('settingsToggle'),
    settingsPanel: document.getElementById('settingsPanel'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiKeyToggleVis: document.getElementById('apiKeyToggleVis'),
    aiSummaryToggle: document.getElementById('aiSummaryToggle'),
    aiStudioLink: document.getElementById('aiStudioLink'),
    apiStatus: document.getElementById('apiStatus'),
    platformDot: document.getElementById('platformDot'),
    platformName: document.getElementById('platformName'),
    unsupported: document.getElementById('unsupported'),
    mainArea: document.getElementById('mainArea'),
    captureBtn: document.getElementById('captureBtn'),
    loading: document.getElementById('loading'),
    loadingZh: document.getElementById('loadingZh'),
    loadingEn: document.getElementById('loadingEn'),
    statsArea: document.getElementById('statsArea'),
    statRounds: document.getElementById('statRounds'),
    statOriginal: document.getElementById('statOriginal'),
    statCompressed: document.getElementById('statCompressed'),
    compressionRate: document.getElementById('compressionRate'),
    summaryMethod: document.getElementById('summaryMethod'),
    targetArea: document.getElementById('targetArea'),
    targetPlatform: document.getElementById('targetPlatform'),
    copyBtn: document.getElementById('copyBtn'),
    copySuccess: document.getElementById('copySuccess'),
    errorMsg: document.getElementById('errorMsg')
  };

  const PLATFORMS = {
    'claude.ai':         { name: 'Claude' },
    'chatgpt.com':       { name: 'ChatGPT' },
    'gemini.google.com': { name: 'Gemini' },
    'chat.deepseek.com': { name: 'DeepSeek' },
    'kimi.moonshot.cn':  { name: 'Kimi' },
    'kimi.com':          { name: 'Kimi' },
    'www.doubao.com':    { name: 'Doubao' }
  };

  const CONTENT_SCRIPTS = [
    'content/parsers/claude.js',
    'content/parsers/chatgpt.js',
    'content/parsers/gemini.js',
    'content/parsers/deepseek.js',
    'content/parsers/kimi.js',
    'content/parsers/doubao.js',
    'content/content.js'
  ];

  let capturedData = null;
  let currentTabId = null;

  // ── Settings ──

  function loadSettings() {
    chrome.storage.local.get(['geminiApiKey', 'useAiSummary'], (data) => {
      if (data.geminiApiKey) els.apiKeyInput.value = data.geminiApiKey;
      els.aiSummaryToggle.checked = !!data.useAiSummary;
    });
  }

  function saveApiKey() {
    const key = els.apiKeyInput.value.trim();
    chrome.storage.local.set({ geminiApiKey: key });
  }

  function saveToggle() {
    chrome.storage.local.set({ useAiSummary: els.aiSummaryToggle.checked });
  }

  els.settingsToggle.addEventListener('click', () => {
    const panel = els.settingsPanel;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  });

  els.apiKeyInput.addEventListener('change', saveApiKey);
  els.apiKeyInput.addEventListener('blur', saveApiKey);
  els.aiSummaryToggle.addEventListener('change', saveToggle);

  els.apiKeyToggleVis.addEventListener('click', () => {
    const input = els.apiKeyInput;
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  els.aiStudioLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://aistudio.google.com/apikey' });
  });

  // ── Platform detection ──

  function detectPlatformByUrl(url) {
    try {
      const hostname = new URL(url).hostname;
      for (const [domain, info] of Object.entries(PLATFORMS)) {
        if (hostname.includes(domain)) return info;
      }
    } catch (e) { /* invalid URL */ }
    return null;
  }

  async function ensureContentScript(tabId) {
    const alive = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'detectPlatform' }, (resp) => {
        resolve(!chrome.runtime.lastError && !!resp);
      });
    });
    if (alive) return true;

    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_SCRIPTS });
      await new Promise(r => setTimeout(r, 200));
      return true;
    } catch (e) {
      return false;
    }
  }

  function sendToContent(message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: 'Cannot connect. Please refresh the page.' });
        } else {
          resolve(response || { success: false, error: 'No response received.' });
        }
      });
    });
  }

  function sendToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response.' });
        }
      });
    });
  }

  function showError(msg) {
    els.errorMsg.textContent = msg;
    els.errorMsg.style.display = 'block';
    setTimeout(() => { els.errorMsg.style.display = 'none'; }, 5000);
  }

  function showApiStatus(msg, isOk) {
    els.apiStatus.textContent = msg;
    els.apiStatus.className = 'api-status ' + (isOk ? 'status-ok' : 'status-err');
    els.apiStatus.style.display = 'block';
    setTimeout(() => { els.apiStatus.style.display = 'none'; }, 4000);
  }

  // ── Init ──

  async function init() {
    loadSettings();

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      els.platformName.textContent = 'Unknown';
      els.mainArea.style.display = 'none';
      els.unsupported.style.display = 'block';
      return;
    }

    const tab = tabs[0];
    currentTabId = tab.id;
    const platform = detectPlatformByUrl(tab.url);

    if (!platform) {
      els.platformName.textContent = 'Unknown';
      els.mainArea.style.display = 'none';
      els.unsupported.style.display = 'block';
      return;
    }

    els.platformDot.classList.add('active');
    els.platformName.textContent = platform.name;
    els.platformName.classList.add('detected');
    els.mainArea.style.display = 'flex';
    els.unsupported.style.display = 'none';

    els.targetPlatform.querySelectorAll('option').forEach(opt => {
      if (opt.value === platform.name) opt.disabled = true;
    });

    ensureContentScript(currentTabId);
  }

  // ── Capture ──

  async function captureConversation() {
    els.captureBtn.disabled = true;
    els.loading.style.display = 'flex';
    els.statsArea.style.display = 'none';
    els.targetArea.style.display = 'none';
    els.copyBtn.style.display = 'none';
    els.copySuccess.style.display = 'none';
    els.errorMsg.style.display = 'none';

    const injected = await ensureContentScript(currentTabId);
    if (!injected) {
      els.loading.style.display = 'none';
      els.captureBtn.disabled = false;
      showError('Injection failed. Please refresh the page.');
      return;
    }

    const response = await sendToContent({ action: 'parseConversation' });

    if (!response.success) {
      els.loading.style.display = 'none';
      els.captureBtn.disabled = false;
      showError(response.error || 'Capture failed.');
      return;
    }

    capturedData = response.data;
    let usedAi = false;
    let usedModel = '';

    // Check if AI summary is enabled and API key is available
    const settings = await new Promise(r => chrome.storage.local.get(['geminiApiKey', 'useAiSummary'], r));

    if (settings.useAiSummary && settings.geminiApiKey) {
      // Switch loading text
      els.loadingZh.textContent = 'AI 摘要生成中...';
      els.loadingEn.textContent = 'Generating AI summary';

      const aiResult = await sendToBackground({
        action: 'geminiSummarize',
        apiKey: settings.geminiApiKey,
        conversation: capturedData.conversation
      });

      // Reset loading text
      els.loadingZh.textContent = '正在抓取...';
      els.loadingEn.textContent = 'Capturing';

      if (aiResult.success) {
        const estimateTokens = (text) => Math.ceil(text.length / 4);
        capturedData.summaryResult.summary = aiResult.summary;
        capturedData.summaryResult.stats.compressedTokens = estimateTokens(aiResult.summary);
        usedAi = true;
        usedModel = aiResult.model || '';
      } else {
        showApiStatus(aiResult.error || 'AI summary failed, using local compression.', false);
      }
    }

    els.loading.style.display = 'none';
    els.captureBtn.disabled = false;

    const { stats } = capturedData.summaryResult;
    const rounds = Math.ceil(stats.messageCount / 2);
    els.statRounds.textContent = rounds;
    els.statOriginal.textContent = stats.originalTokens.toLocaleString();
    els.statCompressed.textContent = stats.compressedTokens.toLocaleString();

    if (stats.originalTokens > 0) {
      const rate = ((1 - stats.compressedTokens / stats.originalTokens) * 100).toFixed(1);
      const saved = (stats.originalTokens - stats.compressedTokens).toLocaleString();
      els.compressionRate.textContent = `Compressed ${rate}% \u00B7 Saved ${saved} tokens`;
    }

    els.summaryMethod.textContent = usedAi
      ? `Summarized by ${usedModel || 'Gemini AI'}`
      : 'Local compression';

    els.statsArea.style.display = 'block';
    els.targetArea.style.display = 'flex';
    els.copyBtn.style.display = 'block';
    els.copyBtn.disabled = false;
  }

  // ── Copy ──

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
      showError('Failed to generate prompt.');
      return;
    }

    try {
      await navigator.clipboard.writeText(response.prompt);
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = response.prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    els.copySuccess.style.display = 'block';
    setTimeout(() => { els.copySuccess.style.display = 'none'; }, 3000);
  }

  // ── Bind ──

  els.captureBtn.addEventListener('click', captureConversation);
  els.copyBtn.addEventListener('click', copyMigrationPrompt);

  init();
})();
