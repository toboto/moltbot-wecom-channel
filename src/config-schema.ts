import { z } from "zod";

export const SimpleWecomAccountConfigSchema = z.object({
  enabled: z.boolean().optional(),

  // 企业微信应用配置
  corpid: z.string().optional().describe("企业微信 Corp ID"),
  corpsecret: z.string().optional().describe("企业微信 Corp Secret"),
  agentid: z.number().optional().describe("企业微信应用 Agent ID"),
  token: z.string().optional().describe("企业微信应用 Token"),
  encodingAESKey: z.string().optional().describe("企业微信消息加密密钥"),

  // 企业微信封装 API 配置（向后兼容）
  weworkApiUrl: z.string().optional().describe("企业微信 API URL (默认: https://galaxy.ucloudadmin.com/)"),
  weworkNamespace: z.string().optional().describe("企业微信 Namespace"),
  weworkToken: z.string().optional().describe("企业微信 API Token"),
  weworkCode: z.string().optional().describe("企业微信 API Code"),

  // 通用 Webhook 配置（向后兼容）
  webhookUrl: z.string().optional().describe("URL to POST outbound messages to"),
  webhookToken: z.string().optional().describe("Token to include in webhook requests"),

  // 自定义系统提示词
  systemPrompt: z.string().optional().describe("自定义系统提示词片段"),

  // 日志详细程度
  verbose: z.boolean().optional().describe("是否输出详细日志（包括完整XML和JSON）"),

  // 腾讯云 ASR 语音识别配置（可选）
  tencentAsr: z.object({
    enabled: z.boolean().optional().describe("是否启用腾讯云语音识别"),
    secretId: z.string().optional().describe("腾讯云 SecretId"),
    secretKey: z.string().optional().describe("腾讯云 SecretKey"),
    region: z.string().optional().default("ap-guangzhou").describe("腾讯云地域，默认广州"),
    engineModelType: z.string().optional().default("16k_zh").describe("引擎模型类型，默认 16k_zh 中文普通话"),
  }).optional().describe("腾讯云语音识别配置"),
}).strict();

export const SimpleWecomConfigSchema = SimpleWecomAccountConfigSchema.extend({
  accounts: z.record(z.string(), SimpleWecomAccountConfigSchema.optional()).optional(),
}).strict();
