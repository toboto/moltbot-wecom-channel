# Changelog

All notable changes to this project will be documented in this file.

## [1.6.0] - 2026-02-10

### Added

- **图片下载功能**：新增通过 MediaId 下载图片到本地临时文件
  - 使用企业微信官方 API `downloadMedia()` 下载高清原图
  - 保存到 `/tmp/wecom-image-{timestamp}-{MediaId}.jpg`
  - 自动回退：下载失败时使用 PicUrl

- **MediaPaths 支持**：在消息分发时添加 `MediaPaths` 字段
  - 优先使用本地文件路径而非远程 URL
  - 提高图片处理的可靠性和质量

- **详细日志**：新增图片处理相关的调试日志（需启用 verbose）
  - `[Image]` 前缀的日志输出
  - 记录 MediaId、PicUrl、文件路径、文件大小

### Changed

- **图片消息文本**：从 `[图片消息]` 改为 `[图片消息]\nMediaId: {MediaId}`
  - 为 LLM 提供更多上下文信息

### Fixed

- **图片理解准确性**：通过 MediaId 下载高清原图，避免 PicUrl 过期、压缩或访问限制问题
- **图片质量问题**：使用官方 API 确保获取原始质量图片

### Technical Details

修改文件：
- `src/webhook.ts` - 新增图片下载逻辑（lines 301-337）、修改消息分发（lines 382-383）
- `src/message-parser.ts` - 改进图片消息文本标记（lines 224-229）

---

## [1.5.2] - 2026-02-04

### Added

- **日志详细度控制**：添加 `verbose` 配置选项，优化日志输出
  - 默认模式（`verbose: false`）：仅输出简洁的核心信息（收到/发送消息的单行摘要）
  - 详细模式（`verbose: true`）：输出完整的 XML、JSON 和处理过程日志
  - 显著减少日志噪音，便于生产环境监控

### Changed

- **简化日志格式**：非详细模式下，每条消息仅记录一行核心信息
  - 收到消息：`[WeCom] 收到消息: From=用户, Type=类型, Content=内容预览...`
  - 发送回复：`[WeCom] 发送回复: To=用户, Media=文件名, Text=内容预览...`

### Technical Details

修改文件：
- `src/config-schema.ts` - 添加 `verbose` 配置字段
- `src/webhook.ts` - 根据 verbose 配置控制所有日志输出
- `src/session-context.ts` - 添加 verbose 参数支持

---

## [1.5.0] - 2026-02-04

### Added

- **事件消息类型支持**：添加 `WeComEventMessage` 接口，支持企业微信事件消息（如 `enter_agent`、`LOCATION` 等）
- **file-attachment skill**：新增文件附件处理 skill，确保 Agent 生成的文件能够正确发送
  - 指导 Agent 在发送文件时包含完整路径
  - 支持截图、图片、PDF、音视频等所有文件类型
  - 自动触发，适用于所有消息渠道
- **会话上下文跟踪**：新增 `src/session-context.ts`，使用 AsyncLocalStorage 跟踪请求级别的用户上下文

### Fixed

- **修复事件消息报错**：企业微信发送事件通知（进入应用、地理位置上报等）时不再报 `Unsupported message type: event` 错误
- **修复 @all 收件人问题**：通过 AsyncLocalStorage 正确解析收件人，避免文件发送给所有人
- **移除多用户冲突隐患**：完全移除 `lastRecipient` 全局状态，防止并发场景下的跨用户消息污染

### Technical Details

新增文件：
- `src/session-context.ts` - AsyncLocalStorage 会话上下文管理
- `skills/file-attachment/SKILL.md` - 文件附件处理 skill

修改文件：
- `src/message-parser.ts` - 添加 `WeComEventMessage` 类型和解析逻辑
- `src/webhook.ts` - 跳过事件消息处理，移除 lastRecipient 引用
- `src/channel.ts` - 使用 AsyncLocalStorage 解析 @all 收件人，移除 lastRecipient fallback
- `src/client.ts` - 移除 lastRecipient 跟踪
- `src/gateway.ts` - 移除 lastRecipient 设置
- `README.md` - 添加 file-attachment skill 安装指南

