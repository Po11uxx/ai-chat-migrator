**English** | [中文](./README.md)

# AI Chat Migrator

A Chrome browser extension that captures AI conversation history, generates compressed summaries, and produces a migration prompt you can paste into another AI platform. When you hit the usage limit on one AI platform, seamlessly continue your conversation on another.

## Features

- **One-Click Capture**: Automatically detects the current AI platform and extracts the full conversation from the page DOM
- **Smart Compression**: Compresses long AI responses (keeps the first 200 + last 100 characters) while preserving all user messages in full
- **Migration Prompt Generation**: Produces a structured context prompt ready to paste into the target platform
- **Token Estimation**: Displays original vs. compressed token counts and compression ratio
- **Fully Local**: All summarization and compression runs entirely in the browser -- no external API calls, your conversation data never leaves your device

## Supported Platforms

| Platform | Domain | Status |
|----------|--------|--------|
| Claude | claude.ai | ✅ Implemented |
| ChatGPT | chatgpt.com | ✅ Implemented |
| Gemini | gemini.google.com | ✅ Implemented |
| DeepSeek | chat.deepseek.com | ✅ Implemented |
| Kimi | kimi.com | ✅ Implemented |
| Doubao | doubao.com | ✅ Implemented |

> Each parser includes 3-4 fallback selector strategies to handle UI changes. Selectors are informed by multiple open-source chat exporter projects. If a platform update breaks parsing, please open an Issue.

### Parser Strategies by Platform

| Platform | Primary Selector | Fallback Strategies |
|----------|-----------------|-------------------|
| Claude | `[data-testid="user-message"]` / `[data-testid="assistant-message"]` | group/turn containers, font-user/claude-message class names |
| ChatGPT | `[data-message-author-role]` | article tags, markdown/whitespace-pre-wrap class names |
| Gemini | `<conversation-turn>` + `data-turn-role` attribute | `<user-query>` / `<model-response>` Web Components, `.markdown-main-panel` |
| DeepSeek | `.ds-markdown` / `.ds-markdown--block` | Hashed container classes (dad65929), data-role attribute, sibling node inference |
| Kimi | `[data-testid="message"]` / `[data-role]` | Container child traversal, deep text search + size/alignment inference |
| Doubao | `[data-testid*="message"]` / `[data-role]` | Class keyword matching, avatar element detection, markdown rendering distinction |

## Installation

### Load from Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/ai-chat-migrator.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** in the top right corner
4. Click **Load unpacked**
5. Select the `ai-chat-migrator` folder
6. The extension icon will appear in the browser toolbar

## Usage Guide

### Step 1: Open an AI Chat Page

Visit any supported AI platform (e.g., claude.ai, chatgpt.com) and open a page with an existing conversation.

### Step 2: Capture the Conversation

Click the **AI Chat Migrator** icon in the toolbar. The extension automatically detects the current platform. Click the "Capture Current Conversation" button.

### Step 3: Review Statistics

After capture, the extension displays:
- Number of conversation rounds
- Estimated original token count
- Estimated compressed token count
- Compression ratio

### Step 4: Select Target Platform & Copy

Choose your target platform from the dropdown menu (or select "General"), then click the "Copy Migration Prompt" button.

### Step 5: Paste into Target Platform

Navigate to the target AI platform, paste the copied prompt into the input box, and send it. The target AI will receive the prior conversation context and continue assisting you.

## Migration Prompt Example

```
[Conversation Migration Context]
Below is a summary of my conversation with another AI assistant.
Please continue assisting me based on this context.

Topic: How to deploy a Python application on Kubernetes...
Original rounds: 8 rounds
Source platform: Claude

[Conversation Summary]
[User] How do I deploy a Python application on Kubernetes?

[AI] To deploy a Python app on Kubernetes, the main steps are:
1. Write a Dockerfile to containerize the application
2. Build and push the image to a container registry
...[summarized, original ~1200 chars]...
If you need more detailed configuration examples, I can elaborate further.

[User] Please give a complete Deployment YAML example

[AI] Here is a complete Deployment configuration example...

[Please Continue]
Please confirm you understand the above context, then wait for my next question.
```

## Project Structure

```
ai-chat-migrator/
├── manifest.json              # Chrome extension config (Manifest V3)
├── popup/
│   ├── popup.html             # Popup UI
│   ├── popup.css              # Styles
│   └── popup.js               # Popup interaction logic
├── content/
│   ├── content.js             # Main content script (platform detection, summarization, messaging)
│   └── parsers/
│       ├── claude.js          # Claude parser
│       ├── chatgpt.js         # ChatGPT parser
│       ├── gemini.js          # Gemini parser
│       ├── deepseek.js        # DeepSeek parser
│       ├── kimi.js            # Kimi parser
│       └── doubao.js          # Doubao parser
├── background/
│   └── background.js          # Service Worker
└── utils/
    ├── summarizer.js          # Summarizer reference implementation
    └── templateBuilder.js     # Template builder reference implementation
```

## Technical Details

- **Manifest V3**: Uses the latest Chrome extension specification
- **Vanilla JS**: No external frameworks (no React, Vue, or jQuery)
- **Zero Network Requests**: All processing runs entirely locally
- **Proactive Injection**: Uses `chrome.scripting.executeScript` to inject content scripts on demand -- no page refresh needed
- **Multi-Selector Compatibility**: Each platform parser includes multiple DOM selector sets with fallback strategies to handle UI changes

## FAQ

**Q: What if 0 messages are captured?**

A: Make sure the page is fully loaded and conversation content is rendered. If the issue persists, the platform may have updated its DOM structure. Please open an Issue so the parser selectors can be updated.

**Q: Why is the compression ratio very low or 0%?**

A: Compression only applies to AI responses longer than 500 characters. If all AI responses in the conversation are short, the compression ratio will be near 0% -- this is expected.

**Q: Which browsers are supported?**

A: Chrome and all Chromium-based browsers (Edge, Arc, Brave, etc.) are supported.

**Q: Will my conversation data be uploaded to a server?**

A: No. All data processing happens locally in the browser. The extension makes no network requests -- your conversation data never leaves your device.

## Adding a New Platform

To add support for a new AI platform:

1. Create a new parser file under `content/parsers/` (e.g., `newplatform.js`)
2. Implement a `parseConversation()` method that returns the standard format:
   ```js
   [
     { role: "user", content: "User message" },
     { role: "assistant", content: "AI response" },
     ...
   ]
   ```
3. Add the domain to `manifest.json` (both `host_permissions` and `content_scripts.matches`)
4. Register the platform in `content/content.js` (`PLATFORM_MAP`)
5. Add the platform to `popup/popup.js` (`PLATFORMS` and `CONTENT_SCRIPTS`)
6. Add the platform to the target dropdown in `popup/popup.html`

## Contributing

Issues and Pull Requests are welcome.

## License

MIT License
