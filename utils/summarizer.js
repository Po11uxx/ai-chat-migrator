/**
 * 对话压缩与摘要生成工具（独立模块，供 content.js 使用）
 *
 * 输入：conversation - [{role: "user"|"assistant", content: string}, ...]
 * 输出：{summary: string, topicKeywords: string, stats: {originalTokens, compressedTokens, messageCount}}
 *
 * 注：实际逻辑已内联在 content.js 中以避免模块加载问题
 *     此文件保留作为独立参考实现
 */

const Summarizer = {
  /**
   * 估算文本的 token 数量（1 token ≈ 4 字符）
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  },

  /**
   * 提取对话主题关键词
   */
  extractTopicKeywords(messages) {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const topic = firstUserMsg.content.substring(0, 80);
      return topic.length < firstUserMsg.content.length ? topic + '...' : topic;
    }
    return '未识别主题';
  },

  /**
   * 生成对话摘要
   * @param {Array} conversation 标准格式对话数组
   * @returns {{ summary: string, topicKeywords: string, stats: object }}
   */
  generateSummary(conversation) {
    if (!conversation || conversation.length === 0) {
      return { summary: '', topicKeywords: '', stats: { originalTokens: 0, compressedTokens: 0, messageCount: 0 } };
    }

    let originalText = '';
    const compressedParts = [];
    const firstRounds = conversation.slice(0, 6);
    const topicKeywords = this.extractTopicKeywords(firstRounds);

    conversation.forEach(msg => {
      originalText += msg.content;

      if (msg.role === 'user') {
        compressedParts.push(`【用户】${msg.content}`);
      } else {
        if (msg.content.length > 500) {
          const front = msg.content.substring(0, 200);
          const back = msg.content.substring(msg.content.length - 100);
          compressedParts.push(`【AI】${front}\n...[已摘要，原文约${msg.content.length}字]...\n${back}`);
        } else {
          compressedParts.push(`【AI】${msg.content}`);
        }
      }
    });

    const summary = compressedParts.join('\n\n');

    return {
      summary,
      topicKeywords,
      stats: {
        originalTokens: this.estimateTokens(originalText),
        compressedTokens: this.estimateTokens(summary),
        messageCount: conversation.length
      }
    };
  }
};
