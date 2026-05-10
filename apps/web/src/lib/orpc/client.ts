import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { onError } from "@orpc/client";

import type { AppContract } from "@/lib/orpc/contracts";

function getRpcBaseUrl() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:3000/api/rpc";
  }

  return `${window.location.origin}/api/rpc`;
}

export const orpc: ContractRouterClient<AppContract> = createORPCClient(
  new RPCLink({
    url: getRpcBaseUrl(),
    headers: async () => {
      if (typeof window === "undefined") {
        return {};
      }

      try {
        const token = await window.Clerk?.session?.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Clerk token unavailable, continuing without auth.", error);
        }

        return {};
      }
    },
    fetch(input, init) {
      return fetch(input, {
        ...init,
        credentials: "include",
      });
    },
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  }),
);
