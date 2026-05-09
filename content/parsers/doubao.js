/**
 * 豆包 (www.doubao.com) 对话解析器
 * 豆包是字节跳动的 AI 对话产品，使用 React + CSS Modules（哈希类名）
 * @returns {Array<{role: string, content: string}>} 标准格式的对话数组
 */
window.DouBaoParser = {
  parseConversation() {
    try {
      const messages = [];

      // 方案一：通过 data-testid 属性（字节系产品常用）
      const testIdEls = document.querySelectorAll(
        '[data-testid*="message"], [data-testid*="chat"], [data-testid*="turn"]'
      );
      if (testIdEls.length > 0) {
        testIdEls.forEach(el => {
          const testId = el.getAttribute('data-testid') || '';
          const contentEl = el.querySelector('[class*="markdown"]') ||
                            el.querySelector('.markdown-body') ||
                            el.querySelector('[class*="content"]') ||
                            el;
          const text = contentEl.innerText.trim();
          if (!text) return;

          if (testId.includes('user') || testId.includes('send') || testId.includes('human')) {
            messages.push({ role: 'user', content: text });
          } else if (testId.includes('bot') || testId.includes('receive') || testId.includes('assistant')) {
            messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案二：通过 data-role / data-message-role 属性
      const roleEls = document.querySelectorAll('[data-role], [data-message-role]');
      if (roleEls.length > 0) {
        roleEls.forEach(el => {
          const role = el.getAttribute('data-role') || el.getAttribute('data-message-role');
          const contentEl = el.querySelector('[class*="markdown"]') ||
                            el.querySelector('.markdown-body') ||
                            el.querySelector('[class*="content"]') ||
                            el;
          const text = contentEl.innerText.trim();
          if (!text) return;
          if (role === 'user') {
            messages.push({ role: 'user', content: text });
          } else if (role === 'assistant' || role === 'bot') {
            messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案三：通过对话容器 class 名关键词匹配
      const chatItems = document.querySelectorAll(
        '[class*="chat-message"], [class*="message-item"], [class*="dialogue-item"], [class*="msg-row"], [class*="chat-item"]'
      );
      if (chatItems.length > 0) {
        chatItems.forEach(item => {
          const className = item.className || '';
          const contentEl = item.querySelector('[class*="markdown"]') ||
                            item.querySelector('.markdown-body') ||
                            item.querySelector('[class*="msg-content"]') ||
                            item.querySelector('[class*="text-content"]') ||
                            item;
          const text = contentEl.innerText.trim();
          if (!text) return;

          const isUser = className.includes('user') ||
                         className.includes('human') ||
                         className.includes('self') ||
                         className.includes('right') ||
                         className.includes('send');
          const isAssistant = className.includes('assistant') ||
                              className.includes('bot') ||
                              className.includes('ai') ||
                              className.includes('receive') ||
                              className.includes('left');

          if (isUser) {
            messages.push({ role: 'user', content: text });
          } else if (isAssistant) {
            messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案四：通过头像和 markdown 区分角色（结构化策略）
      // 豆包的 AI 回复通常包含 markdown 渲染，用户消息是纯文本
      const allBubbles = document.querySelectorAll(
        '[class*="bubble"], [class*="message-block"], [class*="turn"], [class*="msg-wrapper"]'
      );
      if (allBubbles.length > 0) {
        allBubbles.forEach(bubble => {
          const markdownEl = bubble.querySelector('[class*="markdown"]') ||
                             bubble.querySelector('.markdown-body');
          const contentEl = markdownEl ||
                            bubble.querySelector('[class*="content"]') ||
                            bubble;
          const text = contentEl.innerText.trim();
          if (!text) return;

          // 头像判断
          const avatarEl = bubble.querySelector('[class*="avatar"]');
          const avatarClass = (avatarEl?.className || '').toLowerCase();
          const hasUserAvatar = avatarClass.includes('user') ||
                                avatarClass.includes('sender') ||
                                avatarClass.includes('self');
          const hasAiAvatar = avatarClass.includes('bot') ||
                              avatarClass.includes('doubao') ||
                              avatarClass.includes('receiver') ||
                              avatarClass.includes('ai');

          if (hasUserAvatar) {
            messages.push({ role: 'user', content: text });
          } else if (hasAiAvatar || markdownEl) {
            // 有 markdown 渲染的通常是 AI 回复
            messages.push({ role: 'assistant', content: text });
          } else {
            // 兜底：通过对齐方向推断
            const cls = (bubble.className || '').toLowerCase();
            const parentCls = (bubble.parentElement?.className || '').toLowerCase();
            const combined = cls + ' ' + parentCls;
            const isUser = combined.includes('right') ||
                           combined.includes('self') ||
                           combined.includes('send') ||
                           combined.includes('user');
            messages.push({
              role: isUser ? 'user' : 'assistant',
              content: text
            });
          }
        });
        if (messages.length > 0) return messages;
      }

      return messages;
    } catch (e) {
      console.error('[AI Chat Migrator] 豆包解析失败:', e);
      return [];
    }
  }
};
