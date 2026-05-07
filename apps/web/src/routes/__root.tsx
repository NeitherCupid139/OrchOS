import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScriptPreferenceProvider } from "@/components/providers/ScriptPreferenceProvider";
import { I18nProvider } from "@/lib/i18n-provider";
import { getPublicRuntimeConfig } from "@/lib/public-runtime-config";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var raw=window.localStorage.getItem('orchos-ui');var mode='auto';if(raw){var parsed=JSON.parse(raw);if(parsed&&parsed.state&&parsed.state.theme){mode=parsed.state.theme}}var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

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
        title: m.not_found() === "Not Found" ? "OrchOS" : "OrchOS",
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
        <h1 className="text-2xl font-bold">404</h1>
        <p className="text-sm text-muted-foreground mt-1">{m.page_not_found()}</p>
      </div>
    </div>
  ),
  errorComponent: () => null,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const publicRuntimeConfig = getPublicRuntimeConfig();

  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);

  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ORCHOS_PUBLIC_CONFIG__=${JSON.stringify(publicRuntimeConfig)};`,
          }}
        />
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
