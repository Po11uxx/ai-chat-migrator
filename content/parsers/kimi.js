/**
 * Kimi (kimi.moonshot.cn / kimi.com) 对话解析器
 * 注意：kimi.moonshot.cn 已重定向至 kimi.com
 * @returns {Array<{role: string, content: string}>} 标准格式的对话数组
 */
window.KimiParser = {
  parseConversation() {
    try {
      const messages = [];

      // 方案一：通过 data 属性查找消息元素
      const dataSelectors = [
        '[data-testid="message"]',
        '[data-testid="chat-message"]',
        '[data-message-role]',
        '[data-role]',
        '[class*="message-item"]',
        '[class*="MessageItem"]',
        '[class*="message_container"]',
        '[class*="message-container"]'
      ];

      for (const selector of dataSelectors) {
        const els = document.querySelectorAll(selector);
        if (els.length === 0) continue;

        els.forEach(el => {
          const role = el.getAttribute('data-role') ||
                       el.getAttribute('data-message-role') ||
                       el.getAttribute('data-testid') || '';
          const className = (el.className || '').toLowerCase();

          const contentEl = el.querySelector('.markdown') ||
                            el.querySelector('.message-content') ||
                            el.querySelector('[class*="content"]') ||
                            el.querySelector('.text') ||
                            el;
          const text = contentEl.innerText.trim();
          if (!text) return;

          // 判断角色
          const isUser = role.includes('user') || role.includes('human') ||
                         className.includes('user');
          const isAssistant = role.includes('assistant') || role.includes('bot') ||
                              className.includes('assistant');

          if (isUser) {
            messages.push({ role: 'user', content: text });
          } else if (isAssistant) {
            messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案二：通过容器子元素遍历
      const containerSelectors = [
        'main',
        '[class*="chat-container"]',
        '[class*="conversation"]',
        '#root > div > div'
      ];

      for (const containerSel of containerSelectors) {
        const container = document.querySelector(containerSel);
        if (!container) continue;

        const children = container.querySelectorAll(':scope > div');
        if (children.length < 2) continue;

        children.forEach(child => {
          const className = (child.className || '').toLowerCase();
          const text = (child.querySelector('.markdown') ||
                        child.querySelector('[class*="content"]') ||
                        child).innerText.trim();
          if (!text || text.length < 2) return;

          const hasUser = className.includes('user') ||
                          child.querySelector('[class*="user"]');
          const hasAssistant = className.includes('assistant') ||
                               child.querySelector('[class*="assistant"]');

          if (hasUser) {
            messages.push({ role: 'user', content: text });
          } else if (hasAssistant) {
            messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案三：深度文本搜索 — 遍历所有 div，通过尺寸和 markdown 内容判断
      const allDivs = document.querySelectorAll('div');
      const candidates = [];

      allDivs.forEach(div => {
        const rect = div.getBoundingClientRect();
        if (rect.height < 20 || rect.width < 100) return;

        const text = div.innerText.trim();
        if (text.length < 5 || text.length > 10000) return;

        // 检查是否包含 markdown 元素（AI 回复特征）
        const hasMarkdown = div.querySelector('p, ul, ol, code, pre, h1, h2, h3');
        // 检查是否靠右对齐（用户消息特征）
        const style = window.getComputedStyle(div);
        const isRightAligned = style.textAlign === 'right' ||
                               style.marginLeft === 'auto' ||
                               style.justifyContent === 'flex-end';

        // 避免嵌套重复
        const isNested = candidates.some(c =>
          c.element.contains(div) || div.contains(c.element)
        );
        if (!isNested) {
          candidates.push({
            element: div,
            text,
            isUser: isRightAligned && !hasMarkdown,
            hasMarkdown
          });
        }
      });

      // 按 DOM 顺序排列候选元素
      candidates.sort((a, b) => {
        const pos = a.element.compareDocumentPosition(b.element);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      candidates.forEach(c => {
        messages.push({
          role: c.isUser ? 'user' : 'assistant',
          content: c.text
        });
      });

      return messages;
    } catch (e) {
      console.error('[AI Chat Migrator] Kimi 解析失败:', e);
      return [];
    }
  }
};
