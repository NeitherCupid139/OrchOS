import { describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/server";
import {
  buildOpenAICompatibleChatUrls,
  buildOpenAICompatibleModelUrls,
  fetchOpenAICompatibleModels,
} from "./openai-compatible";

describe("custom agent OpenAI-compatible URLs", () => {
  it("prefers /v1 model discovery for root URLs", () => {
    expect(buildOpenAICompatibleModelUrls("http://localhost:11434")).toEqual([
      "http://localhost:11434/v1/models",
      "http://localhost:11434/models",
    ]);
  });

  it("rewrites Ollama native /api URLs to /v1 model discovery", () => {
    expect(buildOpenAICompatibleModelUrls("http://localhost:11434/api")).toEqual([
      "http://localhost:11434/v1/models",
    ]);
  });

  it("rewrites Ollama native /api URLs to /v1 chat completions", () => {
    expect(buildOpenAICompatibleChatUrls("http://localhost:11434/api")).toEqual([
      "http://localhost:11434/v1/chat/completions",
    ]);
  });
});

describe("fetchOpenAICompatibleModels", () => {
  it("loads models from the rewritten /v1 endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "gpt-oss:20b" }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(fetchOpenAICompatibleModels(fetchMock, {
      url: "http://localhost:11434/api",
      apiKey: "ollama",
    })).resolves.toEqual({
      models: ["gpt-oss:20b"],
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:11434/v1/models", {
      headers: {
        Authorization: "Bearer ollama",
      },
    });
  });

  it("returns a user-facing upstream error instead of a generic internal error", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("not found", {
      status: 404,
    }));

    await expect(fetchOpenAICompatibleModels(fetchMock, {
      url: "http://localhost:11434/api",
      apiKey: "ollama",
    })).rejects.toEqual(expect.objectContaining<Partial<ORPCError<string, unknown>>>({
      code: "BAD_GATEWAY",
      message: expect.stringContaining("OpenAI-compatible /v1 endpoint"),
    }));
  });
});
