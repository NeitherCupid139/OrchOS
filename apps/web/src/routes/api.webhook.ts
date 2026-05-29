import { createFileRoute } from "@tanstack/react-router";
import { Webhooks } from "@dodopayments/tanstack";
import { getLocalDb } from "@/server/runtime/local-db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

function getUserId(payload: Record<string, unknown>): string | null {
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  if (metadata?.userId && typeof metadata.userId === "string") return metadata.userId;
  if (metadata?.user_id && typeof metadata.user_id === "string") return metadata.user_id;
  return null;
}

function createWebhookHandler() {
  const handler = Webhooks({
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? "",

    onSubscriptionActive: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;

      const db = await getLocalDb();
      const now = new Date().toISOString();
      const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();

      if (existing) {
        await db.update(subscriptions).set({ plan: "pro", status: "active", updatedAt: now }).where(eq(subscriptions.userId, userId)).run();
      } else {
        await db.insert(subscriptions).values({ userId, plan: "pro", creditsBalance: "1000", creditsTotal: "1000", tokensUsed: "0", status: "active", createdAt: now, updatedAt: now }).run();
      }
    },

    onSubscriptionCancelled: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;
      const db = await getLocalDb();
      await db.update(subscriptions).set({ status: "cancelled", updatedAt: new Date().toISOString() }).where(eq(subscriptions.userId, userId)).run();
    },

    onSubscriptionExpired: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;
      const db = await getLocalDb();
      await db.update(subscriptions).set({ plan: "free", status: "expired", creditsBalance: "100", creditsTotal: "100", updatedAt: new Date().toISOString() }).where(eq(subscriptions.userId, userId)).run();
    },

    onPaymentSucceeded: async (payload) => {
      const data = payload as Record<string, unknown>;
      const metadata = data.metadata as Record<string, unknown> | undefined;
      if (metadata?.plan !== "pro") {
        return;
      }
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
