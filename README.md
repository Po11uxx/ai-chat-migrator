[English](./README_EN.md) | **中文**

# AI Chat Migrator

一个 Chrome 浏览器扩展，用于抓取 AI 对话历史、生成压缩摘要，并一键复制为可迁移的上下文 Prompt。当你在一个 AI 平台达到使用限额时，可以无缝迁移到另一个平台继续对话。

## 功能特性

- **一键抓取**：自动识别当前 AI 平台，从页面 DOM 中提取完整对话历史
- **智能压缩**：支持两种模式 —— 本地压缩（截断长回复）或 Gemini AI 摘要（需配置免费 API Key）
- **迁移 Prompt 生成**：自动生成结构化的上下文 Prompt，方便粘贴到目标平台
- **Token 估算**：显示原始与压缩后的 Token 数量对比及压缩率
- **隐私优先**：本地压缩模式下数据不离开浏览器；AI 摘要模式仅将对话发送至 Google Gemini API

## 支持平台

| 平台 | 域名 | 状态 |
|------|------|------|
| Claude | claude.ai | ✅ 已实现 |
| ChatGPT | chatgpt.com | ✅ 已实现 |
| Gemini | gemini.google.com | ✅ 已实现 |
| DeepSeek | chat.deepseek.com | ✅ 已实现 |
| Kimi | kimi.com | ✅ 已实现 |
| 豆包 | doubao.com | ✅ 已实现 |

> 每个平台的解析器均内置多套 DOM 选择器方案（3-4 套降级策略），以适应页面结构变化。选择器参考了多个开源对话导出项目的实现。如果某个平台更新了 UI 导致抓取失败，欢迎提交 Issue。

### 各平台解析策略

| 平台 | 核心选择器 | 降级方案 |
|------|-----------|---------|
| Claude | `[data-testid="user-message"]` / `[data-testid="assistant-message"]` | group/turn 容器、font-user/claude-message 类名 |
| ChatGPT | `[data-message-author-role]` | article 标签、markdown/whitespace-pre-wrap 类名 |
| Gemini | `<conversation-turn>` + `data-turn-role` 属性 | `<user-query>` / `<model-response>` Web Components、`.markdown-main-panel` |
| DeepSeek | `.ds-markdown` / `.ds-markdown--block` | 哈希容器类名 (dad65929)、data-role 属性、前后兄弟节点推断 |
| Kimi | `[data-testid="message"]` / `[data-role]` | 容器子元素遍历、深度文本搜索 + 尺寸/对齐方向推断 |
| 豆包 | `[data-testid*="message"]` / `[data-role]` | class 关键词匹配、头像元素判断、markdown 渲染区分 |

## 安装方法

### 从源码加载（开发者模式）

1. 下载或克隆本仓库：
   ```bash
   git clone https://github.com/your-username/ai-chat-migrator.git
   ```
2. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/`
3. 开启右上角的 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `ai-chat-migrator` 文件夹
6. 安装完成后，浏览器工具栏会出现插件图标

## 使用指南

### 第一步：打开 AI 对话页面

访问任一支持的 AI 平台（如 claude.ai、chatgpt.com 等），打开一个包含对话内容的聊天页面。

### 第二步：抓取对话

点击浏览器工具栏中的 **AI Chat Migrator** 图标，插件会自动识别当前平台。点击「抓取当前对话」按钮。

### 第三步：查看统计

抓取完成后，插件会显示：
- 对话轮数
- 原始 Token 估算数
- 压缩后 Token 估算数
- 压缩率

### 第四步：选择目标平台并复制

从下拉菜单中选择你要迁移到的目标平台（或选择「通用」），然后点击「复制迁移 Prompt」按钮。

### 第五步：粘贴到目标平台

前往目标 AI 平台，将复制的 Prompt 粘贴到输入框中发送，目标 AI 会接收到之前的对话上下文并继续为你服务。

## 生成的迁移 Prompt 示例

```
【对话迁移上下文】
以下是我与另一个 AI 助手的对话摘要，请基于此上下文继续协助我。

对话主题：如何在 Kubernetes 中部署一个 Python 应用...
原始对话轮数：8 轮
来源平台：Claude

【历史对话摘要】
【用户】如何在 Kubernetes 中部署一个 Python 应用？

