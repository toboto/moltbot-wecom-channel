import type {
  ChannelOnboardingAdapter,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  promptAccountId,
} from "openclaw/plugin-sdk";

const channel = "wecom" as const;

function listWecomAccountIds(cfg: OpenClawConfig): string[] {
  const accounts = cfg.channels?.["wecom"]?.accounts;
  const ids = accounts ? Object.keys(accounts) : [];
  if (ids.length === 0 || !ids.includes(DEFAULT_ACCOUNT_ID)) {
    ids.unshift(DEFAULT_ACCOUNT_ID);
  }
  return ids;
}

function resolveDefaultWecomAccountId(_cfg: OpenClawConfig): string {
  return DEFAULT_ACCOUNT_ID;
}

const dmPolicy = {
  default: "pairing" as const,
  options: ["pairing", "allowlist", "open", "disabled"] as const,
};

export const wecomOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  dmPolicy,
  getStatus: async ({ cfg }) => {
    const wecomConfig = (cfg as OpenClawConfig).channels?.["wecom"];
    const configured = Boolean(
      wecomConfig?.corpid && wecomConfig?.agentid && wecomConfig?.token
    );
    return {
      channel,
      configured,
      statusLines: [`WeCom: ${configured ? "configured" : "needs configuration"}`],
      selectionHint: configured ? "configured" : "requires manual config",
      quickstartScore: configured ? 1 : 50,
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds }) => {
    const wecomOverride = accountOverrides.wecom?.trim();
    const defaultWecomAccountId = resolveDefaultWecomAccountId(cfg as OpenClawConfig);
    let wecomAccountId = wecomOverride
      ? normalizeAccountId(wecomOverride)
      : defaultWecomAccountId;

    if (shouldPromptAccountIds && !wecomOverride) {
      wecomAccountId = await promptAccountId({
        cfg: cfg as OpenClawConfig,
        prompter,
        label: "WeCom",
        currentId: wecomAccountId,
        listAccountIds: listWecomAccountIds,
        defaultAccountId: defaultWecomAccountId,
      });
    }

    let next = cfg as OpenClawConfig;
    const wecomConfig = next.channels?.["wecom"];
    const accountConfigured = Boolean(
      wecomConfig?.corpid && wecomConfig?.agentid && wecomConfig?.token
    );

    await prompter.note(
      `WeCom requires:\n` +
      `  1. Corp ID (企业ID)\n` +
      `  2. Corp Secret (应用密钥)\n` +
      `  3. Agent ID (应用ID)\n` +
      `  4. Token (回调Token)\n` +
      `  5. EncodingAESKey (加密密钥)\n\n` +
      `Get these from: https://work.weixin.qq.com/`,
      "WeCom Setup"
    );

    if (accountConfigured) {
      const keep = await prompter.confirm({
        message: "WeCom already configured. Keep current settings?",
        initialValue: true,
      });
      if (keep) {
        return { cfg: next };
      }
    }

    // Prompt for Corp ID
    const corpid = String(
      await prompter.text({
        message: "Enter Corp ID (企业ID)",
        placeholder: "ww...",
        defaultValue: wecomConfig?.corpid || "",
        validate: (value) => (value?.trim() ? undefined : "Corp ID is required"),
      })
    ).trim();

    // Prompt for Corp Secret
    const corpsecret = String(
      await prompter.text({
        message: "Enter Corp Secret (应用密钥)",
        placeholder: "Secret from app settings",
        defaultValue: wecomConfig?.corpsecret || "",
        validate: (value) => (value?.trim() ? undefined : "Corp Secret is required"),
      })
    ).trim();

    // Prompt for Agent ID
    const agentidStr = String(
      await prompter.text({
        message: "Enter Agent ID (应用ID)",
        placeholder: "1000001",
        defaultValue: wecomConfig?.agentid?.toString() || "",
        validate: (value) => {
          const num = parseInt(value?.trim() || "", 10);
          return !isNaN(num) && num > 0 ? undefined : "Agent ID must be a positive number";
        },
      })
    ).trim();
    const agentid = parseInt(agentidStr, 10);

    // Prompt for Token
    const token = String(
      await prompter.text({
        message: "Enter Token (回调Token)",
        placeholder: "Random string for callback verification",
        defaultValue: wecomConfig?.token || "",
        validate: (value) => (value?.trim() ? undefined : "Token is required"),
      })
    ).trim();

    // Prompt for EncodingAESKey
    const encodingAESKey = String(
      await prompter.text({
        message: "Enter EncodingAESKey (加密密钥)",
        placeholder: "43 character base64 string",
        defaultValue: wecomConfig?.encodingAESKey || "",
        validate: (value) => {
          const trimmed = value?.trim() || "";
          return trimmed.length === 43 ? undefined : "EncodingAESKey must be 43 characters";
        },
      })
    ).trim();

    // Update config
    const isDefault = wecomAccountId === DEFAULT_ACCOUNT_ID;
    if (isDefault) {
      next = {
        ...next,
        channels: {
          ...next.channels,
          wecom: {
            ...next.channels?.wecom,
            enabled: true,
            corpid,
            corpsecret,
            agentid,
            token,
            encodingAESKey,
          },
        },
      } as OpenClawConfig;
    } else {
      const accounts = { ...(next.channels?.wecom?.accounts ?? {}) };
      accounts[wecomAccountId] = {
        ...(accounts[wecomAccountId] ?? {}),
        enabled: true,
        corpid,
        corpsecret,
        agentid,
        token,
        encodingAESKey,
      };
      next = {
        ...next,
        channels: {
          ...next.channels,
          wecom: {
            ...next.channels?.wecom,
            accounts,
          },
        },
      } as OpenClawConfig;
    }

    await prompter.note(
      `✓ WeCom configured\n\n` +
      `Next steps:\n` +
      `  1. Configure callback URL in WeCom admin:\n` +
      `     http://your-gateway:port/wecom/message\n` +
      `  2. Restart gateway: openclaw gateway restart\n` +
      `  3. Test by sending a message in WeCom`,
      "Setup Complete"
    );

    return { cfg: next };
  },
};
