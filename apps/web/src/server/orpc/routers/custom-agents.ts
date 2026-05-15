import { os } from "@/server/orpc/base";
import {
  fetchOpenAICompatibleModels,
} from "@/server/modules/custom-agents/openai-compatible";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const customAgentsRouter = {
  list: os.customAgents.list.handler(async () => {
    const service = new CustomAgentService(await getLocalDb());
    return service.list();
  }),
  getDefault: os.customAgents.getDefault.handler(async () => {
    const service = new CustomAgentService(await getLocalDb());
    return { agentId: await service.getDefaultAgentId() };
  }),
  setDefault: os.customAgents.setDefault.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return { agentId: await service.setDefaultAgentId(input.agentId) };
  }),
  models: os.customAgents.models.handler(async ({ input }) => {
    return fetchOpenAICompatibleModels(fetch, input);
  }),
  create: os.customAgents.create.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return service.create(input);
  }),
  update: os.customAgents.update.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return service.update(input.id, {
      name: input.name,
      url: input.url,
      apiKey: input.apiKey,
      model: input.model,
    });
  }),
  delete: os.customAgents.delete.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return service.remove(input.id);
  }),
};
