import type { PluginRuntime } from "openclaw/plugin-sdk";

let _runtime: PluginRuntime | undefined;

export function setWecomRuntime(runtime: PluginRuntime) {
  _runtime = runtime;
}

export function getWecomRuntime() {
  if (!_runtime) throw new Error("WeCom runtime not initialized");
  return _runtime;
}
