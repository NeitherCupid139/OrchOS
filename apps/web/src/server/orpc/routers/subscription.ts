import { os } from "@/server/orpc/base";

export const subscriptionRouter = {
  get: os.subscription.get.handler(async () => {
    // Public stub — returns null.
    // The private @orchos/pro package provides the real implementation.
    return null;
  }),
  usage: os.subscription.usage.handler(async () => {
    return { items: [], total: 0 };
  }),
};
