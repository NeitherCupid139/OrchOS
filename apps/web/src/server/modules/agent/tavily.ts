const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

type TavilyTopic = "general" | "news" | "finance";
type TavilySearchDepth = "advanced" | "basic" | "fast" | "ultra-fast";
type TavilyTimeRange = "day" | "week" | "month" | "year";

export interface WebSearchInput {
  query: string;
  topic?: TavilyTopic;
  searchDepth?: TavilySearchDepth;
  timeRange?: TavilyTimeRange;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

type TavilyResult = {
  title?: string | null;
  url?: string | null;
  content?: string | null;
  score?: number | null;
  favicon?: string | null;
  published_date?: string | null;
};

type TavilySearchResponse = {
  query?: string;
  answer?: string | null;
  results?: TavilyResult[];
  response_time?: string | number | null;
  request_id?: string | null;
};

function clampMaxResults(value: number | undefined) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.trunc(value ?? 5)));
}

function normalizeDomains(value: string[] | undefined) {
  if (!Array.isArray(value)) return undefined;

  const domains = value
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  return domains.length > 0 ? domains : undefined;
}

function getTavilyApiKey() {
  return process.env.TAVILY_API_KEY?.trim() ?? "";
}

export async function searchWebWithTavily(
  fetchImpl: typeof fetch,
  input: WebSearchInput,
) {
  const apiKey = getTavilyApiKey();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const query = input.query.trim();
  if (!query) {
    throw new Error("query is required");
  }

  const response = await fetchImpl(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      topic: input.topic ?? "general",
      search_depth: input.searchDepth ?? "basic",
      time_range: input.timeRange,
      max_results: clampMaxResults(input.maxResults),
      include_answer: "advanced",
      include_favicon: true,
      include_domains: normalizeDomains(input.includeDomains),
      exclude_domains: normalizeDomains(input.excludeDomains),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Tavily search failed with HTTP ${response.status}${detail.trim() ? `: ${detail.trim().slice(0, 200)}` : ""}`,
    );
  }

  const data = await response.json() as TavilySearchResponse;

  return {
    query: data.query ?? query,
    answer: typeof data.answer === "string" ? data.answer : "",
    results: Array.isArray(data.results)
      ? data.results.map((result) => ({
        title: typeof result.title === "string" ? result.title : "",
        url: typeof result.url === "string" ? result.url : "",
        content: typeof result.content === "string" ? result.content : "",
        score: typeof result.score === "number" ? result.score : null,
        favicon: typeof result.favicon === "string" ? result.favicon : null,
        publishedDate: typeof result.published_date === "string" ? result.published_date : null,
      }))
      : [],
    responseTime: data.response_time ?? null,
    requestId: typeof data.request_id === "string" ? data.request_id : null,
  };
}
