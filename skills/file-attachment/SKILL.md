---
name: file-attachment
description: Use this skill whenever you need to send, share, or deliver a file to the user. This includes screenshots, generated images, documents, PDFs, audio files, videos, or any file resource. The skill ensures files are properly delivered across all messaging channels.
---

# File Attachment Skill

Ensure files are properly delivered to users across all messaging channels.

## When to Use This Skill

Use this skill whenever you:
- Take a screenshot for the user
- Generate an image or diagram
- Create or convert a document (PDF, etc.)
- Save audio or video files
- Produce any file that needs to be sent to the user

## The Problem

Many messaging channels cannot automatically detect file attachments from tool outputs. If you just mention "I've taken a screenshot" without including the file path, the user may not receive the actual file.

## The Solution

**Always include the complete file path in your text response** when sending any file to the user.

## Format Requirements

### For Images (PNG, JPG, GIF, WebP, BMP)

Use **markdown image syntax**:
```
![描述](/完整/文件/路径.png)
```

Example:
```
这是截图：
![截图](/var/folders/abc/screenshot.png)
```

### For Other Files (PDF, Video, Audio, Documents)

Include the path in your response:
```
文件已准备好：`/path/to/file.pdf`
```

Or with markdown:
```
这是录音文件：
![音频](/path/to/audio.mp3)
```

## Supported File Types

- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`
- **Videos**: `.mp4`, `.avi`, `.mov`
- **Audio**: `.mp3`, `.wav`, `.amr`
- **Documents**: `.pdf`

## Examples

### Example 1: Screenshot

**User:** "截个图给我"

**Correct response:**
```
已截图完成！
![截图](/var/folders/zz/zyxl_abc/T/screenshot-2026-02-03.png)
```

### Example 2: Generated Image

**User:** "画一张图"

**Correct response:**
```
这是为你生成的图片：
![生成图片](/Users/name/.openclaw/generated/image.png)
```

### Example 3: Document

**User:** "把这个转成PDF"

**Correct response:**
```
PDF已生成：
文件路径：`/Users/name/Documents/output.pdf`
```

### Example 4: Multiple Files

**User:** "截几张图"

**Correct response:**
```
已截取3张截图：

1. ![窗口1](/tmp/screenshot-1.png)
2. ![窗口2](/tmp/screenshot-2.png)
3. ![窗口3](/tmp/screenshot-3.png)
```

## Critical Rules

✅ **必须** 在回复中包含完整的文件路径
✅ **必须** 使用绝对路径（以 `/` 或 `~` 开头）
✅ **必须** 包含文件扩展名
✅ 图片优先使用 markdown 图片语法 `![alt](path)`

❌ **不要** 只说"截图完成"而不提供路径
❌ **不要** 使用相对路径（如 `./file.png`）
❌ **不要** 省略文件扩展名
❌ **不要** 假设文件会自动附加

## Summary

每当你为用户生成、保存或提供任何文件时，**一定要在回复文字中包含文件的完整路径**。这是确保文件能够被正确发送给用户的关键步骤。
