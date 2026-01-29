import { registerPluginHttpRoute, type ChannelGatewayContext } from "clawdbot/plugin-sdk";
import { getSimpleWecomRuntime } from "./runtime.js";
import type { IncomingMessage } from "node:http";
import { simpleWecomClient, type SimpleWecomMessage } from "./client.js";
import { parseMultipart } from "./multipart.js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { verifySignature, decryptMessage, calculateSignature } from "./crypto.js";
import { parseWeComMessage, formatMessageForClawdbot } from "./message-parser.js";
import { XMLParser } from "fast-xml-parser";

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function startSimpleWecomAccount(ctx: ChannelGatewayContext) {
  const accountId = ctx.account.accountId;
  const config = ctx.account.config as any;

  // Register POST/GET /simple-wecom/message
  const unregisterMessage = registerPluginHttpRoute({
    pluginId: "simple-wecom",
    accountId,
    path: "/simple-wecom/message",
    handler: async (req, res) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);

      // ===== GET 请求：URL 验证（企业微信首次配置时） =====
      if (req.method === "GET") {
        const msgSignature = url.searchParams.get("msg_signature");
        const timestamp = url.searchParams.get("timestamp");
        const nonce = url.searchParams.get("nonce");
        const echostr = url.searchParams.get("echostr");

        const token = config.token;

        if (!token) {
          res.statusCode = 500;
          res.end("Token not configured");
          return;
        }

        if (!msgSignature || !timestamp || !nonce || !echostr) {
          res.statusCode = 400;
          res.end("Missing required parameters");
          return;
        }

        try {
          // 验证签名
          const expectedSignature = calculateSignature(token, timestamp, nonce, echostr);
          if (expectedSignature !== msgSignature) {
            res.statusCode = 403;
            res.end("Invalid signature");
            return;
          }

          // 解密 echostr 并返回
          const encodingAESKey = config.encodingAESKey;
          const corpid = config.corpid;

          if (!encodingAESKey || !corpid) {
            res.statusCode = 500;
            res.end("encodingAESKey or corpid not configured");
            return;
          }

          const decryptedEchoStr = decryptMessage(encodingAESKey, echostr, corpid);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/plain");
          res.end(decryptedEchoStr);
        } catch (error) {
          console.error("WeChat verification failed:", error);
          res.statusCode = 500;
          res.end(String(error));
        }
        return;
      }

      // ===== POST 请求：接收消息 =====
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("Method Not Allowed");
        return;
      }

      try {
        const contentType = req.headers["content-type"] || "";

        // 检测是否为企业微信加密消息（XML 格式）
        const isEncryptedWeComMessage =
          contentType.includes("text/xml") ||
          contentType.includes("application/xml") ||
          url.searchParams.has("msg_signature");

        if (isEncryptedWeComMessage) {
          // ===== 处理企业微信加密消息 =====
          await handleEncryptedWeComMessage(req, res, url, ctx, accountId);
        } else {
          // ===== 处理原有的 JSON/Multipart 格式（向后兼容）=====
          await handleLegacyMessage(req, res, contentType, ctx, accountId);
        }
      } catch (e) {
        console.error("SimpleWeCom handler error:", e);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end(String(e));
        }
      }
    },
  });

  // Register GET /simple-wecom/messages
  const unregisterPoll = registerPluginHttpRoute({
    pluginId: "simple-wecom",
    accountId,
    path: "/simple-wecom/messages",
    handler: async (req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end("Method Not Allowed");
        return;
      }

      // Parse query params manually or use URL
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const email = url.searchParams.get("email");

      if (!email) {
        res.statusCode = 400;
        res.end("Missing email param");
        return;
      }

      const messages = simpleWecomClient.getPendingMessages(email);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ messages }));
    },
  });

  return {
    stop: () => {
      unregisterMessage();
      unregisterPoll();
    },
  };
}

/**
 * 处理企业微信加密消息
 */
