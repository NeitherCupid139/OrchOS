import { afterEach, describe, expect, it, vi } from "vitest";
import { searchWebWithTavily } from "./tavily";

describe("searchWebWithTavily", () => {
  afterEach(() => {
    delete process.env.TAVILY_API_KEY;
  });

  it("calls Tavily with a normalized search payload", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      query: "latest bun release",
      answer: "Bun 1.3.11 is the latest release.",
      response_time: "1.2",
      request_id: "req_123",
      results: [
        {
          title: "Bun Releases",
          url: "https://bun.sh/blog",
          content: "Release notes",
          score: 0.98,
          favicon: "https://bun.sh/favicon.ico",
          published_date: "2026-05-19",
        },
      ],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(searchWebWithTavily(fetchMock, {
      query: " latest bun release ",
      topic: "news",
      searchDepth: "advanced",
      timeRange: "week",
      maxResults: 20,
      includeDomains: ["bun.sh", "  "],
      excludeDomains: ["example.com"],
    })).resolves.toEqual({
      query: "latest bun release",
      answer: "Bun 1.3.11 is the latest release.",
      responseTime: "1.2",
      requestId: "req_123",
      results: [
        {
          title: "Bun Releases",
          url: "https://bun.sh/blog",
          content: "Release notes",
          score: 0.98,
          favicon: "https://bun.sh/favicon.ico",
          publishedDate: "2026-05-19",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer tvly-test",
      },
      body: JSON.stringify({
        query: "latest bun release",
        topic: "news",
        search_depth: "advanced",
        time_range: "week",
        max_results: 10,
        include_answer: "advanced",
        include_favicon: true,
        include_domains: ["bun.sh"],
        exclude_domains: ["example.com"],
      }),
    });
  });

  it("fails fast when the API key is missing", async () => {
    await expect(searchWebWithTavily(vi.fn<typeof fetch>(), {
      query: "latest bun release",
    })).rejects.toThrow("TAVILY_API_KEY is not configured");
  });
});
