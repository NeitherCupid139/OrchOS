import { ORPCError } from "@orpc/server";

export type UpstreamAttempt = {
  url: string;
  detail: string;
  status?: number;
};

function trimUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function addCandidate(candidates: string[], url: string | null) {
  if (!url) return;

  const trimmed = trimUrl(url);
  if (!trimmed || candidates.includes(trimmed)) return;

  candidates.push(trimmed);
}

function removeSuffix(url: string, suffix: string) {
  return url.endsWith(suffix) ? url.slice(0, -suffix.length) : null;
}

function stripLikelyOllamaNativeSuffix(url: string) {
  const suffixes = [
    "/api/chat",
    "/api/tags",
    "/api/generate",
    "/api/embed",
    "/api/embeddings",
    "/api",
  ];

  for (const suffix of suffixes) {
    const base = removeSuffix(url, suffix);
    if (base) return base;
  }

  return null;
}

function isLikelyOllamaNativeUrl(url: string) {
  return stripLikelyOllamaNativeSuffix(trimUrl(url)) !== null;
}

async function readFailureDetail(response: Response) {
  const text = await response.text().catch(() => "");
  const detail = text.trim().slice(0, 200);

  return detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`;
}

function formatEndpointError(operation: string, originalUrl: string, attempts: UpstreamAttempt[]) {
  const tried = attempts.map((attempt) => attempt.url).join(", ");
  const lastAttempt = attempts.at(-1);
  const lastDetail = lastAttempt ? ` Last error: ${lastAttempt.detail}.` : "";
  const hint = isLikelyOllamaNativeUrl(originalUrl)
    ? " Use an OpenAI-compatible /v1 endpoint instead of Ollama's native /api URL, for example http://<host>:11434/v1."
    : " Custom agents expect an OpenAI-compatible API.";

  return new ORPCError("BAD_GATEWAY", {
    message: `Unable to load ${operation} from this custom agent URL.${tried ? ` Tried: ${tried}.` : ""}${lastDetail}${hint}`,
  });
}

export function buildOpenAICompatibleModelUrls(url: string) {
  const normalized = trimUrl(url);
  const candidates: string[] = [];

  if (!normalized) return candidates;
  if (normalized.endsWith("/models")) return [normalized];

  const chatBase = removeSuffix(normalized, "/chat/completions");
  if (chatBase) {
    addCandidate(candidates, `${chatBase}/models`);
    if (!chatBase.endsWith("/v1")) {
      addCandidate(candidates, `${chatBase}/v1/models`);
    }
    return candidates;
  }

  if (normalized.endsWith("/v1")) {
    return [`${normalized}/models`];
  }

  const ollamaBase = stripLikelyOllamaNativeSuffix(normalized);
  if (ollamaBase) {
    return [`${ollamaBase}/v1/models`];
  }

  addCandidate(candidates, `${normalized}/v1/models`);
  addCandidate(candidates, `${normalized}/models`);
  return candidates;
}

export function buildOpenAICompatibleChatUrls(url: string) {
  const normalized = trimUrl(url);
  const candidates: string[] = [];

  if (!normalized) return candidates;
  if (normalized.endsWith("/chat/completions")) return [normalized];
  if (normalized.endsWith("/v1")) return [`${normalized}/chat/completions`];

  const ollamaBase = stripLikelyOllamaNativeSuffix(normalized);
  if (ollamaBase) {
    return [`${ollamaBase}/v1/chat/completions`];
  }

  addCandidate(candidates, `${normalized}/v1/chat/completions`);
  addCandidate(candidates, `${normalized}/chat/completions`);
  return candidates;
}

export async function fetchOpenAICompatibleModels(
  fetchImpl: typeof fetch,
  input: {
    url: string;
    apiKey: string;
  },
) {
  const attempts: UpstreamAttempt[] = [];

  for (const candidate of buildOpenAICompatibleModelUrls(input.url)) {
    try {
      const response = await fetchImpl(candidate, {
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
        },
      });

      if (!response.ok) {
        attempts.push({
          url: candidate,
          status: response.status,
          detail: await readFailureDetail(response),
        });
        continue;
      }

      const data = (await response.json()) as {
        data?: Array<{ id?: string | null }>;
      };

      const models: string[] = [];
      for (const item of data.data ?? []) {
        const id = item.id?.trim();
        if (id) models.push(id);
      }

      return { models };
    } catch (error) {
      attempts.push({
        url: candidate,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw formatEndpointError("models", input.url, attempts);
}

export async function requestOpenAICompatibleChatCompletion<T>(
  fetchImpl: typeof fetch,
  input: {
    url: string;
    apiKey: string;
    body: unknown;
  },
) {
  const attempts: UpstreamAttempt[] = [];

  for (const candidate of buildOpenAICompatibleChatUrls(input.url)) {
    try {
      const response = await fetchImpl(candidate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify(input.body),
      });

      if (!response.ok) {
        attempts.push({
          url: candidate,
          status: response.status,
          detail: await readFailureDetail(response),
        });
        continue;
      }

      return await response.json() as T;
    } catch (error) {
      attempts.push({
        url: candidate,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw formatEndpointError("chat completions", input.url, attempts);
}
