# OpenClaw WeCom Channel

企业微信（WeCom/WeChat Work）频道插件，用于 [OpenClaw](https://openclaw.ai) / [Moltbot](https://github.com/moltbot/moltbot)。

**基于 [@william.qian/simple-wecom](https://www.npmjs.com/package/@william.qian/simple-wecom)**，完全兼容 OpenClaw 2026.1.29+。

## ✨ 特性

- ✅ **完整支持 OpenClaw 2026.1.29+**
- ✅ 支持企业微信官方 API
- ✅ 支持加密消息接收和发送
- ✅ 支持文本、图片、文件等多种消息类型
- ✅ 支持企业微信应用回调验证
- ✅ 使用最新 OpenClaw Plugin API

## 🔄 版本历史

### v1.3.0 (2026-01-30) - OpenClaw API 迁移
- ✅ 完整迁移到 OpenClaw Plugin API
- ✅ 重构 HTTP 路由为全局 webhook handler
- ✅ 支持 OpenClaw 2026.1.29+

### v1.1.0 (2026-01-29) - Clawdbot 兼容性修复
- 🔧 修复了与 Clawdbot Plugin SDK 的 API 兼容性
- 通过 `PluginRuntime` 访问内部 API

详细改动请查看 [CHANGELOG.md](./CHANGELOG.md)。

## 📦 安装

### 方式 1：从 NPM 安装（推荐）

```bash
# 使用 OpenClaw CLI
openclaw plugins install @tobotorui/openclaw-wecom-channel

# 或使用 npm
npm install -g @tobotorui/openclaw-wecom-channel
```

### 方式 2：从 GitHub 安装

```bash
openclaw plugins install https://github.com/toboto/moltbot-wecom-channel
```

### 方式 3：本地开发安装

```bash
git clone https://github.com/toboto/moltbot-wecom-channel.git
cd moltbot-wecom-channel
openclaw plugins install . --link
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

1. **URL**: `http://your-gateway-host:port/wecom/message`
2. **Token**: 自定义（建议随机字符串）
3. **EncodingAESKey**: 点击「随机生成」

### 3. IP 白名单

在「企业可信 IP」中添加你的 Gateway 服务器的公网 IP 地址。

### 4. 配置 Moltbot

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "wecom": {
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
      "wecom": {
        "enabled": true
      }
    }
  }
}
```

**⚠️ 重要事项：**
- `agentid` 必须配置为数字类型，否则消息发送会失败
- Channel key 和 plugin ID 都是 `wecom`（不是 `simple-wecom`）
- 配置文件位置：`~/.openclaw/openclaw.json`（不是 `~/.clawdbot/clawdbot.json`）

### 5. 重启 OpenClaw Gateway

```bash
openclaw gateway restart
```

## 🧪 测试

在企业微信应用中发送消息给机器人，如果配置正确，应该能收到 AI 的回复。

### 故障排查

查看日志：
```bash
# OpenClaw 日志
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep -i wecom

# Gateway 日志（如果使用 nohup 启动）
tail -f /tmp/openclaw-gateway.log | grep -i wecom
```

检查 channel 状态：
```bash
openclaw channels status
```

常见问题：
- **消息收不到**：检查回调 URL 配置和企业微信 IP 白名单
- **消息发不出去**：检查 `agentid`、`corpsecret` 配置和 IP 白名单
- **签名验证失败**：检查 `token` 和 `encodingAESKey` 配置
- **插件未加载**：运行 `openclaw plugins list` 检查插件状态

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