async function handleEncryptedWeComMessage(
  req: IncomingMessage,
  res: any,
  url: URL,
  ctx: ChannelGatewayContext,
  accountId: string
) {
  const config = ctx.account.config as any;

  // 1. 获取验证参数
  const msgSignature = url.searchParams.get("msg_signature");
  const timestamp = url.searchParams.get("timestamp");
  const nonce = url.searchParams.get("nonce");

  const token = config.token;
  const encodingAESKey = config.encodingAESKey;
  const corpid = config.corpid;

  if (!token || !encodingAESKey || !corpid) {
    res.statusCode = 500;
    res.end("Token, encodingAESKey or corpid not configured");
    return;
  }

  if (!msgSignature || !timestamp || !nonce) {
    res.statusCode = 400;
    res.end("Missing signature parameters");
    return;
  }

  // 2. 读取请求体（XML）
  const rawBody = await readBody(req);
  const xmlString = rawBody.toString("utf8");

  console.log("=== Received WeChat Encrypted Message ===");
  console.log("XML:", xmlString);

  // 3. 解析 XML 提取 Encrypt 字段
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });

  const xmlObj = parser.parse(xmlString);
  const encryptedMsg = xmlObj.xml?.Encrypt || xmlObj.xml?.encrypt;

  if (!encryptedMsg) {
    res.statusCode = 400;
    res.end("Missing Encrypt field in XML");
    return;
  }

  // 4. 验证签名
  const isValid = verifySignature(token, timestamp, nonce, encryptedMsg, msgSignature);
  if (!isValid) {
    console.error("Invalid message signature");
    res.statusCode = 403;
    res.end("Invalid signature");
    return;
  }

  // 5. 解密消息
  let decryptedXml: string;
  try {
    decryptedXml = decryptMessage(encodingAESKey, encryptedMsg, corpid);
    console.log("=== Decrypted Message XML ===");
    console.log(decryptedXml);
  } catch (error) {
    console.error("Decryption failed:", error);
    res.statusCode = 500;
    res.end("Decryption failed");
    return;
  }

  // 6. 解析企业微信消息
  const wecomMessage = parseWeComMessage(decryptedXml);
  console.log("=== Parsed WeChat Message ===");
  console.log(JSON.stringify(wecomMessage, null, 2));

  // 7. 转换为 Clawdbot 格式
  const { text, mediaUrls } = formatMessageForClawdbot(wecomMessage);
  const userId = wecomMessage.FromUserName;

  console.log("=== Simple WeCom Context to Agent ===");
  console.log("From:", userId);
  console.log("Body:", text);
  console.log("MediaUrls:", mediaUrls);
  console.log("===================================");

  // 8. 立即返回 success（企业微信要求5秒内响应）
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("success");

  // 9. 异步处理消息
  const systemPrompt = config.systemPrompt?.trim() || undefined;

  // Dispatch
  const runtime = getSimpleWecomRuntime();
  await runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: {
      From: userId,
      Body: text,
      AccountId: accountId,
      SessionKey: `simple-wecom:${accountId}:${userId}`,
      MediaUrls: mediaUrls,
      GroupSystemPrompt: systemPrompt,
    },
    cfg: ctx.cfg,
    dispatcherOptions: {
      responsePrefix: "",
      deliver: async (payload) => {
        console.log("=== Simple WeCom Deliver Payload ===");
        console.log("Text:", payload.text);
        console.log("MediaUrl:", payload.mediaUrl);
        console.log("================================");

        const msg: SimpleWecomMessage = {
          text: payload.text,
          mediaUrl: payload.mediaUrl
        };

        await simpleWecomClient.sendMessage(userId, msg, {
          webhookUrl: config.webhookUrl,
          webhookToken: config.webhookToken,
          weworkApiUrl: config.weworkApiUrl,
          weworkNamespace: config.weworkNamespace,
          weworkToken: config.weworkToken,
          weworkCode: config.weworkCode,
          corpid: config.corpid,
          corpsecret: config.corpsecret,
          agentid: config.agentid,
          token: config.token,
          encodingAESKey: config.encodingAESKey
        });
      },
      onError: (err) => {
        console.error("SimpleWeCom dispatch error:", err);
      },
    },
    replyOptions: {},
  });
}

