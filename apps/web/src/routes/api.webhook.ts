import { createFileRoute } from "@tanstack/react-router";
import { Webhooks } from "@dodopayments/tanstack";
import { getLocalDb } from "@/server/runtime/local-db";
import { subscriptions, creditUsage } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TOKEN_TOPUP = 100;

function getUserId(payload: Record<string, unknown>): string | null {
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  if (metadata?.userId && typeof metadata.userId === "string") return metadata.userId;
  if (metadata?.user_id && typeof metadata.user_id === "string") return metadata.user_id;
  return null;
}

function createWebhookHandler() {
  const handler = Webhooks({
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? "",

    onPaymentSucceeded: async (payload) => {
      const data = payload as Record<string, unknown>;
      const metadata = data.metadata as Record<string, unknown> | undefined;
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;

      // Determine token amount from metadata or use default
      const tokenAmount = typeof metadata?.tokens === "number"
        ? metadata.tokens
        : typeof metadata?.token_amount === "number"
          ? metadata.token_amount
          : DEFAULT_TOKEN_TOPUP;

      const db = await getLocalDb();
      const now = new Date().toISOString();

      // Upsert subscription row and add tokens
      const existing = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .get();

      if (existing) {
        const newBalance = Number(existing.creditsBalance) + tokenAmount;
        const newTotal = Number(existing.creditsTotal) + tokenAmount;
        await db
          .update(subscriptions)
          .set({
            creditsBalance: String(newBalance),
            creditsTotal: String(newTotal),
            updatedAt: now,
          })
          .where(eq(subscriptions.userId, userId))
          .run();
      } else {
        await db
          .insert(subscriptions)
          .values({
            userId,
            plan: "free",
            creditsBalance: String(tokenAmount),
            creditsTotal: String(tokenAmount),
            tokensUsed: "0",
            status: "active",
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      // Record the credit usage
      await db
        .insert(creditUsage)
        .values({
          id: crypto.randomUUID(),
          userId,
          action: "token_purchase",
          tokens: String(tokenAmount),
          credits: String(tokenAmount),
          metadata: JSON.stringify({
            paymentId: data.id,
            amount: data.amount,
            currency: data.currency,
          }),
          createdAt: now,
        })
        .run();
    },
  });

  return async (request: Request): Promise<Response> => {
    const result = await (handler as unknown as (req: Request) => Promise<Response>)(request);
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    });
  };
}

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => createWebhookHandler()(request),
    },
  },
});
