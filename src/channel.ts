import {
  buildChannelConfigSchema,
  type ChannelPlugin,
  DEFAULT_ACCOUNT_ID
} from "openclaw/plugin-sdk";
import { SimpleWecomConfigSchema } from "./config-schema.js";
import { wecomClient } from "./client.js";
import { getWecomRuntime } from "./runtime.js";
import { wecomOnboardingAdapter } from "./onboarding.js";
import type { ResolvedWecomAccount } from "./types.js";
import type { z } from "zod";
import { getCurrentUserId } from "./session-context.js";

type WecomConfig = z.infer<typeof SimpleWecomConfigSchema>;

const meta = {
  id: "wecom",
  label: "WeCom",
  selectionLabel: "WeCom (Enterprise WeChat)",
  docsPath: "/channels/wecom",
  docsLabel: "wecom",
  blurb: "Enterprise WeChat (WeCom) channel integration.",
  aliases: ["wechat", "wework"],
  order: 90,
  quickstartAllowFrom: true,
};

export const wecomPlugin: ChannelPlugin<ResolvedWecomAccount> = {
  id: "wecom",
  meta,
  onboarding: wecomOnboardingAdapter,
  capabilities: {
    chatTypes: ["direct"],
    media: true,
    text: true,
    blockStreaming: true,
  },
  config: {
    listAccountIds: (cfg) => {
        const accounts = cfg.channels?.["wecom"]?.accounts;
        const ids = accounts ? Object.keys(accounts) : [];
        if (ids.length === 0 || !ids.includes(DEFAULT_ACCOUNT_ID)) {
             ids.unshift(DEFAULT_ACCOUNT_ID);
        }
        return ids;
    },
    resolveAccount: (cfg, accountId) => {
        const simpleWecom = cfg.channels?.["wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = simpleWecom?.accounts?.[resolvedId];
        const defaults = { ...simpleWecom };
        if (defaults.accounts) delete defaults.accounts;

        // Merge defaults and account config
        const config = { ...defaults, ...account } as any;

        return {
            accountId: resolvedId,
            name: String(account?.name || resolvedId),
            enabled: account?.enabled ?? simpleWecom?.enabled ?? true,
            config: config || {},
            tokenSource: "config",
            token: String(config?.token || ""),
        };
    },
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    isConfigured: (account) => {
      // WeCom requires corpid, agentid, and token to be configured
      const config = account?.config as any;
      const corpid = config?.corpid;
      const agentid = config?.agentid;
      const token = config?.token;

      return Boolean(
        corpid && typeof corpid === 'string' && corpid.trim() &&
        agentid &&
        token && typeof token === 'string' && token.trim()
      );
    },
    describeAccount: (account) => {
      const config = account?.config as any;
      const corpid = config?.corpid;
      const agentid = config?.agentid;
      const token = config?.token;

      const isConfigured = Boolean(
        corpid && typeof corpid === 'string' && corpid.trim() &&
        agentid &&
        token && typeof token === 'string' && token.trim()
      );

      return {
        accountId: String(account?.accountId || DEFAULT_ACCOUNT_ID),
        name: String(account?.name || DEFAULT_ACCOUNT_ID),
        enabled: Boolean(account?.enabled ?? true),
        configured: isConfigured,
        tokenSource: "config",
      };
    },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ to, text, accountId }) => {
        console.log(`[WeCom Channel] sendText called - to: ${to}, text: ${text?.substring(0, 50)}...`);

        // 🔧 Fix recipient when OpenClaw sends @all
        let recipient = to;
        if (to === "@all") {
            // Try AsyncLocalStorage first
            let currentUserId = getCurrentUserId();

            // Fallback to last known recipient
            if (!currentUserId && wecomClient.lastRecipient) {
                currentUserId = wecomClient.lastRecipient;
                console.log(`[WeCom Channel] 🔧 使用最后收件人: ${currentUserId}`);
            }

            if (currentUserId) {
                recipient = currentUserId;
                console.log(`[WeCom Channel] ✅ 修正收件人: @all → ${recipient}`);
            } else {
                console.warn(`[WeCom Channel] ⚠️  无法解析收件人，保持 @all (可能发给所有人)`);
            }
        }

        // 🔍 检测 markdown 图片语法并提取媒体 URL
        let mediaUrl: string | undefined;
        if (text) {
            const markdownImageRegex = /!\[.*?\]\(([/~][^\s)]+\.(?:png|jpg|jpeg|gif|webp|bmp|mp4|avi|mov|mp3|wav|amr))\)/gi;
            const markdownMatches = [...text.matchAll(markdownImageRegex)];
            if (markdownMatches && markdownMatches.length > 0) {
                mediaUrl = markdownMatches[0][1];
                console.log(`[WeCom Channel] 🖼️ 检测到 Markdown 图片: ${mediaUrl}`);
            }
        }

        const runtime = getWecomRuntime();
        const cfg = await runtime.config.loadConfig();
        const wecom = cfg.channels?.["wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = wecom?.accounts?.[resolvedId];
        const defaults = { ...wecom };
        if (defaults.accounts) delete defaults.accounts;
        const config = { ...defaults, ...account } as any;

        await wecomClient.sendMessage(recipient, { text, mediaUrl }, {
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

        return { channel: "wecom", ok: true };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId }) => {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`🎯🎯🎯 [WeCom Channel] ⚡ sendMedia DIRECTLY CALLED ⚡ 🎯🎯🎯`);
        console.log(`${"=".repeat(80)}`);
        console.log(`[sendMedia Params]`);
        console.log(`  to: ${to}`);
        console.log(`  text: ${text?.substring(0, 100)}...`);
        console.log(`  mediaUrl: ${mediaUrl}`);
        console.log(`  accountId: ${accountId}`);
        console.log(`${"=".repeat(80)}\n`);

        // 🔧 Fix recipient when OpenClaw sends @all
        let recipient = to;
        if (to === "@all") {
            // Try AsyncLocalStorage first
            let currentUserId = getCurrentUserId();

            // Fallback to last known recipient
            if (!currentUserId && wecomClient.lastRecipient) {
                currentUserId = wecomClient.lastRecipient;
                console.log(`[WeCom Channel] 🔧 使用最后收件人: ${currentUserId}`);
            }

            if (currentUserId) {
                recipient = currentUserId;
                console.log(`[WeCom Channel] ✅ 修正收件人: @all → ${recipient}`);
            } else {
                console.warn(`[WeCom Channel] ⚠️  无法解析收件人，保持 @all (可能发给所有人)`);
            }
        }

        const runtime = getWecomRuntime();
        const cfg = await runtime.config.loadConfig();
        const wecom = cfg.channels?.["wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = wecom?.accounts?.[resolvedId];
        const defaults = { ...wecom };
        if (defaults.accounts) delete defaults.accounts;
        const config = { ...defaults, ...account } as any;

        await wecomClient.sendMessage(recipient, { text, mediaUrl }, {
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

        return { channel: "wecom", ok: true };
    }
  },
};
