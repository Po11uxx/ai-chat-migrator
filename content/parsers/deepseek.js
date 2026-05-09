/**
 * DeepSeek (chat.deepseek.com) 对话解析器
 * DeepSeek 使用 React + CSS Modules（哈希类名如 dad65929, fa81, f9bf7997）
 * 稳定选择器：.ds-markdown, .ds-markdown--block
 * @returns {Array<{role: string, content: string}>} 标准格式的对话数组
 */
window.DeepSeekParser = {
  parseConversation() {
    try {
      const messages = [];

      // 方案一：通过已知的哈希容器类名查找对话容器
      // 注意：哈希类名可能随版本变化，但 .ds-markdown 较稳定
      const chatContainer = document.querySelector('.dad65929') ||
                            document.querySelector('[class*="chat-container"]') ||
                            document.querySelector('[class*="conversation"]') ||
                            document.querySelector('main');

      if (chatContainer) {
        const children = chatContainer.children;
        for (let i = 0; i < children.length; i++) {
          const node = children[i];
          const classList = Array.from(node.classList || []);
          const classStr = classList.join(' ');

          // 检查是否是 AI 回复（包含 .ds-markdown）
          const aiMarkdown = node.querySelector('div.ds-markdown.ds-markdown--block') ||
                             node.querySelector('.ds-markdown--block') ||
                             node.querySelector('.ds-markdown');

          if (aiMarkdown) {
            // AI 回复：提取 markdown 内容
            const text = aiMarkdown.innerText.trim();
            if (text) messages.push({ role: 'assistant', content: text });
          } else {
            // 检查是否是已知的用户消息哈希类名
            const isUserByClass = classList.some(c =>
              c.startsWith('fa81') || c.startsWith('_9663006')
            );
            // 或者不包含 AI 特征的非空消息块
            const text = node.innerText.trim();
            if (text && (isUserByClass || !node.querySelector('.ds-markdown'))) {
              // 过滤掉太短或太长的文本（可能是 UI 元素）
              if (text.length >= 1 && text.length < 10000) {
                messages.push({ role: 'user', content: text });
              }
            }
          }
        }
        if (messages.length > 0) return messages;
      }

      // 方案二：纯粹通过 .ds-markdown 定位 AI 回复，推断用户消息
      const markdownEls = document.querySelectorAll('.ds-markdown, .ds-markdown--block');
      if (markdownEls.length > 0) {
        markdownEls.forEach(el => {
          // 找到此 AI 回复的父消息容器
          const msgBlock = el.closest('div[class]');
          if (!msgBlock) return;

          // 查找前一个兄弟元素作为用户消息
          const prevSibling = msgBlock.previousElementSibling;
          if (prevSibling) {
            const userText = prevSibling.innerText.trim();
            if (userText && userText.length < 10000) {
              // 确保不是另一个 AI 回复
              if (!prevSibling.querySelector('.ds-markdown')) {
                messages.push({ role: 'user', content: userText });
              }
            }
          }

          const text = el.innerText.trim();
          if (text) messages.push({ role: 'assistant', content: text });
        });
        if (messages.length > 0) return messages;
      }

      // 方案三：通过 data-role 属性查找
      const roleEls = document.querySelectorAll('[data-role]');
      if (roleEls.length > 0) {
        roleEls.forEach(el => {
          const role = el.getAttribute('data-role');
          const contentEl = el.querySelector('.ds-markdown') ||
                            el.querySelector('.markdown-body') ||
                            el;
          const text = contentEl.innerText.trim();
          if (!text) return;
          if (role === 'user') {
            messages.push({ role: 'user', content: text });
          } else if (role === 'assistant') {
            messages.push({ role: 'assistant', content: text });
          }
        });
        if (messages.length > 0) return messages;
      }

      // 方案四：通用 class 关键词匹配
      const chatItems = document.querySelectorAll(
        '[class*="message"], [class*="chat-item"], [class*="turn"]'
      );
      chatItems.forEach(item => {
        const dsMarkdown = item.querySelector('.ds-markdown');
        const contentEl = dsMarkdown || item;
        const text = contentEl.innerText.trim();
        if (!text) return;

        if (dsMarkdown) {
          messages.push({ role: 'assistant', content: text });
        } else {
          const cls = (item.className || '').toLowerCase();
          if (cls.includes('user') || cls.includes('human')) {
            messages.push({ role: 'user', content: text });
          }
        }
      });

      return messages;
    } catch (e) {
      console.error('[AI Chat Migrator] DeepSeek 解析失败:', e);
      return [];
    }
  }
};
