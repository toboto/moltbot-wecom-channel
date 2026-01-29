# Changelog

All notable changes to this project will be documented in this file.

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
