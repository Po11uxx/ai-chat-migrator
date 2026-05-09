/**
 * Popup - interaction logic and content script communication
 */
(function () {
  'use strict';

  const els = {
    platformDot: document.getElementById('platformDot'),
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

  const PLATFORMS = {
    'claude.ai':            { name: 'Claude' },
    'chatgpt.com':          { name: 'ChatGPT' },
    'gemini.google.com':    { name: 'Gemini' },
    'chat.deepseek.com':    { name: 'DeepSeek' },
    'kimi.moonshot.cn':     { name: 'Kimi' },
    'kimi.com':             { name: 'Kimi' },
    'www.doubao.com':       { name: 'Doubao' }
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
      await chrome.scripting.executeScript({
        target: { tabId },
        files: CONTENT_SCRIPTS
      });
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

  function showError(msg) {
    els.errorMsg.textContent = msg;
    els.errorMsg.style.display = 'block';
    setTimeout(() => { els.errorMsg.style.display = 'none'; }, 5000);
  }

  async function init() {
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

    const options = els.targetPlatform.querySelectorAll('option');
    options.forEach(opt => {
      if (opt.value === platform.name) opt.disabled = true;
    });

    ensureContentScript(currentTabId);
  }

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
    els.loading.style.display = 'none';
    els.captureBtn.disabled = false;

    if (!response.success) {
      showError(response.error || 'Capture failed.');
      return;
    }

    capturedData = response.data;
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

    els.statsArea.style.display = 'block';
    els.targetArea.style.display = 'flex';
    els.copyBtn.style.display = 'block';
    els.copyBtn.disabled = false;
  }

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
      els.copySuccess.style.display = 'block';
      setTimeout(() => { els.copySuccess.style.display = 'none'; }, 3000);
    } catch (e) {
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

  els.captureBtn.addEventListener('click', captureConversation);
  els.copyBtn.addEventListener('click', copyMigrationPrompt);

  init();
})();
