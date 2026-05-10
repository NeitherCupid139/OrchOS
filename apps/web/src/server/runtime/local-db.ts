import type { AppDb } from "@/server/db/types";
import { createD1Db } from "@/server/db";
import { env } from "cloudflare:workers";

let dbInstancePromise: Promise<AppDb> | null = null;

function getCloudflareD1Binding() {
  const cloudflareEnv = env as Partial<Cloudflare.Env> | undefined;
  return cloudflareEnv?.DB;
}

export async function getLocalDb(): Promise<AppDb> {
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  const d1 = getCloudflareD1Binding();
  if (!d1) {
    throw new Error(
      "Cloudflare D1 binding \"DB\" is required in this environment. Ensure vite dev is running with @cloudflare/vite-plugin and apps/web/wrangler.jsonc is loaded.",
    );
  }

  dbInstancePromise = Promise.resolve(createD1Db(d1));

  return dbInstancePromise;
}
