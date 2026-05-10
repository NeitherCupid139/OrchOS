if (import.meta.env.DEV && typeof document !== "undefined") {
  void import("react-grab");
}

import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: import.meta.env.DEV ? false : "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
