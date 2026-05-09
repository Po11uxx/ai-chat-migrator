/**
 * ChatGPT (chatgpt.com) 对话解析器
 * 从 DOM 中提取用户和 AI 的对话消息
 * @returns {Array<{role: string, content: string}>} 标准格式的对话数组
 */
window.ChatGPTParser = {
  parseConversation() {
    try {
      const messages = [];

      // 方案一：通过 data-message-author-role 属性查找
      const allMessages = document.querySelectorAll('[data-message-author-role]');
      if (allMessages.length > 0) {
        allMessages.forEach(el => {
          const role = el.getAttribute('data-message-author-role');
          if (role === 'user' || role === 'assistant') {
            const contentEl = el.querySelector('.whitespace-pre-wrap') ||
                              el.querySelector('.markdown') ||
                              el;
            const text = contentEl.innerText.trim();
            if (text) {
              messages.push({ role, content: text });
            }
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案二：通过 article 标签结构解析（ChatGPT 新版 UI）
      const articles = document.querySelectorAll('article[data-testid^="conversation-turn"]');
      if (articles.length > 0) {
        articles.forEach(article => {
          const text = article.innerText.trim();
          if (!text) return;

          // 通过内部结构判断角色
          const userEl = article.querySelector('[data-message-author-role="user"]');
          const assistantEl = article.querySelector('[data-message-author-role="assistant"]');

          if (userEl) {
            const contentEl = userEl.querySelector('.whitespace-pre-wrap') || userEl;
            messages.push({ role: 'user', content: contentEl.innerText.trim() });
          } else if (assistantEl) {
            const contentEl = assistantEl.querySelector('.markdown') || assistantEl;
            messages.push({ role: 'assistant', content: contentEl.innerText.trim() });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案三：兜底 — 通过通用的对话容器解析
      const groups = document.querySelectorAll('[class*="group"]');
      let isUser = true; // ChatGPT 对话一般从用户开始
      groups.forEach(group => {
        const markdown = group.querySelector('.markdown');
        const prewrap = group.querySelector('.whitespace-pre-wrap');
        const contentEl = markdown || prewrap;
        if (contentEl) {
          const text = contentEl.innerText.trim();
          if (text) {
            // 有 markdown 类的通常是 assistant，纯 whitespace-pre-wrap 是 user
            const role = markdown ? 'assistant' : 'user';
            messages.push({ role, content: text });
          }
        }
      });

      return messages;
    } catch (e) {
      console.error('[AI Chat Migrator] ChatGPT 解析失败:', e);
      return [];
    }
  }
};
