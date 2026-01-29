import { readFile, unlink } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createHash, createHmac } from "node:crypto";

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  publicUrlBase?: string;
  pathPrefix?: string;
}

/**
 * 生成文件的唯一名称（保留原始扩展名）
 */
function generateUniqueFilename(originalPath: string): string {
  const ext = extname(originalPath);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
}

/**
 * 计算文件的 MD5 哈希
 */
async function calculateMD5(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("md5").update(content).digest("base64");
}

/**
 * 生成 UFile 签名（UCloud 对象存储）
 */
function generateUFileSignature(
  method: string,
  bucket: string,
  key: string,
  contentType: string,
  contentMD5: string,
  date: string,
  privateKey: string
): string {
  // UFile 签名格式: Signature = Base64(HMAC-SHA1(PrivateKey, StringToSign))
  // StringToSign = HTTP-Verb + "\n" + Content-MD5 + "\n" + Content-Type + "\n" + Date + "\n" + CanonicalizedResource
  const canonicalizedResource = `/${bucket}/${key}`;
  const stringToSign = `${method}\n${contentMD5 || ''}\n${contentType}\n${date}\n${canonicalizedResource}`;

  const signature = createHmac('sha1', privateKey)
    .update(stringToSign)
    .digest('base64');

  return signature;
}

/**
 * 生成 UFile 预签名 URL
 */
function generatePresignedUrl(
  bucket: string,
  objectKey: string,
  endpoint: string,
  publicKey: string,
  privateKey: string,
  expiresInSeconds: number = 604800 // 默认 7 天
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // UFile 预签名 URL 格式
  // StringToSign = "GET\n\n\n{expires}\n/{bucket}/{key}"
  const method = "GET";
  const canonicalizedResource = `/${bucket}/${objectKey}`;
  const stringToSign = `${method}\n\n\n${expires}\n${canonicalizedResource}`;

  const signature = createHmac('sha1', privateKey)
    .update(stringToSign)
    .digest('base64');

  // URL encode signature
  const encodedSignature = encodeURIComponent(signature);

  // 构建预签名 URL
  const baseEndpoint = endpoint.replace(/\/$/, "");
  const presignedUrl = `${baseEndpoint}/${objectKey}?UCloudPublicKey=${publicKey}&Expires=${expires}&Signature=${encodedSignature}`;

  return presignedUrl;
}

/**
 * 上传文件到 S3 兼容的对象存储（UCloud UFile）
 */
export async function uploadToS3(
  localFilePath: string,
  config: S3Config
): Promise<string> {
  try {
    // 读取文件内容
    const fileContent = await readFile(localFilePath);
    const contentType = getContentType(localFilePath);
    const filename = generateUniqueFilename(localFilePath);
    const objectKey = `${config.pathPrefix || ""}${filename}`;

    // 构建 URL
    const endpoint = config.endpoint.replace(/\/$/, "");
    const uploadUrl = `${endpoint}/${objectKey}`;

    // 生成签名
    const date = new Date().toUTCString();
    const method = "PUT";
    const contentMD5 = "";

    const signature = generateUFileSignature(
      method,
      config.bucket,
      objectKey,
      contentType,
      contentMD5,
      date,
      config.secretKey
    );

    // 准备请求头
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": fileContent.length.toString(),
      "Date": date,
      "Authorization": `UCloud ${config.accessKey}:${signature}`,
    };

    // 上传文件
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: fileContent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`S3 上传失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // 生成预签名 URL（7 天有效期）
    const presignedUrl = generatePresignedUrl(
      config.bucket,
      objectKey,
      endpoint,
      config.accessKey,
      config.secretKey,
      7 * 24 * 60 * 60 // 7 天
    );

    console.log(`文件已上传到 S3: ${presignedUrl}`);

    // 上传成功后删除本地临时文件
    try {
      await unlink(localFilePath);
      console.log(`已删除临时文件: ${localFilePath}`);
    } catch (e) {
      console.warn(`删除临时文件失败: ${localFilePath}`, e);
    }

    return presignedUrl;
  } catch (error) {
    console.error("S3 上传错误:", error);
    throw error;
  }
}

/**
 * 根据文件扩展名获取 Content-Type
 */
function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".zip": "application/zip",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
