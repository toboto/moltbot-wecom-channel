import { XMLParser } from "fast-xml-parser";

/**
 * 企业微信消息类型
 */
export type WeComMessageType = "text" | "image" | "voice" | "video" | "location" | "link" | "event";

/**
 * 企业微信消息基础结构
 */
export interface WeComMessageBase {
  ToUserName: string;     // 企业微信CorpID
  FromUserName: string;   // 成员UserID
  CreateTime: number;     // 消息创建时间（整型）
  MsgType: WeComMessageType;
  AgentID: number;        // 企业应用的id
  MsgId?: string;         // 消息id，64位整型
}

/**
 * 文本消息
 */
export interface WeComTextMessage extends WeComMessageBase {
  MsgType: "text";
  Content: string;        // 文本消息内容
}

/**
 * 图片消息
 */
export interface WeComImageMessage extends WeComMessageBase {
  MsgType: "image";
  PicUrl: string;         // 图片链接
  MediaId: string;        // 图片媒体文件id
}

/**
 * 语音消息
 */
export interface WeComVoiceMessage extends WeComMessageBase {
  MsgType: "voice";
  MediaId: string;        // 语音媒体文件id
  Format: string;         // 语音格式，如amr，speex等
}

/**
 * 视频消息
 */
export interface WeComVideoMessage extends WeComMessageBase {
  MsgType: "video";
  MediaId: string;        // 视频媒体文件id
  ThumbMediaId: string;   // 视频消息缩略图的媒体id
}

/**
 * 位置消息
 */
export interface WeComLocationMessage extends WeComMessageBase {
  MsgType: "location";
  Location_X: number;     // 地理位置纬度
  Location_Y: number;     // 地理位置经度
  Scale: number;          // 地图缩放大小
  Label: string;          // 地理位置信息
  AppType?: string;       // app类型，在企业微信固定返回wxwork
}

/**
 * 链接消息
 */
export interface WeComLinkMessage extends WeComMessageBase {
  MsgType: "link";
  Title: string;          // 标题
  Description: string;    // 描述
  Url: string;            // 链接跳转的url
  PicUrl: string;         // 封面缩略图的url
}

/**
 * 联合类型：所有支持的消息类型
 */
export type WeComMessage =
  | WeComTextMessage
  | WeComImageMessage
  | WeComVoiceMessage
  | WeComVideoMessage
  | WeComLocationMessage
  | WeComLinkMessage;

/**
 * 解析企业微信 XML 消息
 */
export function parseWeComMessage(xml: string): WeComMessage {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  const result = parser.parse(xml);

  if (!result.xml) {
    throw new Error("Invalid WeChat message XML: missing <xml> root");
  }

  const msg = result.xml;

  // 验证必需字段
  if (!msg.ToUserName || !msg.FromUserName || !msg.MsgType) {
    throw new Error("Invalid WeChat message: missing required fields");
  }

  // 类型转换
  const baseMessage = {
    ToUserName: String(msg.ToUserName),
    FromUserName: String(msg.FromUserName),
    CreateTime: Number(msg.CreateTime) || 0,
    MsgType: msg.MsgType as WeComMessageType,
    AgentID: Number(msg.AgentID) || 0,
    MsgId: msg.MsgId ? String(msg.MsgId) : undefined,
  };

  // 根据消息类型返回对应的结构
  switch (msg.MsgType) {
    case "text":
      return {
        ...baseMessage,
        MsgType: "text",
        Content: String(msg.Content || ""),
      } as WeComTextMessage;

    case "image":
      return {
        ...baseMessage,
        MsgType: "image",
        PicUrl: String(msg.PicUrl || ""),
        MediaId: String(msg.MediaId || ""),
      } as WeComImageMessage;

    case "voice":
      return {
        ...baseMessage,
        MsgType: "voice",
        MediaId: String(msg.MediaId || ""),
        Format: String(msg.Format || ""),
      } as WeComVoiceMessage;

    case "video":
      return {
        ...baseMessage,
        MsgType: "video",
        MediaId: String(msg.MediaId || ""),
        ThumbMediaId: String(msg.ThumbMediaId || ""),
      } as WeComVideoMessage;

    case "location":
      return {
        ...baseMessage,
        MsgType: "location",
        Location_X: Number(msg.Location_X) || 0,
        Location_Y: Number(msg.Location_Y) || 0,
        Scale: Number(msg.Scale) || 0,
        Label: String(msg.Label || ""),
        AppType: msg.AppType ? String(msg.AppType) : undefined,
      } as WeComLocationMessage;

    case "link":
      return {
        ...baseMessage,
        MsgType: "link",
        Title: String(msg.Title || ""),
        Description: String(msg.Description || ""),
        Url: String(msg.Url || ""),
        PicUrl: String(msg.PicUrl || ""),
      } as WeComLinkMessage;

    default:
      throw new Error(`Unsupported message type: ${msg.MsgType}`);
  }
}

/**
 * 将企业微信消息转换为适合发送给 Clawdbot 的文本格式
 */
export function formatMessageForClawdbot(message: WeComMessage): {
  text: string;
  mediaUrls?: string[];
} {
  const mediaUrls: string[] = [];
  let text = "";

  switch (message.MsgType) {
    case "text":
      text = message.Content;
      break;

    case "image":
      text = "[图片消息]";
      if (message.PicUrl) {
        mediaUrls.push(message.PicUrl);
      }
      break;

    case "voice":
      text = `[语音消息]\n格式: ${message.Format}\nMediaId: ${message.MediaId}`;
      break;

    case "video":
      text = `[视频消息]\nMediaId: ${message.MediaId}`;
      break;

    case "location":
      text = `[位置消息]\n位置: ${message.Label}\n坐标: ${message.Location_X}, ${message.Location_Y}\n缩放: ${message.Scale}`;
      break;

    case "link":
      text = `[链接消息]\n标题: ${message.Title}\n描述: ${message.Description}\n链接: ${message.Url}`;
      if (message.PicUrl) {
        mediaUrls.push(message.PicUrl);
      }
      break;

    default:
      text = "[未知消息类型]";
  }

  return {
    text,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
  };
}
