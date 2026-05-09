/**
 * 迁移 Prompt 模板生成器（独立模块，供 content.js 使用）
 *
 * 输入：
 *   summary - generateSummary 的返回值
 *   sourcePlatform - 来源平台名称
 *   targetPlatform - 目标平台名称
 * 输出：string - 可直接粘贴的迁移 Prompt
 *
 * 注：实际逻辑已内联在 content.js 中以避免模块加载问题
 *     此文件保留作为独立参考实现
 */

const TemplateBuilder = {
  /**
   * 构建迁移 Prompt
   */
  buildMigrationPrompt(summaryResult, sourcePlatform, targetPlatform) {
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
};
