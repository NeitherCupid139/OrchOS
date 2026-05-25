import { os } from "@/server/orpc/base";
import {
  fetchOpenAICompatibleModels,
} from "@/server/modules/custom-agents/openai-compatible";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";
import { createServiceCache } from "@/server/service-cache";

const getService = createServiceCache((db) => new CustomAgentService(db));

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
  create: os.customAgents.create.handler(async ({ input }) => {
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
