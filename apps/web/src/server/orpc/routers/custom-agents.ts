import { os } from "@/server/orpc/base";
import {
  fetchOpenAICompatibleModels,
} from "@/server/modules/custom-agents/openai-compatible";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { subscriptions } from "@/server/db/schema";
import { authenticateORPCRequest } from "@/server/orpc/context";
import { getLocalDb } from "@/server/runtime/local-db";
import { createServiceCache } from "@/server/service-cache";
import { isProEnabled } from "@/lib/pro-loader";
import { eq } from "drizzle-orm";

const getService = createServiceCache((db) => new CustomAgentService(db));

async function assertCanCreateCustomAgent(request: Request) {
  if (!isProEnabled()) return;

  const auth = await authenticateORPCRequest(request).catch(() => null);
  const userId = auth?.userId;
  if (!userId) {
    throw new Error("Custom agents require Pro");
  }

  const db = await getLocalDb();
  const subscription = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .get();

  if (subscription?.plan !== "pro" || subscription.status !== "active") {
    throw new Error("Custom agents require Pro");
  }
}

export const customAgentsRouter = {
  list: os.customAgents.list.handler(async () => {
    return getService(await getLocalDb()).list();
  }),
  getDefault: os.customAgents.getDefault.handler(async () => {
    return { agentId: await getService(await getLocalDb()).getDefaultAgentId() };
  }),
  setDefault: os.customAgents.setDefault.handler(async ({ input }) => {
    return { agentId: await getService(await getLocalDb()).setDefaultAgentId(input.agentId) };
  }),
  models: os.customAgents.models.handler(async ({ input }) => {
    return fetchOpenAICompatibleModels(fetch, input);
  }),
  create: os.customAgents.create.handler(async ({ input, context }) => {
    await assertCanCreateCustomAgent(context.request);
    return getService(await getLocalDb()).create(input);
  }),
  update: os.customAgents.update.handler(async ({ input }) => {
    return getService(await getLocalDb()).update(input.id, {
      name: input.name,
      url: input.url,
      apiKey: input.apiKey,
      model: input.model,
    });
  }),
  delete: os.customAgents.delete.handler(async ({ input }) => {
    return getService(await getLocalDb()).remove(input.id);
  }),
};
