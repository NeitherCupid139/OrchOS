import { describe, expect, it, vi } from "vitest";
import { searchWebWithDuckDuckGo } from "./duckduckgo";

function mockHtmlResponse(resultsHtml: string, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      `<!DOCTYPE html><html><body><div class="results">${resultsHtml}</div></body></html>`,
      {
        status,
        headers: { "Content-Type": "text/html" },
      },
    ),
  );
}

function resultBlock(
  url: string,
  title: string,
  snippet: string,
  overrides?: { href?: string },
) {
  const href = overrides?.href ?? url;
  return `
    <div class="result results_links results_links_deep">
      <div class="links_main links_deep result__body">
        <h2 class="result__title">
          <a class="result__a" rel="nofollow" href="${href}">${title}</a>
        </h2>
        <a class="result__snippet" href="${href}">${snippet}</a>
        <span class="result__url">${url}</span>
      </div>
    </div>`;
}

describe("searchWebWithDuckDuckGo", () => {
  it("returns parsed results from DuckDuckGo HTML", async () => {
    const fetchMock = mockHtmlResponse(
      resultBlock("https://example.com/page1", "Example Title 1", "Example snippet one.") +
        resultBlock("https://example.com/page2", "Example Title 2", "Example snippet two."),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test query",
      maxResults: 5,
    });

    expect(result.query).toBe("test query");
    expect(result.error).toBeUndefined();
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      title: "Example Title 1",
      url: "https://example.com/page1",
      content: "Example snippet one.",
    });
    expect(result.results[1]).toEqual({
      title: "Example Title 2",
      url: "https://example.com/page2",
      content: "Example snippet two.",
    });
  });

  it("decodes DuckDuckGo redirect URLs", async () => {
    const redirectUrl = "/l/?uddg=https%3A%2F%2Fexample.com%2Fpage&rut=abc123";
    const fetchMock = mockHtmlResponse(
      resultBlock("https://example.com/page", "Redirected Title", "Snippet", {
        href: redirectUrl,
      }),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
    });

    expect(result.results[0].url).toBe("https://example.com/page");
  });

  it("handles protocol-relative URLs", async () => {
    const protoRelativeUrl = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com";
    const fetchMock = mockHtmlResponse(
      resultBlock("https://example.com", "Proto Relative", "Snippet", {
        href: protoRelativeUrl,
      }),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
    });

    expect(result.results[0].url).toBe("https://example.com");
  });

  it("strips HTML tags from title and snippet", async () => {
    const fetchMock = mockHtmlResponse(
      `<div class="result results_links results_links_deep">
        <div class="links_main links_deep result__body">
          <h2 class="result__title">
            <a class="result__a" rel="nofollow" href="https://example.com">
              <b>Bold</b> &amp; <i>Italic</i>
            </a>
          </h2>
          <a class="result__snippet" href="https://example.com">
            Snippet with <b>bold</b> and &#39;quotes&#39;
          </a>
        </div>
      </div>`,
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
    });

    expect(result.results[0].title).toBe("Bold & Italic");
    expect(result.results[0].content).toBe("Snippet with bold and 'quotes'");
  });

  it("excludes domains when specified", async () => {
    const fetchMock = mockHtmlResponse(
      resultBlock("https://exclude.me/page", "Excluded", "Bad content") +
        resultBlock("https://keep.me/page", "Kept", "Good content"),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
      excludeDomains: ["exclude.me"],
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("Kept");
  });

  it("respects maxResults", async () => {
    const fetchMock = mockHtmlResponse(
      resultBlock("https://a.com/1", "A1", "Snippet 1") +
        resultBlock("https://a.com/2", "A2", "Snippet 2") +
        resultBlock("https://a.com/3", "A3", "Snippet 3"),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
      maxResults: 2,
    });

    expect(result.results).toHaveLength(2);
  });

  it("returns error for empty query", async () => {
    const result = await searchWebWithDuckDuckGo(vi.fn<typeof fetch>(), {
      query: "",
    });

    expect(result.error).toBe("Query is required");
    expect(result.results).toHaveLength(0);
  });

  it("returns error on HTTP failure", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("Rate limited", { status: 429 }),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
    });

    expect(result.error).toContain("HTTP 429");
    expect(result.results).toHaveLength(0);
  });

  it("handles network errors gracefully", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("ENOTFOUND"));

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
    });

    expect(result.error).toBe("ENOTFOUND");
    expect(result.results).toHaveLength(0);
  });

  it("clamps maxResults between 1 and 10", async () => {
    const fetchMock = mockHtmlResponse(
      resultBlock("https://a.com/1", "A1", "S1") +
        resultBlock("https://a.com/2", "A2", "S2") +
        resultBlock("https://a.com/3", "A3", "S3") +
        resultBlock("https://a.com/4", "A4", "S4") +
        resultBlock("https://a.com/5", "A5", "S5") +
        resultBlock("https://a.com/6", "A6", "S6") +
        resultBlock("https://a.com/7", "A7", "S7") +
        resultBlock("https://a.com/8", "A8", "S8") +
        resultBlock("https://a.com/9", "A9", "S9") +
        resultBlock("https://a.com/10", "A10", "S10") +
        resultBlock("https://a.com/11", "A11", "S11"),
    );

    const result = await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
      maxResults: 100,
    });

    expect(result.results).toHaveLength(10);
  });

  it("passes region and timeRange parameters", async () => {
    const fetchMock = mockHtmlResponse(
      resultBlock("https://example.com", "Title", "Snippet"),
    );

    await searchWebWithDuckDuckGo(fetchMock, {
      query: "test",
      region: "us-en",
      timeRange: "w",
    });

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toBe("https://html.duckduckgo.com/html/");

    const body = fetchMock.mock.calls[0][1]?.body?.toString() ?? "";
    expect(body).toContain("q=test");
    expect(body).toContain("kl=us-en");
    expect(body).toContain("df=w");
  });
});
