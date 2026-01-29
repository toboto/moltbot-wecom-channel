import { accessTokenManager } from "./access-token.js";

/**
 * 企业微信消息类型
 */
export type WeComMessageType = "text" | "image" | "voice" | "video" | "file" | "textcard" | "news" | "mpnews" | "markdown";

/**
 * 文本消息
 */
export interface WeComTextMessagePayload {
  msgtype: "text";
  agentid: number;
  touser?: string;  // 成员ID列表（多个用 | 分隔，最多1000个）
  toparty?: string; // 部门ID列表（多个用 | 分隔，最多100个）
  totag?: string;   // 标签ID列表（多个用 | 分隔，最多100个）
  safe?: 0 | 1;     // 是否是保密消息，0表示可对外分享，1表示不能分享且内容显示水印，默认为0
  enable_id_trans?: 0 | 1; // 表示是否开启id转译，0表示否，1表示是，默认0
  enable_duplicate_check?: 0 | 1; // 表示是否开启重复消息检查，0表示否，1表示是，默认0
  duplicate_check_interval?: number; // 重复消息检查的时间间隔，默认1800s，最大不超过4小时
  text: {
    content: string;
  };
}

/**
 * Markdown 消息
 */
export interface WeComMarkdownMessagePayload {
  msgtype: "markdown";
  agentid: number;
  touser?: string;
  toparty?: string;
  totag?: string;
  markdown: {
    content: string;
  };
}

/**
 * 图片消息
 */
export interface WeComImageMessagePayload {
  msgtype: "image";
  agentid: number;
  touser?: string;
  toparty?: string;
  totag?: string;
  image: {
    media_id: string;
  };
}

/**
 * 文本卡片消息
 */
export interface WeComTextCardMessagePayload {
  msgtype: "textcard";
  agentid: number;
  touser?: string;
  toparty?: string;
  totag?: string;
  textcard: {
    title: string;
    description: string;
    url: string;
    btntxt?: string; // 按钮文字，默认为"详情"
  };
}

export type WeComSendMessagePayload =
  | WeComTextMessagePayload
  | WeComMarkdownMessagePayload
  | WeComImageMessagePayload
  | WeComTextCardMessagePayload;

/**
 * 企业微信官方 API 发送器
 */
export class WeComOfficialAPI {
  /**
   * 发送消息
   */
  async sendMessage(
    corpid: string,
    corpsecret: string,
    payload: WeComSendMessagePayload
  ): Promise<{ errcode: number; errmsg: string; invaliduser?: string; invalidparty?: string; invalidtag?: string }> {
    // 1. 获取 access_token
    const accessToken = await accessTokenManager.getAccessToken(
      corpid,
      corpsecret
    );

    // 2. 调用发送消息 API
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${encodeURIComponent(
      accessToken
    )}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `WeChat API request failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    // 检查返回结果
    if (result.errcode !== 0) {
      console.error("WeChat send message error:", result);

      // 如果 token 过期，清除缓存
      if (result.errcode === 40014 || result.errcode === 42001) {
        accessTokenManager.clearCache(corpid, corpsecret);
      }

      throw new Error(
        `WeChat API error: ${result.errcode} - ${result.errmsg}`
      );
    }

    return result;
  }

  /**
   * 上传临时素材
   * @param corpid 企业ID
   * @param corpsecret 应用Secret
   * @param type 媒体文件类型，分别有图片（image）、语音（voice）、视频（video），普通文件（file）
   * @param file 文件内容（Buffer 或 Blob）
   * @param filename 文件名
   */
  async uploadMedia(
    corpid: string,
    corpsecret: string,
    type: "image" | "voice" | "video" | "file",
    file: Buffer,
    filename: string
  ): Promise<{ type: string; media_id: string; created_at: number }> {
    const accessToken = await accessTokenManager.getAccessToken(
      corpid,
      corpsecret
    );

    const url = `https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=${encodeURIComponent(
      accessToken
    )}&type=${type}`;

    const formData = new FormData();
    const blob = new Blob([file]);
    formData.append("media", blob, filename);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `Upload media failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    if (result.errcode && result.errcode !== 0) {
      throw new Error(
        `WeChat upload error: ${result.errcode} - ${result.errmsg}`
      );
    }

    return result;
  }
}

export const wecomOfficialAPI = new WeComOfficialAPI();
