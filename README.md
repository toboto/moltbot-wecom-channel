# Moltbot WeCom Channel

企业微信（WeCom/WeChat Work）频道插件，用于 [Moltbot](https://github.com/moltbot/moltbot)（原 Clawdbot）。

**这是 [@william.qian/simple-wecom](https://www.npmjs.com/package/@william.qian/simple-wecom) 的修复版本**，解决了与最新版 Moltbot 的 API 兼容性问题。

## ✨ 特性

- ✅ 支持企业微信官方 API
- ✅ 支持加密消息接收
- ✅ 支持文本、图片、文件等多种消息类型
- ✅ 支持企业微信应用回调验证
- ✅ 兼容最新版 Moltbot Plugin SDK

## 🐛 修复内容

### 问题
原始插件 `@william.qian/simple-wecom` v1.0.2 存在 API 兼容性问题：

```
dispatchReplyWithBufferedBlockDispatcher is not a function
```

### 原因
插件直接从 `clawdbot/plugin-sdk` 导入内部 API `dispatchReplyWithBufferedBlockDispatcher`，但该函数未在 plugin-sdk 中暴露。

### 解决方案
通过 `PluginRuntime` 访问内部 API：

```typescript
// 修改前（错误）
await dispatchReplyWithBufferedBlockDispatcher({...})

// 修改后（正确）
const runtime = getSimpleWecomRuntime();
await runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({...})
```

详细改动请查看 [CHANGELOG.md](./CHANGELOG.md)。

## 📦 安装

### 从 NPM 安装（推荐）

```bash
moltbot plugins install @tobotorui/moltbot-wecom-channel
```

### 从 GitHub 安装

```bash
moltbot plugins install https://github.com/toboto/moltbot-wecom-channel
```

### 手动安装

```bash
git clone https://github.com/toboto/moltbot-wecom-channel.git
cd moltbot-wecom-channel
npm install
# 然后在 Moltbot 配置中添加插件路径
```

## ⚙️ 配置

### 1. 在企业微信管理后台配置应用

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入「应用管理」→「自建应用」→ 创建应用
3. 记录以下信息：
   - **AgentId**（应用 ID）
   - **Secret**（应用密钥）
   - **Corp ID**（企业 ID，在「我的企业」中查看）

### 2. 配置回调 URL

在应用的「接收消息」设置中：

1. **URL**: `http://your-gateway-host:port/simple-wecom/message`
2. **Token**: 自定义（建议随机字符串）
3. **EncodingAESKey**: 点击「随机生成」

### 3. IP 白名单

在「企业可信 IP」中添加你的 Gateway 服务器的公网 IP 地址。

### 4. 配置 Moltbot

编辑 `~/.clawdbot/clawdbot.json`：

```json
{
  "channels": {
    "simple-wecom": {
      "enabled": true,
      "corpid": "你的企业ID",
      "corpsecret": "应用Secret",
      "agentid": 1000002,
      "token": "你设置的Token",
      "encodingAESKey": "你生成的EncodingAESKey"
    }
  },
  "plugins": {
    "entries": {
      "simple-wecom": {
        "enabled": true
      }
    }
  }
}
```

**⚠️ 重要：`agentid` 必须配置为数字类型，否则消息发送会失败。**

### 5. 重启 Moltbot Gateway

```bash
moltbot gateway restart
```

## 🧪 测试

在企业微信应用中发送消息给机器人，如果配置正确，应该能收到 AI 的回复。

### 故障排查

查看日志：
```bash
tail -f ~/.clawdbot/logs/clawdbot-$(date +%Y-%m-%d).log | grep -i wecom
```

常见问题：
- **消息收不到**：检查回调 URL 配置和 IP 白名单
- **消息发不出去**：检查 `agentid`、`corpsecret` 配置和 IP 白名单
- **签名验证失败**：检查 `token` 和 `encodingAESKey` 配置

## 🔧 开发

```bash
# 克隆仓库
git clone https://github.com/toboto/moltbot-wecom-channel.git
cd moltbot-wecom-channel

# 安装依赖
npm install

# 在 Moltbot 中测试
moltbot plugins install ./
```

## 📄 License

MIT License - 基于 [@william.qian/simple-wecom](https://www.npmjs.com/package/@william.qian/simple-wecom) 修改

## 🙏 致谢

- 原始作者：[william.qian](https://www.npmjs.com/~william.qian)
- 原始仓库：[@william.qian/simple-wecom](https://www.npmjs.com/package/@william.qian/simple-wecom)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- GitHub: [@toboto](https://github.com/toboto)
- 问题反馈：[GitHub Issues](https://github.com/toboto/moltbot-wecom-channel/issues)
