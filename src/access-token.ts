/**
 * 企业微信 Access Token 管理器
 * Token 有效期为 7200 秒（2小时），需要缓存和自动刷新
 */

interface AccessTokenCache {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export class WeComAccessTokenManager {
  private cache: Map<string, AccessTokenCache> = new Map();

  /**
   * 获取 Access Token（带缓存）
   * @param corpid 企业ID
   * @param corpsecret 应用Secret
   */
  async getAccessToken(corpid: string, corpsecret: string): Promise<string> {
    const cacheKey = `${corpid}:${corpsecret}`;
    const cached = this.cache.get(cacheKey);

    // 检查缓存是否有效（提前5分钟过期）
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.token;
    }

    // 获取新的 token
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(
      corpid
    )}&corpsecret=${encodeURIComponent(corpsecret)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to get access token: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.errcode !== 0) {
      throw new Error(
        `WeChat API error: ${data.errcode} - ${data.errmsg}`
      );
    }

    // 缓存 token（有效期减去10分钟作为安全边界）
    const expiresIn = (data.expires_in || 7200) * 1000;
    const expiresAt = Date.now() + expiresIn - 10 * 60 * 1000;

    this.cache.set(cacheKey, {
      token: data.access_token,
      expiresAt,
    });

    return data.access_token;
  }

  /**
   * 清除缓存（用于测试或强制刷新）
   */
  clearCache(corpid?: string, corpsecret?: string) {
    if (corpid && corpsecret) {
      this.cache.delete(`${corpid}:${corpsecret}`);
    } else {
      this.cache.clear();
    }
  }
}

export const accessTokenManager = new WeComAccessTokenManager();
