# OpenClaw WeCom Channel

企业微信（WeCom/WeChat Work）频道插件，用于 [OpenClaw](https://openclaw.ai) / [Moltbot](https://github.com/moltbot/moltbot)。

**基于 [@william.qian/simple-wecom](https://www.npmjs.com/package/@william.qian/simple-wecom)**，完全兼容 OpenClaw 2026.2.2-3+。

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
openclaw plugins install https://github.com/toboto/openclaw-wecom-channel
```

### 方式 3：本地开发安装

```bash
git clone https://github.com/toboto/openclaw-wecom-channel.git
cd openclaw-wecom-channel
openclaw plugins install . --link
```

## 🎯 推荐安装配套 Skill

为了更好地使用企业微信频道，强烈推荐安装以下 skills：

### 1. file-attachment skill（文件附件处理）⭐ 必装

**确保 Agent 生成的文件（截图、图片、PDF等）能够正确发送到企业微信。**

```bash
# 方式 1: 从本仓库安装（需先克隆仓库）
cp -r skills/file-attachment ~/.openclaw/skills/

# 方式 2: 直接从 GitHub 安装
git clone https://github.com/toboto/openclaw-wecom-channel.git /tmp/wecom-plugin
cp -r /tmp/wecom-plugin/skills/file-attachment ~/.openclaw/skills/
rm -rf /tmp/wecom-plugin
```

**file-attachment skill 的功能：**

- ✅ 指导 Agent 在发送文件时包含完整文件路径
- ✅ 支持截图、生成图片、PDF、音视频等所有文件类型
- ✅ 自动触发，无需用户手动指定
- ✅ 确保文件在所有消息渠道中正确送达

**使用效果：**

在企业微信中说：
```
"截个图给我"
"画一张猫的图片"
"把这个网页转成PDF"
```

Agent 会自动在回复中包含文件路径（如 `![截图](/path/to/screenshot.png)`），插件会自动上传并发送文件。

---

### 2. wecom-reminder skill（定时提醒）

**使用自然语言创建企业微信定时提醒。**

```bash
# 方式 1: 从本仓库安装（需先克隆仓库）
cp -r skills/wecom-reminder ~/.openclaw/skills/

# 方式 2: 直接从 GitHub 安装
git clone https://github.com/toboto/openclaw-wecom-channel.git /tmp/wecom-plugin
cp -r /tmp/wecom-plugin/skills/wecom-reminder ~/.openclaw/skills/
rm -rf /tmp/wecom-plugin
```

**wecom-reminder skill 的功能：**

- ✅ 自动处理企业微信定时提醒任务
- ✅ 使用自然语言创建提醒（如："每天早上9点提醒我开会"）
- ✅ 自动配置正确的 deliver 参数，确保消息送达
- ✅ 支持各种 cron 表达式（日常、工作日、特定时间等）

**使用示例：**

在企业微信中直接说：
```
"每天早上8:50提醒我提交报告"
"工作日下午5点提醒我下班"
```

OpenClaw 会自动使用正确的配置创建定时任务，确保消息准时送达。

---

详细使用说明请查看各 skill 内的文档。

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

### 5. 配置腾讯云语音识别（可选）

如果需要支持语音消息转文字，可以启用腾讯云 ASR（Automatic Speech Recognition）服务。

#### 获取腾讯云 API 凭证

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 访问 [访问管理 - API 密钥管理](https://console.cloud.tencent.com/cam/capi)
3. 创建或查看 API 密钥，记录：
   - **SecretId**
   - **SecretKey**

#### 在配置文件中启用 ASR

在 `~/.openclaw/openclaw.json` 的 `wecom` 配置中添加 `asr` 配置项：

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "corpid": "你的企业ID",
      "corpsecret": "应用Secret",
      "agentid": 1000002,
      "token": "你设置的Token",
      "encodingAESKey": "你生成的EncodingAESKey",
      "asr": {
        "enabled": true,
        "secretId": "你的腾讯云SecretId",
        "secretKey": "你的腾讯云SecretKey",
        "region": "ap-shanghai",
        "engineModelType": "16k_zh"
      }
    }
  }
}
```

#### ASR 配置参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `enabled` | boolean | 是 | - | 是否启用 ASR 服务 |
| `secretId` | string | 是 | - | 腾讯云 API SecretId |
| `secretKey` | string | 是 | - | 腾讯云 API SecretKey |
| `region` | string | 否 | `ap-shanghai` | 腾讯云服务区域（如 `ap-shanghai`、`ap-beijing`、`ap-guangzhou` 等） |
| `engineModelType` | string | 否 | `16k_zh` | 语音识别引擎模型类型（`16k_zh` 为 16k 中文普通话通用，`8k_zh` 为 8k 中文普通话通用） |

#### 使用效果

启用 ASR 后，在企业微信中发送语音消息，OpenClaw 会自动将语音转换为文字，然后由 AI 处理并回复。

### 6. 重启 OpenClaw Gateway

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
git clone https://github.com/toboto/openclaw-wecom-channel.git
cd openclaw-wecom-channel

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
- 问题反馈：[GitHub Issues](https://github.com/toboto/openclaw-wecom-channel/issues)
