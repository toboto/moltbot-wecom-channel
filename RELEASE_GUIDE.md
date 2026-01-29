# 发布指南

## 准备工作清单

- [x] 代码已修复并测试通过
- [x] 文档已完成（README, CHANGELOG, LICENSE）
- [x] package.json 已更新（版本号 1.1.0）
- [x] .gitignore 和 .npmignore 已配置

## 发布到 GitHub

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名称：`moltbot-wecom-channel`
3. 描述：`企业微信（WeCom）频道插件，用于 Moltbot - 修复版`
4. 选择 Public
5. **不要**初始化 README（我们已经有了）
6. 点击「Create repository」

### 2. 推送代码到 GitHub

在项目目录执行：

```bash
cd /tmp/moltbot-wecom-channel

# 初始化 Git
git init

# 添加所有文件
git add .

# 创建首次提交
git commit -m "feat: initial release v1.1.0

- Fix API compatibility with latest Moltbot Plugin SDK
- Use PluginRuntime to access dispatchReplyWithBufferedBlockDispatcher
- Based on @william.qian/simple-wecom v1.0.2
- Update documentation and configuration guide"

# 添加远程仓库
git remote add origin https://github.com/toboto/moltbot-wecom-channel.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 3. 创建 Release

1. 访问 https://github.com/toboto/moltbot-wecom-channel/releases/new
2. 标签版本：`v1.1.0`
3. Release 标题：`v1.1.0 - API 兼容性修复`
4. 描述：

```markdown
## 🐛 修复

修复了与最新版 Moltbot Plugin SDK 的 API 兼容性问题。

### 问题
原始插件 `@william.qian/simple-wecom` v1.0.2 在最新版 Moltbot 中无法正常工作：
```
dispatchReplyWithBufferedBlockDispatcher is not a function
```

### 解决方案
通过 `PluginRuntime` 访问内部 API，而不是直接导入。

### 改动
- 修改文件：`src/gateway.ts`（3 处改动）
- 详见 [CHANGELOG.md](./CHANGELOG.md)

## 📦 安装

```bash
moltbot plugins install https://github.com/toboto/moltbot-wecom-channel
```

## 📖 文档

详细配置说明请查看 [README.md](./README.md)

## 🙏 致谢

感谢原作者 [william.qian](https://www.npmjs.com/~william.qian) 的优秀工作！

---

**完整更新日志：** [CHANGELOG.md](./CHANGELOG.md)
```

5. 上传 `/tmp/moltbot-wecom-channel-v1.1.0.tar.gz` 作为 Release Asset
6. 点击「Publish release」

### 4. 更新 README 徽章（可选）

在 README.md 顶部添加徽章：

```markdown
![GitHub release](https://img.shields.io/github/v/release/toboto/moltbot-wecom-channel)
![GitHub issues](https://img.shields.io/github/issues/toboto/moltbot-wecom-channel)
![License](https://img.shields.io/github/license/toboto/moltbot-wecom-channel)
```

## NPM 发布（待账号问题解决后）

### 前置条件
- NPM 账号已激活
- 已登录 NPM：`npm login`

### 发布步骤

```bash
cd /tmp/moltbot-wecom-channel

# 检查 package.json
cat package.json | grep -E '"name"|"version"'

# 发布（第一次发布需要 --access public）
npm publish --access public

# 或者如果使用 scope
# npm publish --access public
```

### 发布后验证

```bash
npm view moltbot-wecom-channel
```

## 后续维护

### 创建新版本

1. 修改代码
2. 更新 `CHANGELOG.md`
3. 更新 `package.json` 中的版本号
4. 提交代码：`git commit -m "feat: description"`
5. 创建标签：`git tag v1.x.x`
6. 推送：`git push && git push --tags`
7. 在 GitHub 创建新 Release
8. （可选）发布到 NPM：`npm publish`

## 宣传推广

### 1. 在原插件仓库提 Issue
如果原作者的仓库还在维护，可以提一个友好的 Issue，告知已经 fork 并修复了兼容性问题。

### 2. 更新 Moltbot 文档
如果 Moltbot 有插件目录，可以提交 PR 添加你的插件。

### 3. 社区分享
在相关的技术社区（如掘金、V2EX、知乎等）分享使用教程。

## 注意事项

- ✅ 始终在 README 中注明这是基于原作者工作的修复版本
- ✅ 在 package.json 的 contributors 中保留原作者信息
- ✅ 遵守 MIT License 的要求
- ✅ 如果原作者联系你，保持友好沟通
