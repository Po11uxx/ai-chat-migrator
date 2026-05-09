/**
 * Gemini (gemini.google.com) 对话解析器
 * Gemini 使用 Angular/Lit 框架 + 自定义 Web Components
 * 关键元素：<conversation-turn>, <user-query>, <model-response>
 * @returns {Array<{role: string, content: string}>} 标准格式的对话数组
 */
window.GeminiParser = {
  parseConversation() {
    try {
      const messages = [];

      // 方案一：通过自定义元素 <conversation-turn> 解析（最可靠）
      const turns = document.querySelectorAll('conversation-turn');
      if (turns.length > 0) {
        turns.forEach(turn => {
          const role = turn.getAttribute('data-turn-role') ||
                       turn.getAttribute('data-is-user') || '';

          // 判断是用户还是模型
          if (role === 'user' || role === 'true') {
            const textEl = turn.querySelector('.query-text') ||
                           turn.querySelector('.user-query-content') ||
                           turn.querySelector('.query-content') ||
                           turn.querySelector('user-query') ||
                           turn;
            const text = textEl.innerText.trim();
            if (text) messages.push({ role: 'user', content: text });
          } else if (role === 'model' || role === 'false') {
            const textEl = turn.querySelector('model-response .markdown-main-panel') ||
                           turn.querySelector('model-response') ||
                           turn.querySelector('.response-container') ||
                           turn.querySelector('.model-response-content') ||
                           turn.querySelector('.markdown') ||
                           turn;
            const text = textEl.innerText.trim();
            if (text) messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案二：分别查找 <user-query> 和 <model-response> Web Components
      const userQueries = document.querySelectorAll(
        'user-query, .user-query-bubble-with-background, .user-query-content, .query-content'
      );
      const modelResponses = document.querySelectorAll(
        'model-response, .response-container, .model-response-content'
      );
      if (userQueries.length > 0 || modelResponses.length > 0) {
        const maxLen = Math.max(userQueries.length, modelResponses.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < userQueries.length) {
            const textEl = userQueries[i].querySelector('.query-text') || userQueries[i];
            const text = textEl.innerText.trim();
            if (text) messages.push({ role: 'user', content: text });
          }
          if (i < modelResponses.length) {
            const textEl = modelResponses[i].querySelector('.markdown-main-panel') ||
                           modelResponses[i].querySelector('.markdown') ||
                           modelResponses[i];
            const text = textEl.innerText.trim();
            if (text) messages.push({ role: 'assistant', content: text });
          }
        }
        if (messages.length > 0) return messages;
      }

      // 方案三：通过聊天历史滚动容器
      const chatHistory = document.querySelector(
        'infinite-scroller.chat-history, [class*="chat"], [class*="conversation"], main'
      );
      if (chatHistory) {
        // 查找用户查询
        const queries = chatHistory.querySelectorAll('.query-text, .user-query-text');
        const responses = chatHistory.querySelectorAll(
          '.markdown-main-panel, .model-response-text, .response-text'
        );
        const maxLen = Math.max(queries.length, responses.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < queries.length) {
            const text = queries[i].innerText.trim();
            if (text) messages.push({ role: 'user', content: text });
          }
          if (i < responses.length) {
            const text = responses[i].innerText.trim();
            if (text) messages.push({ role: 'assistant', content: text });
          }
        }
        if (messages.length > 0) return messages;
      }

      // 方案四：通过 data-turn-role 属性
      const turnRoleEls = document.querySelectorAll('[data-turn-role]');
      turnRoleEls.forEach(el => {
        const role = el.getAttribute('data-turn-role');
        const text = el.innerText.trim();
        if (!text) return;
        if (role === 'user' || role === 'human') {
          messages.push({ role: 'user', content: text });
        } else if (role === 'model' || role === 'assistant') {
          messages.push({ role: 'assistant', content: text });
        }
      });

      return messages;
    } catch (e) {
      console.error('[AI Chat Migrator] Gemini 解析失败:', e);
      return [];
    }
  }
};
