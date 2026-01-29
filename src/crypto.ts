import { createDecipheriv, createHash } from "node:crypto";

/**
 * 企业微信消息加解密工具
 * 参考：https://developer.work.weixin.qq.com/document/path/90968
 */

/**
 * 计算签名
 */
export function calculateSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string
): string {
  const arr = [token, timestamp, nonce, encrypt].sort();
  const str = arr.join("");
  return createHash("sha1").update(str).digest("hex");
}

/**
 * 验证消息签名
 */
export function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
  signature: string
): boolean {
  const calculated = calculateSignature(token, timestamp, nonce, encrypt);
  return calculated === signature;
}

/**
 * 解密企业微信消息
 * @param encodingAESKey 43位字符的AES Key
 * @param encryptedMsg Base64编码的加密消息
 * @param corpId 企业ID（用于验证）
 * @returns 解密后的消息XML字符串
 */
export function decryptMessage(
  encodingAESKey: string,
  encryptedMsg: string,
  corpId: string
): string {
  // 1. 对encodingAESKey进行Base64解码，得到32字节的AES密钥
  // encodingAESKey是43位，补一个"="后是44位，正好是32字节的Base64
  const aesKeyBase64 = encodingAESKey + "=";
  const aesKey = Buffer.from(aesKeyBase64, "base64");

  if (aesKey.length !== 32) {
    throw new Error(`Invalid AES key length: ${aesKey.length}, expected 32`);
  }

  // 2. 对密文进行Base64解码
  const encryptedBuffer = Buffer.from(encryptedMsg, "base64");

  // 3. 使用AES-256-CBC解密
  // IV使用AES密钥的前16字节
  const iv = aesKey.slice(0, 16);
  const decipher = createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false); // 企业微信使用自定义PKCS7填充

  let decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  // 4. 去除PKCS7填充
  decrypted = removePKCS7Padding(decrypted);

  // 5. 解析解密后的内容
  // 格式：random(16字节) + msg_len(4字节，网络字节序) + msg + corpId
  if (decrypted.length < 20) {
    throw new Error("Decrypted message too short");
  }

  // 跳过前16字节的随机数
  let offset = 16;

  // 读取消息长度（4字节，大端序）
  const msgLen = decrypted.readUInt32BE(offset);
  offset += 4;

  // 提取消息内容
  if (offset + msgLen > decrypted.length) {
    throw new Error("Invalid message length");
  }

  const msg = decrypted.slice(offset, offset + msgLen).toString("utf8");
  offset += msgLen;

  // 提取并验证corpId
  const receivedCorpId = decrypted.slice(offset).toString("utf8");
  if (receivedCorpId !== corpId) {
    throw new Error(
      `CorpId mismatch: expected ${corpId}, got ${receivedCorpId}`
    );
  }

  return msg;
}

/**
 * 移除PKCS7填充
 */
function removePKCS7Padding(buffer: Buffer): Buffer {
  const paddingLength = buffer[buffer.length - 1];

  // 验证填充是否有效
  if (paddingLength < 1 || paddingLength > 32) {
    throw new Error("Invalid PKCS7 padding");
  }

  // 验证所有填充字节都是相同的值
  for (let i = 0; i < paddingLength; i++) {
    if (buffer[buffer.length - 1 - i] !== paddingLength) {
      throw new Error("Invalid PKCS7 padding");
    }
  }

  return buffer.slice(0, buffer.length - paddingLength);
}