---

## [1.4.0] - 2026-01-31

### Added

- **语音转文字功能（Tencent Cloud ASR）**：支持将企业微信语音消息自动转写为文字
  - 自动检测语音消息类型（`MsgType === "voice"`）
  - 通过企业微信官方 API 下载语音文件（支持 AMR 格式）
  - 集成腾讯云一句话识别 API (Sentence Recognition)
  - 可选配置：未配置 ASR 时自动跳过识别
  - 识别成功后自动将文字内容附加到消息中发送给 Agent
  - 添加详细日志输出，便于调试语音处理流程
  - 新增配置项：
    - `tencentAsr.enabled` - 是否启用语音识别
    - `tencentAsr.secretId` - 腾讯云 API 密钥 ID
    - `tencentAsr.secretKey` - 腾讯云 API 密钥
    - `tencentAsr.region` - 服务地域（默认：`ap-guangzhou`）
    - `tencentAsr.engineModelType` - 引擎模型（默认：`16k_zh`）

### Fixed

- 修复重复导入问题（`tmpdir` 和 `writeFile` 重复声明）
- 移除 `configSchema` 字段以避免 Zod schema 循环引用导致的 `Maximum call stack size exceeded` 错误
- 修正包名从 `@tobotorui/openclaw-wecom-channel` 到 `@tobotorui/wecom`，消除插件 ID 不匹配警告

### Technical Details

新增文件：
- `src/tencent-asr.ts` - 腾讯云语音识别 API 客户端实现
- `src/official-api.ts` - 新增 `downloadMedia()` 方法用于下载语音文件

修改文件：
- `src/webhook.ts` - 集成语音消息检测和 ASR 处理流程
- `src/config-schema.ts` - 添加 `tencentAsr` 配置选项
- `src/channel.ts` - 移除冗余的 `configSchema` 字段
- `package.json` - 更新包名和版本号

---

## [1.3.2] - 2026-01-30

### Added

- **交互式配置支持（Onboarding）**：现在可以通过 `openclaw configure --section channels` 交互式配置 WeCom
  - 创建了 `src/onboarding.ts` 实现 onboarding adapter
  - 支持引导式输入所有必需配置字段：
    - Corp ID (企业ID)
    - Corp Secret (应用密钥)
    - Agent ID (应用ID)
    - Token (回调Token)
    - EncodingAESKey (加密密钥)
  - 包含输入验证和帮助文本
  - 配置完成后显示后续步骤指引

### Improved

- 配置向导中不再显示 "wecom does not support onboarding yet."
- 用户现在有两种配置方式：
  1. 交互式配置（推荐）：`openclaw configure --section channels`
  2. 手动编辑 JSON：`~/.openclaw/openclaw.json`

---

## [1.3.1] - 2026-01-30

### Fixed

- **配置向导错误修复**：修复了在运行 `openclaw configure --section channels` 时出现的 `TypeError: Cannot read properties of undefined (reading 'trim')` 错误
  - 根本原因：meta 对象定义不完整，缺少 `label` 和 `selectionLabel` 等必需字段
  - 解决方案：参考 Zalo 插件，手动定义完整的 meta 对象
  - 添加了 `isConfigured()` 函数来正确验证配置
  - 加强了 `describeAccount()` 和 `resolveAccount()` 的类型安全

- **Meta 字段完整性**
  - 添加 `label`: "WeCom"
  - 添加 `selectionLabel`: "WeCom (Enterprise WeChat)"
  - 添加 `docsPath`, `docsLabel`, `blurb`, `aliases`, `order`
  - 现在配置向导中正确显示 channel 名称

### Technical Details

修复了 4 个主要问题：
1. 添加 `isConfigured()` 函数检查必需配置字段
2. 在 `describeAccount()` 中添加类型检查，防止对 undefined 调用 `.trim()`
3. 移除 `getChatChannelMeta()` 调用（仅适用于核心 channels）
4. 手动定义完整的 meta 对象（参考 Zalo 插件实现）

---

## [1.3.0] - 2026-01-30

### 重大更新：完全支持 OpenClaw 2026.1.29+

这是一个重大版本更新，将插件从 Clawdbot API 完全迁移到 OpenClaw API。

