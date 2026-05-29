import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { onError } from "@orpc/client";

import type { AppContract } from "@/lib/orpc/contracts";

const RPC_REQUEST_TIMEOUT_MS = 300000;

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
      const controller = new AbortController();
      const abortRequest = (reason: DOMException) => {
        if (!controller.signal.aborted) {
          controller.abort(reason);
        }
      };
      const timeoutId = globalThis.setTimeout(
        () =>
          abortRequest(
            new DOMException(
              `ORPC request timed out after ${RPC_REQUEST_TIMEOUT_MS}ms`,
              "TimeoutError",
            ),
          ),
        RPC_REQUEST_TIMEOUT_MS,
      );
      const abortFromRequest = () => {
        const reason =
          input.signal.reason instanceof DOMException
            ? input.signal.reason
            : new DOMException("ORPC request was canceled by the caller.", "AbortError");

        abortRequest(reason);
      };

      if (input.signal.aborted) {
        abortFromRequest();
      } else {
        input.signal.addEventListener("abort", abortFromRequest, { once: true });
      }

      return fetch(input, {
        ...init,
        credentials: "include",
        signal: controller.signal,
      }).finally(() => {
        globalThis.clearTimeout(timeoutId);
        input.signal.removeEventListener("abort", abortFromRequest);
      });
    },
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  }),
);