【AI】要在 Kubernetes 中部署 Python 应用，主要步骤如下：
1. 编写 Dockerfile 将应用容器化
2. 构建并推送镜像到容器仓库
...[已摘要，原文约1200字]...
如果需要更详细的配置示例，我可以进一步说明。

【用户】请给一个完整的 Deployment YAML 示例

【AI】以下是一个完整的 Deployment 配置示例...

【请继续】
请确认你已理解以上上下文，然后等待我的下一个问题。
```

## 项目结构

```
ai-chat-migrator/
├── manifest.json              # Chrome 扩展配置（Manifest V3）
├── popup/
│   ├── popup.html             # 弹窗界面
│   ├── popup.css              # 样式
│   └── popup.js               # 弹窗交互逻辑
├── content/
│   ├── content.js             # 主内容脚本（平台检测、摘要生成、消息通信）
│   └── parsers/
│       ├── claude.js          # Claude 对话解析器
│       ├── chatgpt.js         # ChatGPT 对话解析器
│       ├── gemini.js          # Gemini 对话解析器
│       ├── deepseek.js        # DeepSeek 对话解析器
│       ├── kimi.js            # Kimi 对话解析器
│       └── doubao.js          # 豆包对话解析器
├── background/
│   └── background.js          # Service Worker
└── utils/
    ├── summarizer.js          # 摘要逻辑参考实现
    └── templateBuilder.js     # 模板生成参考实现
```

## AI 摘要功能（可选）

插件支持接入 **Gemini API** 生成高质量摘要，替代本地截断压缩。

### 配置步骤

1. 点击插件弹窗右上角齿轮图标打开设置
2. 前往 [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 免费获取 API Key
3. 粘贴 Key 并开启「AI 智能摘要」开关

### 模型降级策略

插件会按优先级依次尝试以下模型，配额不足时自动切换：

| 优先级 | 模型 | 说明 |
|--------|------|------|
| 1 | `gemini-2.5-flash-lite` | 最快，免费额度最高 |
| 2 | `gemini-2.5-flash` | 性价比最佳 |
| 3 | `gemini-3.1-flash-lite` | 最新一代轻量模型 |

如果所有模型均失败，自动降级为本地压缩。

## 技术细节

- **Manifest V3**：使用最新的 Chrome 扩展规范
- **纯原生 JS**：不依赖 React、Vue、jQuery 等外部框架
- **主动注入**：通过 `chrome.scripting.executeScript` 主动注入内容脚本，无需刷新页面即可使用
- **多选择器兼容**：每个平台解析器内置多套 DOM 选择器及兜底方案，适应页面结构变化
- **双摘要模式**：本地压缩（零网络请求）或 Gemini AI 智能摘要（可选）

## 常见问题

**Q: 抓取到 0 条消息怎么办？**

A: 请确保页面已完全加载，对话内容已渲染在页面上。如果问题持续，可能是平台更新了 DOM 结构，需要更新对应的解析器选择器，欢迎提交 Issue。

**Q: 为什么压缩率很低甚至为 0%？**

A: 压缩只对超过 500 字的 AI 回复生效。如果对话中 AI 的回复都比较短，压缩率会接近 0%，这是正常的。

**Q: 支持哪些浏览器？**

A: 目前支持 Chrome 及基于 Chromium 的浏览器（如 Edge、Arc、Brave 等）。

**Q: 我的对话数据会上传到服务器吗？**

A: 本地压缩模式下不会，数据完全在浏览器本地处理。如果开启了 AI 摘要功能，对话内容会发送至 Google Gemini API 进行处理。

## 适配新平台

如需适配新的 AI 平台，只需：

1. 在 `content/parsers/` 下新建一个解析器文件（如 `newplatform.js`）
2. 实现 `parseConversation()` 方法，返回标准格式：
   ```js
   [
     { role: "user", content: "用户消息" },
     { role: "assistant", content: "AI 回复" },
     ...
   ]
   ```
3. 在 `manifest.json` 中添加域名匹配和脚本引用
4. 在 `content/content.js` 的 `PLATFORM_MAP` 中注册新平台
5. 在 `popup/popup.js` 的 `PLATFORMS` 和 `CONTENT_SCRIPTS` 中添加对应配置
6. 在 `popup/popup.html` 的目标平台下拉菜单中添加选项

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License
