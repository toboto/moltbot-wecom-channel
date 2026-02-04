import type { ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { wecomOfficialAPI } from "./official-api.js";

export interface SimpleWecomMessage {
  text?: string;
  mediaUrl?: string;
}

export class SimpleWecomClient {
  private outboundQueue = new Map<string, SimpleWecomMessage[]>();
  private pendingRequests = new Map<string, ServerResponse>();

  // 🔧 Track last recipient for @all fallback
  public lastRecipient: string | null = null;

  constructor() {}

  /**
   * 从 URL 或本地文件路径获取文件内容
   */
  private async fetchMediaFile(mediaUrl: string): Promise<Buffer> {
    // 如果是本地文件路径（以 / 开头或包含盘符）
    if (mediaUrl.startsWith("/") || /^[A-Za-z]:/.test(mediaUrl)) {
      console.log(`[WeCom] 读取本地文件: ${mediaUrl}`);
      return await readFile(mediaUrl);
    }

    // 如果是 HTTP/HTTPS URL
    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      console.log(`[WeCom] 下载远程文件: ${mediaUrl}`);
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    }

    throw new Error(`Unsupported media URL format: ${mediaUrl}`);
  }

  /**
   * 根据文件路径/URL 检测媒体类型
   */
  private detectMediaType(mediaUrl: string): {
    type: "image" | "voice" | "video" | "file";
    filename: string;
  } {
    const ext = extname(mediaUrl).toLowerCase();
    const filename = mediaUrl.split("/").pop() || "file" + ext;

    // 图片类型
    if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext)) {
      return { type: "image", filename };
    }

    // 音频类型
    if ([".mp3", ".wav", ".amr", ".ogg", ".m4a"].includes(ext)) {
      return { type: "voice", filename };
    }

    // 视频类型
    if ([".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv"].includes(ext)) {
      return { type: "video", filename };
    }

    // 默认为文件
    return { type: "file", filename };
  }

  // Called by Gateway when Sync=true
  registerPendingRequest(userId: string, res: ServerResponse, timeoutMs: number = 30000) {
    // If there is an existing one, close it to avoid leaks/conflicts
    if (this.pendingRequests.has(userId)) {
      const oldRes = this.pendingRequests.get(userId);
      if (oldRes && !oldRes.writableEnded) {
        try {
          oldRes.statusCode = 409; // Conflict
          oldRes.end(JSON.stringify({ error: "New synchronous request superseded this one" }));
        } catch (e) {
          // ignore
        }
      }
    }
    this.pendingRequests.set(userId, res);

    // Timeout logic
    setTimeout(() => {
      if (this.pendingRequests.get(userId) === res) {
        this.pendingRequests.delete(userId);
        if (!res.writableEnded) {
          try {
            res.statusCode = 202; // Accepted (polling needed)
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ status: "accepted", message: "Processing continued, poll for results." }));
          } catch (e) {
             // ignore
          }
        }
      }
    }, timeoutMs);
  }

  // Called by Outbound Adapter
  async sendMessage(userId: string, message: SimpleWecomMessage, config: {
    webhookUrl?: string,
    webhookToken?: string,
    weworkApiUrl?: string,
    weworkNamespace?: string,
    weworkToken?: string,
    weworkCode?: string,
    corpid?: string,
    corpsecret?: string,
    agentid?: number,
    token?: string,
    encodingAESKey?: string
  }) {
    console.log(`[WeCom Client] sendMessage called - userId: ${userId}, text: ${message.text?.substring(0, 50)}..., mediaUrl: ${message.mediaUrl}`);

    // 🔧 Track recipient (but don't modify @all here - let channel.ts handle it)
    if (userId !== "@all") {
      this.lastRecipient = userId;
      console.log(`[WeCom Client] 📝 记录最后收件人: ${userId}`);
    }

    // 1. Check Sync
    const pendingRes = this.pendingRequests.get(userId);
    if (pendingRes && !pendingRes.writableEnded) {
      this.pendingRequests.delete(userId);
      try {
        pendingRes.statusCode = 200;
        pendingRes.setHeader("Content-Type", "application/json");
        pendingRes.end(JSON.stringify(message));
        return;
      } catch (e) {
        console.error("WeCom: Failed to write sync response", e);
        // Fallback to next method
      }
    }

    // 2. 企业微信官方 API（优先）
    if (config.corpid && config.corpsecret && config.agentid) {
      console.log("[WeCom Client] 使用官方 API 路径 (corpid + corpsecret + agentid)");
      try {
        // 如果有媒体文件，先上传获取 media_id，然后发送图片消息
        if (message.mediaUrl) {
          console.log(`[WeCom Client] 检测到 mediaUrl，开始媒体上传流程: ${message.mediaUrl}`);
          try {
            // 1. 下载/读取文件内容
            const fileBuffer = await this.fetchMediaFile(message.mediaUrl);

            // 2. 确定文件类型和文件名
            const { type, filename } = this.detectMediaType(message.mediaUrl);

            // 3. 上传到企业微信获取 media_id
            console.log(`[WeCom] 上传媒体文件: ${filename} (${type})`);
            const uploadResult = await wecomOfficialAPI.uploadMedia(
              config.corpid,
              config.corpsecret,
              type,
              fileBuffer,
              filename
            );

            console.log(`[WeCom] ✓ 上传成功，media_id: ${uploadResult.media_id}`);

            // 4. 发送图片消息
            const imagePayload = {
              msgtype: "image" as const,
              agentid: config.agentid,
              touser: userId,
              image: {
                media_id: uploadResult.media_id,
              },
            };

            const imageResult = await wecomOfficialAPI.sendMessage(
              config.corpid,
              config.corpsecret,
              imagePayload
            );

            console.log("企业微信图片消息发送成功:", imageResult);

            // 如果有附带文本，再发送一条文本消息
            if (message.text) {
              const textPayload = {
                msgtype: "text" as const,
                agentid: config.agentid,
                touser: userId,
                text: {
                  content: message.text,
                },
              };

              await wecomOfficialAPI.sendMessage(
                config.corpid,
                config.corpsecret,
                textPayload
              );
            }

            return; // Delivered
          } catch (uploadError) {
            console.error("企业微信媒体上传失败:", uploadError);
            // 降级：发送文本消息包含文件链接
            console.log("[WeCom] 降级为文本消息（包含文件链接）");
          }
        }

        // 发送纯文本消息
        const finalText = message.text || "";

        // 构造消息payload
        const payload = {
          msgtype: "text" as const,
          agentid: config.agentid,
          touser: userId,
          text: {
            content: finalText,
          },
        };

        const result = await wecomOfficialAPI.sendMessage(
          config.corpid,
          config.corpsecret,
          payload
        );

        console.log("企业微信官方API发送成功:", result);
        return; // Delivered
      } catch (error) {
        console.error("企业微信官方API错误:", error);
        // Fallback to next method
      }
    }

    // 3. 企业微信封装 API（向后兼容）
    if (config.weworkApiUrl && config.weworkToken && config.weworkCode) {
      console.log("[WeCom Client] 使用封装 API 路径 (weworkApiUrl + weworkToken + weworkCode)");
      try {
        const apiUrl = config.weworkApiUrl || "https://galaxy.ucloudadmin.com/";
        const namespace = config.weworkNamespace || "企业智瞰";

        let finalText = message.text || "";

        // 处理文件附件（如果有）
        if (message.mediaUrl) {
          finalText = finalText
            ? `${finalText}\n\n📎 附件: ${message.mediaUrl}`
            : `📎 附件: ${message.mediaUrl}`;
        }

        const payload = {
          Action: "Common.MessageWechat",
          Namespace: namespace,
          Token: config.weworkToken,
          Code: config.weworkCode,
          Data: {
            Text: finalText
          },
          ToEmails: [userId]
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log("企业微信封装API发送成功:", result);
          return; // Delivered
        }

        const errorText = await response.text();
        console.warn(`企业微信封装API失败: ${response.status} ${response.statusText}`, errorText);
        // Fallback to next method
      } catch (error) {
        console.error("企业微信封装API错误:", error);
        // Fallback to next method
      }
    }

    // 4. Check Generic Webhook (向后兼容)
    if (config.webhookUrl) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (config.webhookToken) {
          headers["Authorization"] = `Bearer ${config.webhookToken}`;
        }
        const body = JSON.stringify({
          recipientEmail: userId,
          ...message,
        });

        const response = await fetch(config.webhookUrl, {
          method: "POST",
          headers,
          body,
        });

        if (response.ok) {
          console.log("Webhook发送成功");
          return; // Delivered
        }
        console.warn(`Webhook失败: ${response.status} ${response.statusText}`);
        // Fallback to queue
      } catch (error) {
        console.error("Webhook错误:", error);
        // Fallback to queue
      }
    }

    // 5. Queue (最后的备用)
    console.log("消息加入队列:", userId);
    const queue = this.outboundQueue.get(userId) ?? [];
    queue.push(message);
    this.outboundQueue.set(userId, queue);
  }

  // Called by Gateway for Polling
  getPendingMessages(userId: string): SimpleWecomMessage[] {
    const messages = this.outboundQueue.get(userId) ?? [];
    this.outboundQueue.delete(userId);
    return messages;
  }
}

export const wecomClient = new SimpleWecomClient();
