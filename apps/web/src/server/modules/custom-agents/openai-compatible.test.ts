import { describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/server";
import {
  buildOpenAICompatibleChatUrls,
  buildOpenAICompatibleModelUrls,
  fetchOpenAICompatibleModels,
  inferOpenAICompatibleOperationForModel,
  requestOpenAICompatibleChatCompletion,
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

  it("routes Claude models to Anthropic messages endpoints", () => {
    expect(inferOpenAICompatibleOperationForModel("claude-sonnet-4-6")).toBe("messages");
  });

  it("routes GPT models to OpenAI responses endpoints", () => {
    expect(inferOpenAICompatibleOperationForModel("gpt-5.5")).toBe("responses");
  });

  it("keeps chat completions for generic OpenAI-compatible models", () => {
    expect(inferOpenAICompatibleOperationForModel("qwen3.6-plus")).toBe("chat/completions");
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

describe("requestOpenAICompatibleChatCompletion", () => {
  it("normalizes Anthropic messages responses into chat completion shape", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      content: [
        { type: "text", text: "Hello from Claude" },
      ],
      stop_reason: "end_turn",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(requestOpenAICompatibleChatCompletion(fetchMock, {
      url: "https://opencode.ai/zen/v1",
      apiKey: "test",
      model: "claude-sonnet-4-6",
      body: { model: "claude-sonnet-4-6", messages: [{ role: "user", content: "hi" }] },
    })).resolves.toEqual({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello from Claude",
          },
          finish_reason: "end_turn",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith("https://opencode.ai/zen/v1/messages", expect.objectContaining({
      method: "POST",
    }));
  });

  it("preserves Anthropic tool calls in chat completion shape", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      content: [
        { type: "text", text: "Looking that up." },
        {
          type: "tool_use",
          id: "toolu_123",
          name: "web_search",
          input: { query: "latest bun release" },
        },
      ],
      stop_reason: "tool_use",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(requestOpenAICompatibleChatCompletion(fetchMock, {
      url: "https://opencode.ai/zen/v1",
      apiKey: "test",
      model: "claude-sonnet-4-6",
      body: { model: "claude-sonnet-4-6", messages: [{ role: "user", content: "hi" }] },
    })).resolves.toEqual({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Looking that up.",
            tool_calls: [
              {
                id: "toolu_123",
                type: "function",
                function: {
                  name: "web_search",
                  arguments: "{\"query\":\"latest bun release\"}",
                },
              },
            ],
          },
          finish_reason: "tool_use",
        },
      ],
    });
  });

  it("normalizes OpenAI responses API responses into chat completion shape", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output: [
        {
          content: [
            { type: "output_text", text: "Hello from GPT" },
          ],
        },
      ],
      status: "completed",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(requestOpenAICompatibleChatCompletion(fetchMock, {
      url: "https://api.openai.com/v1",
      apiKey: "test",
      model: "gpt-5.5",
      body: { model: "gpt-5.5", input: [] },
    })).resolves.toEqual({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello from GPT",
          },
          finish_reason: "completed",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({
      method: "POST",
    }));
  });

  it("preserves Responses API tool calls in chat completion shape", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output: [
        {
          type: "function_call",
          call_id: "call_123",
          name: "web_search",
          arguments: "{\"query\":\"latest bun release\"}",
        },
      ],
      status: "completed",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(requestOpenAICompatibleChatCompletion(fetchMock, {
      url: "https://api.openai.com/v1",
      apiKey: "test",
      model: "gpt-5.5",
      body: { model: "gpt-5.5", input: [] },
    })).resolves.toEqual({
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_123",
                type: "function",
                function: {
                  name: "web_search",
                  arguments: "{\"query\":\"latest bun release\"}",
                },
              },
            ],
          },
          finish_reason: "completed",
        },
      ],
    });
  });
});
