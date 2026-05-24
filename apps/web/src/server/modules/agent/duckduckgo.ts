const DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/";

export interface WebSearchInput {
  query: string;
  maxResults?: number;
  /** DuckDuckGo region parameter, e.g. "wt-wt" (worldwide), "cn-zh" (China), "us-en" (US) */
  region?: string;
  /** DuckDuckGo time filter: "d" (day), "w" (week), "m" (month), "y" (year) */
  timeRange?: "d" | "w" | "m" | "y";
  /** Exclude results from these domains (applied client-side after fetching) */
  excludeDomains?: string[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  error?: string;
}

function clampMaxResults(value: number | undefined) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.trunc(value ?? 5)));
}

function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeDuckDuckGoRedirectUrl(href: string): string {
  // DuckDuckGo wraps external URLs in redirect links
  // e.g. //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com or direct URL
  const trimmed = href.trim();

  if (trimmed.startsWith("//")) {
    // Protocol-relative URL
    const urlMatch = trimmed.match(/uddg=([^&]+)/);
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1]);
    }
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/l/")) {
    const urlMatch = trimmed.match(/uddg=([^&]+)/);
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1]);
    }
  }

  return trimmed;
}

function parseDuckDuckGoResults(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = [];

  // Split by result blocks — DuckDuckGo uses <div class="result "...
  // We split on a marker that appears before each result
  const blocks = html.split(/<div\s+class="result\s+/);

  // Skip index 0 (everything before the first result)
  for (const block of blocks.slice(1)) {
    // Extract the title link (<a class="result__a" rel="nofollow" href="...">Title</a>)
    const titleAnchorMatch = block.match(
      /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!titleAnchorMatch) continue;

    const rawUrl = titleAnchorMatch[1];
    const rawTitle = titleAnchorMatch[2];
    const url = decodeDuckDuckGoRedirectUrl(rawUrl);
    const title = stripHtmlTags(rawTitle);

    if (!title || !url) continue;

    // Extract the snippet — can be <a class="result__snippet" or <div class="result__snippet"
    const snippetMatch = block.match(
      /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i,
    );
    const snippetDivMatch = block.match(
      /<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );
    const rawContent = snippetMatch?.[1] ?? snippetDivMatch?.[1] ?? "";
    const content = stripHtmlTags(rawContent);

    results.push({ title, url, content });
  }

  return results;
}

export async function searchWebWithDuckDuckGo(
  fetchImpl: typeof fetch,
  input: WebSearchInput,
): Promise<WebSearchResponse> {
  const query = input.query.trim();
  if (!query) {
    return { query: "", results: [], error: "Query is required" };
  }

  const maxResults = clampMaxResults(input.maxResults);

  // Build form data for DuckDuckGo HTML search
  const formParams = new URLSearchParams();
  formParams.set("q", query);

  if (input.region) {
    formParams.set("kl", input.region);
  }

  // DuckDuckGo time range: df=d (day), df=w (week), df=m (month), df=y (year)
  if (input.timeRange) {
    formParams.set("df", input.timeRange);
  }

  try {
    const response = await fetchImpl(DUCKDUCKGO_HTML_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      body: formParams.toString(),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        query,
        results: [],
        error: `DuckDuckGo search failed with HTTP ${response.status}${detail.trim() ? `: ${detail.trim().slice(0, 200)}` : ""}`,
      };
    }

    const html = await response.text();
    const allResults = parseDuckDuckGoResults(html);

    // Apply exclude domains filter
    let filtered = allResults;
    if (Array.isArray(input.excludeDomains) && input.excludeDomains.length > 0) {
      const excludeSet = new Set(
        input.excludeDomains.map((d) => d.trim().toLowerCase()).filter(Boolean),
      );
      filtered = allResults.filter((r) => {
        try {
          const hostname = new URL(r.url).hostname.toLowerCase();
          return !excludeSet.has(hostname) &&
            !Array.from(excludeSet).some((ex) => hostname.endsWith(`.${ex}`) || hostname === ex);
        } catch {
          return true;
        }
      });
    }

    return {
      query,
      results: filtered.slice(0, maxResults),
    };
  } catch (error) {
    return {
      query,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
