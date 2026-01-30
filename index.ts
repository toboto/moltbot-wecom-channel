import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { wecomPlugin } from "./src/channel.js";
import { setWecomRuntime } from "./src/runtime.js";
import { handleWecomWebhookRequest } from "./src/webhook.js";

const plugin = {
  id: "wecom",
  name: "WeCom (企业微信)",
  description: "Enterprise WeChat (WeCom) channel integration",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setWecomRuntime(api.runtime);
    api.registerChannel({ plugin: wecomPlugin });
    api.registerHttpHandler(handleWecomWebhookRequest);
  },
};

export default plugin;
