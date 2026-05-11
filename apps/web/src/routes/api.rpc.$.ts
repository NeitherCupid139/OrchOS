import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";

import { appRouter } from "@/server/orpc/router";

const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      const errorDetails = error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            cause: "cause" in error ? error.cause : undefined,
          }
        : {
            message: String(error),
            stack: undefined,
            cause: undefined,
          };

      console.error("RPC route error", {
        ...errorDetails,
        error,
      });
    }),
  ],
});

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/api/rpc",
          context: {
            request,
            headers: request.headers,
          },
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});
