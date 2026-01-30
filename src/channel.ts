import {
  buildChannelConfigSchema,
  type ChannelPlugin,
  type ResolvedChannelAccount,
  DEFAULT_ACCOUNT_ID
} from "openclaw/plugin-sdk";
import { SimpleWecomConfigSchema, type SimpleWecomAccountConfigSchema } from "./config-schema.js";
import { wecomClient } from "./client.js";
import { getWecomRuntime } from "./runtime.js";
import type { z } from "zod";

type WecomConfig = z.infer<typeof SimpleWecomConfigSchema>;
type ResolvedWecomAccount = ResolvedChannelAccount<WecomConfig>;

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
  capabilities: {
    chatTypes: ["direct"],
    media: true,
    text: true,
    blockStreaming: true,
  },
  configSchema: buildChannelConfigSchema(SimpleWecomConfigSchema),
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
        const runtime = getWecomRuntime();
        const cfg = await runtime.config.loadConfig();
        const wecom = cfg.channels?.["wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = wecom?.accounts?.[resolvedId];
        const defaults = { ...wecom };
        if (defaults.accounts) delete defaults.accounts;
        const config = { ...defaults, ...account } as any;

        await wecomClient.sendMessage(to, { text }, {
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
        const runtime = getWecomRuntime();
        const cfg = await runtime.config.loadConfig();
        const wecom = cfg.channels?.["wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = wecom?.accounts?.[resolvedId];
        const defaults = { ...wecom };
        if (defaults.accounts) delete defaults.accounts;
        const config = { ...defaults, ...account } as any;

        await wecomClient.sendMessage(to, { text, mediaUrl }, {
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
