/**
 * 主内容脚本 - 负责协调各平台 parser 和与 popup/background 的通信
 * 根据当前页面 URL 自动选择对应的解析器
 */
(function () {
  'use strict';

  // 平台检测配置
  const PLATFORM_MAP = {
    'claude.ai': { name: 'Claude', parser: () => window.ClaudeParser },
    'chatgpt.com': { name: 'ChatGPT', parser: () => window.ChatGPTParser },
    'gemini.google.com': { name: 'Gemini', parser: () => window.GeminiParser },
    'chat.deepseek.com': { name: 'DeepSeek', parser: () => window.DeepSeekParser },
    'kimi.moonshot.cn': { name: 'Kimi', parser: () => window.KimiParser },
    'kimi.com': { name: 'Kimi', parser: () => window.KimiParser },
    'www.doubao.com': { name: '豆包', parser: () => window.DouBaoParser }
  };

  /**
   * 检测当前页面所属平台
   * @returns {{ name: string, parser: object } | null}
   */
  function detectPlatform() {
    const hostname = window.location.hostname;
    for (const [domain, config] of Object.entries(PLATFORM_MAP)) {
      if (hostname.includes(domain)) {
        return { name: config.name, parser: config.parser() };
      }
    }
    return null;
  }

  /**
   * 对话压缩摘要生成（本地实现，不依赖外部 API）
   * @param {Array} conversation - 标准格式对话数组
   * @returns {{ summary: string, stats: object }}
   */
  function generateSummary(conversation) {
    if (!conversation || conversation.length === 0) {
      return { summary: '', stats: { originalTokens: 0, compressedTokens: 0, messageCount: 0 } };
    }

    // 估算 token 数（1 token ≈ 4 字符）
    const estimateTokens = (text) => Math.ceil(text.length / 4);

    let originalParts = [];
    let compressedParts = [];

    // 提取前 3 轮对话用于识别主题
    const firstRounds = conversation.slice(0, 6); // 3 轮 = 6 条消息
    const topicKeywords = extractTopicKeywords(firstRounds);

    conversation.forEach((msg) => {
      const roleLabel = msg.role === 'user' ? '【用户】' : '【AI】';

      // 原始格式（同样带角色标记，保持统计口径一致）
      originalParts.push(`${roleLabel}${msg.content}`);

      if (msg.role === 'user') {
        // 用户消息完整保留
        compressedParts.push(`${roleLabel}${msg.content}`);
      } else {
        // AI 回复：超过 500 字则压缩
        if (msg.content.length > 500) {
          const front = msg.content.substring(0, 200);
          const back = msg.content.substring(msg.content.length - 100);
          compressedParts.push(`${roleLabel}${front}\n...[已摘要，原文约${msg.content.length}字]...\n${back}`);
        } else {
          compressedParts.push(`${roleLabel}${msg.content}`);
        }
      }
    });

    const originalSummary = originalParts.join('\n\n');
    const summary = compressedParts.join('\n\n');
    const originalTokens = estimateTokens(originalSummary);
    const compressedTokens = estimateTokens(summary);

    return {
      summary,
      topicKeywords,
      stats: {
        originalTokens,
        compressedTokens,
        messageCount: conversation.length
      }
    };
  }

  /**
   * 从前几轮对话中提取关键词作为主题
   * @param {Array} messages - 前几轮对话
   * @returns {string} 主题描述
   */
  function extractTopicKeywords(messages) {
    const allText = messages.map(m => m.content).join(' ');
    // 简单提取：取用户第一条消息的前 50 字作为主题概要
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const topic = firstUserMsg.content.substring(0, 80);
      return topic.length < firstUserMsg.content.length ? topic + '...' : topic;
    }
    return '未识别主题';
  }

  /**
   * 生成迁移 Prompt
   * @param {object} summaryResult - generateSummary 的返回值
   * @param {string} sourcePlatform - 来源平台名称
   * @param {string} targetPlatform - 目标平台名称
   * @returns {string} 可粘贴的迁移 Prompt
   */
  function buildMigrationPrompt(summaryResult, sourcePlatform, targetPlatform) {
    const { summary, topicKeywords, stats } = summaryResult;
    const rounds = Math.ceil(stats.messageCount / 2);

    return `【对话迁移上下文】
以下是我与另一个 AI 助手的对话摘要，请基于此上下文继续协助我。

对话主题：${topicKeywords}
原始对话轮数：${rounds} 轮
来源平台：${sourcePlatform}

【历史对话摘要】
${summary}

【请继续】
请确认你已理解以上上下文，然后等待我的下一个问题。`;
  }

  // 监听来自 popup / background 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectPlatform') {
      const platform = detectPlatform();
      sendResponse({ platform: platform ? platform.name : null });
      return true;
    }

    if (request.action === 'parseConversation') {
      const platform = detectPlatform();
      if (!platform || !platform.parser) {
        sendResponse({ success: false, error: '当前页面不支持' });
        return true;
      }

      try {
        const conversation = platform.parser.parseConversation();
        if (!conversation || conversation.length === 0) {
          sendResponse({ success: false, error: '未找到对话内容，请确保页面已加载完成' });
          return true;
        }

        const summaryResult = generateSummary(conversation);
        sendResponse({
          success: true,
          data: {
            conversation,
            summaryResult,
            sourcePlatform: platform.name
          }
        });
      } catch (e) {
        sendResponse({ success: false, error: '解析出错: ' + e.message });
      }
      return true;
    }

    if (request.action === 'buildPrompt') {
      const { summaryResult, sourcePlatform, targetPlatform } = request;
      const prompt = buildMigrationPrompt(summaryResult, sourcePlatform, targetPlatform);
      sendResponse({ success: true, prompt });
      return true;
    }
  });

  console.log('[AI Chat Migrator] 内容脚本已加载，当前平台:', detectPlatform()?.name || '未识别');
})();
