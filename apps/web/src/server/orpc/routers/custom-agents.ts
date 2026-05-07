import { os } from "@/server/orpc/base";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

function resolveModelsUrl(url: string) {
  const trimmedUrl = url.trim().replace(/\/+$/, "");

  if (trimmedUrl.endsWith("/models")) return trimmedUrl;
  if (trimmedUrl.endsWith("/chat/completions")) {
    return `${trimmedUrl.slice(0, -"/chat/completions".length)}/models`;
  }
  if (trimmedUrl.endsWith("/v1")) return `${trimmedUrl}/models`;

  return `${trimmedUrl}/models`;
}

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
    const response = await fetch(resolveModelsUrl(input.url), {
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Agent returned ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id?: string | null }>;
    };

    const models = (data.data ?? [])
      .map((item) => item.id?.trim())
      .filter((model): model is string => Boolean(model));

    return { models };
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
