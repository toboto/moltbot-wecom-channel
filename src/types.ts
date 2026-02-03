import type { z } from "zod";
import type { SimpleWecomAccountConfigSchema } from "./config-schema.js";

export type WecomTokenSource = "env" | "config" | "configFile" | "none";

export type ResolvedWecomAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  config: z.infer<typeof SimpleWecomAccountConfigSchema>;
  tokenSource: WecomTokenSource;
  token: string;
};
