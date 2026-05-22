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
        try {
          const result = await handler.handle(request, {
            prefix: "/api/rpc",
            context: {
              request,
              headers: request.headers,
            },
          });

          return (
            result.response ??
            new Response(
              JSON.stringify({ code: "NOT_FOUND", message: "Procedure not found" }),
              {
                status: 404,
                headers: { "content-type": "application/json" },
              },
            )
          );
        } catch (error) {
          console.error("RPC handler threw unexpectedly", error);
          return new Response(
            JSON.stringify({
              code: "INTERNAL_SERVER_ERROR",
              message: "Internal server error",
            }),
            {
              status: 500,
              headers: { "content-type": "application/json" },
            },
          );
        }
      },
    },
  },
});
