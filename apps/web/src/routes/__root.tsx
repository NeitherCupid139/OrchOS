import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScriptPreferenceProvider } from "@/components/providers/ScriptPreferenceProvider";
import { I18nProvider } from "@/lib/i18n-provider";
import { getPublicRuntimeConfig } from "@/lib/public-runtime-config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getLocale } from "@/paraglide/runtime";
import { not_found, page_not_found } from "@/paraglide/messages";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: not_found() === "Not Found" ? "OrchOS" : "OrchOS",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="text-sm text-muted-foreground mt-1">{page_not_found()}</p>
      </div>
    </div>
  ),
  errorComponent: () => null,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const publicRuntimeConfig = getPublicRuntimeConfig();
  const serializedPublicRuntimeConfig = `window.__ORCHOS_PUBLIC_CONFIG__=${JSON.stringify(publicRuntimeConfig)};`;

  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script>{THEME_INIT_SCRIPT}</script>
        <script>{serializedPublicRuntimeConfig}</script>
        <HeadContent />
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]"
      >
        <I18nProvider>
          <ScriptPreferenceProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ScriptPreferenceProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