/**
 * 处理原有的 JSON/Multipart 格式消息（向后兼容）
 */
async function handleLegacyMessage(
  req: IncomingMessage,
  res: any,
  contentType: string,
  ctx: ChannelGatewayContext,
  accountId: string
) {
  let email: string | undefined;
  let text: string | undefined;
  let imageUrl: string | undefined;
  let sync = false;
  const files: Array<{ filename: string; path: string; mimetype: string }> = [];

  if (contentType.includes("application/json")) {
    const raw = await readBody(req);
    if (raw.length === 0) {
      res.statusCode = 400;
      res.end("Empty body");
      return;
    }
    const body = JSON.parse(raw.toString());
    email = body.email;
    text = body.text;
    imageUrl = body.imageUrl;
    sync = Boolean(body.sync);
  } else if (contentType.includes("multipart/form-data")) {
    const boundary = contentType.split("boundary=")[1]?.split(";")[0];
    if (!boundary) throw new Error("No boundary");
    const buffer = await readBody(req);
    const result = parseMultipart(buffer, boundary);

    email = result.fields.email;
    text = result.fields.text;
    sync = result.fields.sync === "true";

    // Handle files
    for (const file of result.files) {
      const tempPath = join(tmpdir(), `simple-wecom-${randomUUID()}-${file.filename}`);
      await writeFile(tempPath, file.data);
      files.push({
        filename: file.filename,
        path: tempPath,
        mimetype: file.mimetype,
      });
    }
  }

  if (!email) {
    res.statusCode = 400;
    res.end("Missing email");
    return;
  }

  // Handle Sync Request
  if (sync) {
    simpleWecomClient.registerPendingRequest(email, res);
  } else {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok" }));
  }

  // Prepare Media
  const mediaUrls: string[] = [];
  if (imageUrl) mediaUrls.push(imageUrl);
  for (const file of files) {
    mediaUrls.push(`file://${file.path}`);
  }

  // 将文件路径添加到消息文本中，让 LLM 能看到
  let enrichedText = text || "";
  if (files.length > 0) {
    enrichedText += "\n\n[上传的文件]";
    for (const file of files) {
      enrichedText += `\n- ${file.filename}: ${file.path}`;
    }
  }

  console.log("=== Simple WeCom Context to Agent ===");
  console.log("From:", email);
  console.log("Body:", enrichedText);
  console.log("MediaUrls:", mediaUrls);
  console.log("Files count:", files.length);
  console.log("===================================");

  // Read systemPrompt from config
  const config = ctx.account.config as any;
  const systemPrompt = config.systemPrompt?.trim() || undefined;

  // Dispatch
  const runtime = getSimpleWecomRuntime();
  await runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: {
      From: email,
      Body: enrichedText,
      AccountId: accountId,
      SessionKey: `simple-wecom:${accountId}:${email}`,
      MediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      GroupSystemPrompt: systemPrompt,
    },
    cfg: ctx.cfg,
    dispatcherOptions: {
      responsePrefix: "",
      deliver: async (payload) => {
        console.log("=== Simple WeCom Deliver Payload ===");
        console.log("Text:", payload.text);
        console.log("MediaUrl:", payload.mediaUrl);
        console.log("================================");

        const config = ctx.account.config as any;
        const msg: SimpleWecomMessage = {
          text: payload.text,
          mediaUrl: payload.mediaUrl
        };

        await simpleWecomClient.sendMessage(email!, msg, {
          webhookUrl: config.webhookUrl,
          webhookToken: config.webhookToken,
          weworkApiUrl: config.weworkApiUrl,
          weworkNamespace: config.weworkNamespace,
          weworkToken: config.weworkToken,
          weworkCode: config.weworkCode,
          corpid: config.corpid,
          corpsecret: config.corpsecret,
          agentid: config.agentid,
          token: config.token,
          encodingAESKey: config.encodingAESKey
        });
      },
      onError: (err) => {
        console.error("SimpleWeCom dispatch error:", err);
      },
    },
    replyOptions: {},
  });
}
