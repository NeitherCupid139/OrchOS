import { createClientOnlyFn } from "@tanstack/react-start";

type ClientApi = typeof import("./api.client")["api"];

const loadClientApi = createClientOnlyFn(async (): Promise<ClientApi> => {
  const { api } = await import("./api.client");
  return api;
});

let clientApiPromise: Promise<ClientApi> | null = null;
let resolvedClient: ClientApi | null = null;

async function getClientApi(): Promise<ClientApi> {
  if (resolvedClient) return resolvedClient;
  if (!clientApiPromise) {
    clientApiPromise = loadClientApi();
  }
  const client = await clientApiPromise;
  resolvedClient = client;
  return client;
}

// Cache method references after first resolution to avoid Proxy overhead
const methodCache = new Map<string, (...args: unknown[]) => unknown>();

function createCachedProxyMethod(property: string): (...args: unknown[]) => unknown {
  const cached = methodCache.get(property);
  if (cached) return cached;

  const fn = async (...args: unknown[]) => {
    const clientApi = await getClientApi();
    const value = clientApi[property as keyof ClientApi];

    if (typeof value !== "function") {
      return value;
    }

    return (value as (...fnArgs: unknown[]) => unknown)(...args);
  };

  methodCache.set(property, fn);
  return fn;
}

export const api = new Proxy({} as ClientApi, {
  get(_target, property) {
    const key = String(property);
    return createCachedProxyMethod(key);
  },
});

export { normalizeConversationMessage, normalizeInboxThread, normalizeTrace } from "./api.normalizers";
export { isRecord, readString, resolveApiUrl } from "./api.shared";
export type * from "./api.types";
