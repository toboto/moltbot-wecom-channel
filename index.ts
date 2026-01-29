import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";
import { simpleWecomPlugin } from "./src/channel.js";
import { setSimpleWecomRuntime } from "./src/runtime.js";

const plugin = {
  id: "simple-wecom",
  name: "Simple WeCom",
  description: "Generic HTTP-based WeCom integration",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setSimpleWecomRuntime(api.runtime);
    api.registerChannel({ plugin: simpleWecomPlugin });
  },
};

export default plugin;