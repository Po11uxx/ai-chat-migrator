/**
 * Claude (claude.ai) 对话解析器
 * 从 DOM 中提取用户和 AI 的对话消息
 * @returns {Array<{role: string, content: string}>} 标准格式的对话数组
 */
window.ClaudeParser = {
  parseConversation() {
    try {
      const messages = [];

      // Claude 页面的对话容器，尝试多种选择器以兼容不同版本
      const userSelectors = [
        '[data-testid="user-message"]',
        '.font-user-message',
        '.human-turn .whitespace-pre-wrap',
        '.human-turn'
      ];

      const assistantSelectors = [
        '[data-testid="assistant-message"]',
        '.font-claude-message',
        '.assistant-turn .whitespace-pre-wrap',
        '.assistant-turn'
      ];

      // 方案一：通过 data-testid 或统一的对话行结构解析
      const turnSelectors = [
        '.group\\/turn',           // Claude 使用 group/turn 类名
        '[data-testid*="turn"]',
        '.conversation-turn'
      ];

      for (const turnSelector of turnSelectors) {
        const turns = document.querySelectorAll(turnSelector);
        if (turns.length > 0) {
          turns.forEach(turn => {
            const text = turn.innerText.trim();
            if (!text) return;

            // 判断是用户还是 AI
            const isUser = turn.querySelector('[data-testid="user-message"]') ||
                           turn.classList.contains('human-turn') ||
                           turn.querySelector('.font-user-message');
            const isAssistant = turn.querySelector('[data-testid="assistant-message"]') ||
                                turn.classList.contains('assistant-turn') ||
                                turn.querySelector('.font-claude-message');

            if (isUser) {
              const contentEl = turn.querySelector('[data-testid="user-message"]') ||
                                turn.querySelector('.font-user-message') ||
                                turn;
              messages.push({ role: 'user', content: contentEl.innerText.trim() });
            } else if (isAssistant) {
              const contentEl = turn.querySelector('[data-testid="assistant-message"]') ||
                                turn.querySelector('.font-claude-message') ||
                                turn;
              messages.push({ role: 'assistant', content: contentEl.innerText.trim() });
            }
          });

          if (messages.length > 0) return messages;
        }
      }

      // 方案二：分别查找用户消息和 AI 消息，按 DOM 顺序合并
      let userEls = [];
      let assistantEls = [];

      for (const sel of userSelectors) {
        userEls = document.querySelectorAll(sel);
        if (userEls.length > 0) break;
      }

      for (const sel of assistantSelectors) {
        assistantEls = document.querySelectorAll(sel);
        if (assistantEls.length > 0) break;
      }

      // 交替合并（假设 user 先说）
      const maxLen = Math.max(userEls.length, assistantEls.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < userEls.length) {
          messages.push({ role: 'user', content: userEls[i].innerText.trim() });
        }
        if (i < assistantEls.length) {
          messages.push({ role: 'assistant', content: assistantEls[i].innerText.trim() });
        }
      }

      return messages;
    } catch (e) {
      console.error('[AI Chat Migrator] Claude 解析失败:', e);
      return [];
    }
  }
};
