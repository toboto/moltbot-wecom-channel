import {
  buildChannelConfigSchema,
  type ChannelPlugin,
  type ResolvedChannelAccount,
  DEFAULT_ACCOUNT_ID
} from "clawdbot/plugin-sdk";
import { SimpleWecomConfigSchema, type SimpleWecomAccountConfigSchema } from "./config-schema.js";
import { startSimpleWecomAccount } from "./gateway.js";
import { simpleWecomClient } from "./client.js";
import { getSimpleWecomRuntime } from "./runtime.js";
import type { z } from "zod";

type SimpleWecomConfig = z.infer<typeof SimpleWecomConfigSchema>;
type ResolvedSimpleWecomAccount = ResolvedChannelAccount<SimpleWecomConfig>;

export const simpleWecomPlugin: ChannelPlugin<ResolvedSimpleWecomAccount> = {
  id: "simple-wecom",
  meta: {
    id: "simple-wecom",
    name: "Simple WeCom",
    description: "Generic HTTP WeCom Integration",
    hidden: false,
    quickstartAllowFrom: true,
  },
  capabilities: {
    chatTypes: ["direct"],
    media: true,
    text: true,
    blockStreaming: true,
  },
  configSchema: buildChannelConfigSchema(SimpleWecomConfigSchema),
  config: {
    listAccountIds: (cfg) => {
        const accounts = cfg.channels?.["simple-wecom"]?.accounts;
        const ids = accounts ? Object.keys(accounts) : [];
        if (ids.length === 0 || !ids.includes(DEFAULT_ACCOUNT_ID)) {
             ids.unshift(DEFAULT_ACCOUNT_ID);
        }
        return ids;
    },
    resolveAccount: (cfg, accountId) => {
        const simpleWecom = cfg.channels?.["simple-wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = simpleWecom?.accounts?.[resolvedId];
        const defaults = { ...simpleWecom };
        if (defaults.accounts) delete defaults.accounts;
        
        // Merge defaults and account config
        const config = { ...defaults, ...account } as any;

        return {
            accountId: resolvedId,
            name: account?.name || resolvedId,
            enabled: account?.enabled ?? simpleWecom?.enabled ?? true,
            config: config,
            tokenSource: "config",
            token: "",
        };
    },
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: true,
      tokenSource: "config",
    }),
  },
  gateway: {
    startAccount: startSimpleWecomAccount,
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ to, text, accountId }) => {
        const runtime = getSimpleWecomRuntime();
        const cfg = await runtime.config.loadConfig();
        const simpleWecom = cfg.channels?.["simple-wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = simpleWecom?.accounts?.[resolvedId];
        const defaults = { ...simpleWecom };
        if (defaults.accounts) delete defaults.accounts;
        const config = { ...defaults, ...account } as any;

        await simpleWecomClient.sendMessage(to, { text }, {
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

        return { channel: "simple-wecom", ok: true };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId }) => {
        const runtime = getSimpleWecomRuntime();
        const cfg = await runtime.config.loadConfig();
        const simpleWecom = cfg.channels?.["simple-wecom"];
        const resolvedId = accountId ?? DEFAULT_ACCOUNT_ID;
        const account = simpleWecom?.accounts?.[resolvedId];
        const defaults = { ...simpleWecom };
        if (defaults.accounts) delete defaults.accounts;
        const config = { ...defaults, ...account } as any;

        await simpleWecomClient.sendMessage(to, { text, mediaUrl }, {
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

        return { channel: "simple-wecom", ok: true };
    }
  },
};