### Changed

- **完整的 API 迁移**
  - SDK 导入：`clawdbot/plugin-sdk` → `openclaw/plugin-sdk`
  - API 类型：`ClawdbotPluginApi` → `OpenClawPluginApi`
  - 插件 ID：`simple-wecom` → `wecom`
  - 包名称：`@tobotorui/moltbot-wecom-channel` → `@tobotorui/openclaw-wecom-channel`

- **HTTP 路由架构重构**
  - 移除了旧的 `runtime.channel.registerPluginHttpRoute()` API（已废弃）
  - 创建新的 `src/webhook.ts` - 实现全局 HTTP webhook handler
  - 在 `index.ts` 中通过 `api.registerHttpHandler()` 注册路由
  - Handler 模式：检查 URL path，处理后返回 boolean

- **Channel 插件简化**
  - 移除 `src/gateway.ts` 中的 gateway 启动逻辑
  - 简化 `src/channel.ts`，保留配置和 outbound 消息接口
  - 更新所有函数名：`Simple*` → `Wecom*`

### Added

- ✅ 新增 `src/webhook.ts` - 统一的 HTTP webhook 处理器
- ✅ 添加 `zod` 作为依赖（用于配置验证）
- ✅ 添加 `openclaw.plugin.json` - OpenClaw 插件元数据

### Fixed

- ✅ 修复与 OpenClaw 2026.1.29+ 的完全兼容性
- ✅ 修复 HTTP 路由注册机制
- ✅ 修复配置加载和 channel 启动流程

### Installation

```bash
# 从 NPM 安装
npm install @tobotorui/openclaw-wecom-channel

# 或使用 OpenClaw CLI
openclaw plugins install @tobotorui/openclaw-wecom-channel
```

### Migration Guide

如果您之前使用 `@tobotorui/moltbot-wecom-channel@1.2.0`：

1. 卸载旧插件：`openclaw plugins uninstall moltbot-wecom-channel`
2. 安装新插件：`openclaw plugins install @tobotorui/openclaw-wecom-channel`
3. 配置中的 channel key 保持为 `wecom`（不需要更改）

---

## [1.1.0] - 2026-01-29

### Fixed
- **API 兼容性修复**：修复了与最新版 Moltbot Plugin SDK 的兼容性问题
  - 移除了对未暴露 API `dispatchReplyWithBufferedBlockDispatcher` 的直接导入
  - 改用 `PluginRuntime` 访问内部 API
  - 修改文件：`src/gateway.ts`（3 处改动）

### Changed
- 项目重命名为 `moltbot-wecom-channel`
- 更新 README 文档，添加详细的配置和故障排查说明

### Technical Details

#### 代码改动

**文件：`src/gateway.ts`**

1. **导入语句修改**（第 1-2 行）
   ```typescript
   // 之前
   import { registerPluginHttpRoute, dispatchReplyWithBufferedBlockDispatcher, type ChannelGatewayContext } from "clawdbot/plugin-sdk";

   // 之后
   import { registerPluginHttpRoute, type ChannelGatewayContext } from "clawdbot/plugin-sdk";
   import { getSimpleWecomRuntime } from "./runtime.js";
   ```

2. **handleEncryptedWeComMessage 函数**（第 256-258 行）
   ```typescript
   // 之前
   await dispatchReplyWithBufferedBlockDispatcher({...});

   // 之后
   const runtime = getSimpleWecomRuntime();
   await runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({...});
   ```

3. **handleLegacyMessage 函数**（第 395-397 行）
   ```typescript
   // 之前
   await dispatchReplyWithBufferedBlockDispatcher({...});

   // 之后
   const runtime = getSimpleWecomRuntime();
   await runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({...});
   ```

## [1.0.2] - 原始版本

基于 [@william.qian/simple-wecom](https://www.npmjs.com/package/@william.qian/simple-wecom) v1.0.2

### Features
- 支持企业微信官方 API
- 支持加密消息接收和发送
- 支持多种消息类型（文本、图片、文件等）
- 支持企业微信回调验证

---

**注：v1.0.2 及之前版本由原作者 william.qian 开发维护。**
