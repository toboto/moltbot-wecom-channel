import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

/**
 * 腾讯云 ASR 配置
 */
export interface TencentAsrConfig {
  secretId: string;
  secretKey: string;
  region?: string;
  engineModelType?: string;
}

/**
 * ASR 识别结果
 */
export interface AsrResult {
  success: boolean;
  text?: string;
  error?: string;
  requestId?: string;
}

/**
 * 生成腾讯云 API v3 签名
 */
function generateSignature(
  secretKey: string,
  service: string,
  host: string,
  canonicalRequest: string,
  timestamp: number,
  date: string
): string {
  const algorithm = "TC3-HMAC-SHA256";
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");

  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const kDate = crypto
    .createHmac("sha256", `TC3${secretKey}`)
    .update(date)
    .digest();
  const kService = crypto.createHmac("sha256", kDate).update(service).digest();
  const kSigning = crypto
    .createHmac("sha256", kService)
    .update("tc3_request")
    .digest();

  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  return signature;
}

/**
 * 调用腾讯云一句话识别 API
 * 文档: https://cloud.tencent.com/document/api/1093/37823
 */
export async function recognizeVoice(
  audioFilePath: string,
  config: TencentAsrConfig
): Promise<AsrResult> {
  const service = "asr";
  const host = "asr.tencentcloudapi.com";
  const region = config.region || "ap-guangzhou";
  const action = "SentenceRecognition";
  const version = "2019-06-14";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split("T")[0];

  console.log(`[ASR] 开始语音识别`);
  console.log(`[ASR] 文件路径: ${audioFilePath}`);
  console.log(`[ASR] 地域: ${region}`);

  try {
    // 读取音频文件并转为 base64
    const audioBuffer = await readFile(audioFilePath);
    const audioBase64 = audioBuffer.toString("base64");
    const dataLen = audioBuffer.length;

    console.log(`[ASR] 文件大小: ${dataLen} bytes`);
    console.log(`[ASR] Base64 长度: ${audioBase64.length}`);

    // 构建请求体
    const payload = JSON.stringify({
      ProjectId: 0,
      SubServiceType: 2, // 一句话识别
      EngSerViceType: config.engineModelType || "16k_zh",
      SourceType: 1, // 语音 URL
      VoiceFormat: "amr", // 默认 AMR 格式，企业微信常用
      Data: audioBase64,
      DataLen: dataLen,
    });

    console.log(`[ASR] 请求体大小: ${payload.length} bytes`);

    // 构建 Canonical Request
    const hashedPayload = crypto.createHash("sha256").update(payload).digest("hex");
    const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
    const signedHeaders = "content-type;host";
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

    // 生成签名
    const signature = generateSignature(
      config.secretKey,
      service,
      host,
      canonicalRequest,
      timestamp,
      date
    );

    const authorization = `TC3-HMAC-SHA256 Credential=${config.secretId}/${date}/${service}/tc3_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    console.log(`[ASR] 发起 API 请求...`);

    // 发送请求
    const response = await fetch(`https://${host}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: host,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Timestamp": timestamp.toString(),
        "X-TC-Region": region,
        Authorization: authorization,
      },
      body: payload,
    });

    const responseText = await response.text();
    console.log(`[ASR] API 响应状态: ${response.status}`);
    console.log(`[ASR] API 响应: ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      return {
        success: false,
        error: `API 请求失败: ${response.status} ${response.statusText}`,
      };
    }

    const result = JSON.parse(responseText);

    // 检查是否有错误
    if (result.Response?.Error) {
      const error = result.Response.Error;
      console.error(`[ASR] API 错误: ${error.Code} - ${error.Message}`);
      return {
        success: false,
        error: `${error.Code}: ${error.Message}`,
        requestId: result.Response.RequestId,
      };
    }

    // 提取识别结果
    const recognizedText = result.Response?.Result;
    if (!recognizedText) {
      console.warn(`[ASR] 未识别到文字`);
      return {
        success: false,
        error: "未识别到语音内容",
        requestId: result.Response?.RequestId,
      };
    }

    console.log(`[ASR] ✓ 识别成功: ${recognizedText}`);
    return {
      success: true,
      text: recognizedText,
      requestId: result.Response?.RequestId,
    };
  } catch (error) {
    console.error(`[ASR] 识别失败:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
