import type { ServerResponse } from "node:http";
import { wecomOfficialAPI } from "./official-api.js";

export interface SimpleWecomMessage {
  text?: string;
  mediaUrl?: string;
}

export class SimpleWecomClient {
  private outboundQueue = new Map<string, SimpleWecomMessage[]>();
  private pendingRequests = new Map<string, ServerResponse>();

  constructor() {}

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
        console.error("SimpleWeCom: Failed to write sync response", e);
        // Fallback to next method
      }
    }

    // 2. 企业微信官方 API（优先）
    if (config.corpid && config.corpsecret && config.agentid) {
      try {
        let finalText = message.text || "";

        // 处理文件附件（如果有）
        if (message.mediaUrl) {
          finalText = finalText
            ? `${finalText}\n\n📎 附件: ${message.mediaUrl}`
            : `📎 附件: ${message.mediaUrl}`;
        }

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

export const simpleWecomClient = new SimpleWecomClient();
