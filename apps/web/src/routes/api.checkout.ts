import { createFileRoute } from "@tanstack/react-router";
import { Checkout } from "@dodopayments/tanstack";
import { authenticateORPCRequest } from "@/server/orpc/context";

const TOKEN_PRODUCT_IDS = {
  default:
    process.env.DODO_PAYMENTS_PRODUCT_ID ??
    process.env.DODO_PAYMENTS_PRO_PRODUCT_ID ??
    "",
  monthly: process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID ?? "",
  yearly: process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID ?? "",
};

function createCheckoutHandler() {
  const handler = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
    returnUrl: process.env.DODO_PAYMENTS_RETURN_URL ?? "/dashboard",
    environment:
      (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
      "test_mode",
    type: "static",
  });

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const requestedProductId = url.searchParams.get("productId");

    let productId: string;
    if (requestedProductId) {
      productId = requestedProductId;
    } else {
      productId =
        TOKEN_PRODUCT_IDS.default ||
        TOKEN_PRODUCT_IDS.monthly ||
        TOKEN_PRODUCT_IDS.yearly;
    }

    if (!productId) {
      return new Response("No product configured. Set DODO_PAYMENTS_PRODUCT_ID.", { status: 500 });
    }

    url.searchParams.set("productId", productId);
    url.searchParams.set("quantity", "1");
    url.searchParams.set("metadata_type", "token_purchase");

    const auth = await authenticateORPCRequest(request);
    if (auth?.userId) {
      url.searchParams.set("metadata_userId", auth.userId);
    }

    const checkoutRequest = new Request(url, request);
    const result = await (handler as unknown as (req: Request) => Promise<Response>)(checkoutRequest);
    if (!result.ok) {
      return new Response(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
      });
    }

    const body = (await result.json()) as { checkout_url?: string };
    if (!body.checkout_url) {
      return new Response("Checkout URL was not returned.", { status: 502 });
    }

    return Response.redirect(body.checkout_url, 302);
  };
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async ({ request }) => createCheckoutHandler()(request),
      POST: async () =>
        new Response("Use GET to initiate checkout.", {
          status: 405,
          headers: { Allow: "GET" },
        }),
    },
  },
});
