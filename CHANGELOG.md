# Changelog

All notable changes to this project will be documented in this file.

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
