import { os } from "@/server/orpc/base";
import { RuntimeService } from "@/server/modules/runtime/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const runtimesRouter = {
  list: os.runtimes.list.handler(async () => {
    return RuntimeService.list(await getLocalDb());
  }),
  detect: os.runtimes.detect.handler(async () => {
    return RuntimeService.detect();
  }),
  registerDetected: os.runtimes.registerDetected.handler(async ({ input }) => {
    const [db, detected] = await Promise.all([
      getLocalDb(),
      RuntimeService.detect(),
    ]);
    const registered = [];
    const skipped = [];

    const runtimeIdSet = input.runtimeIds ? new Set(input.runtimeIds) : null;
    const candidates = detected.available.filter(
      (r) => input.registerAll || (runtimeIdSet && runtimeIdSet.has(r.id)),
    );

    const existingResults = await Promise.all(
      candidates.map((r) =>
        RuntimeService.getByName(db, r.name).then((existing) => ({ runtime: r, existing })),
      ),
    );

    for (const { runtime, existing } of existingResults) {
      if (existing) {
        skipped.push(runtime);
      } else {
        const profile = await RuntimeService.registerFromDetection(db, runtime);
        if (profile) registered.push(profile);
      }
    }

    return { registered, skipped };
  }),
  update: os.runtimes.update.handler(async ({ input }) => {
    const db = await getLocalDb();
    if (input.status !== undefined) return (await RuntimeService.updateStatus(db, input.id, input.status)) ?? null;
    if (input.enabled !== undefined) return (await RuntimeService.updateEnabled(db, input.id, input.enabled)) ?? null;
    if (input.transport !== undefined) return (await RuntimeService.updateConfig(db, input.id, { transport: input.transport })) ?? null;
    return (await RuntimeService.get(db, input.id)) ?? null;
  }),
  health: os.runtimes.health.handler(async ({ input }) => {
    return RuntimeService.healthCheck(input.runtimeId, {
      level: input.level,
      prompt: input.prompt,
    });
  }),
  models: os.runtimes.models.handler(async ({ input }) => {
    return RuntimeService.getCurrentModel(await getLocalDb(), input.runtimeId);
  }),
  chat: os.runtimes.chat.handler(async ({ input }) => {
    return RuntimeService.chat(await getLocalDb(), input.runtimeId, input.prompt);
  }),
};
