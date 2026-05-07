import { oc } from "@orpc/contract";
import { z } from "zod";

export const modelStrategySchema = z.enum(["local-first", "cloud-first", "adaptive"]);

export const settingsSchema = z.object({
  autoCommit: z.boolean(),
  autoFix: z.boolean(),
  modelStrategy: modelStrategySchema,
  locale: z.string(),
  showShortcutHints: z.boolean(),
  useMixedScript: z.boolean(),
  preferKanji: z.boolean(),
});

export const settingsContract = {
  get: oc.input(z.object({}).optional()).output(settingsSchema),
  update: oc.input(settingsSchema.partial()).output(settingsSchema),
};
