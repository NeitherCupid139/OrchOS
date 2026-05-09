import { useCallback, useEffect, useReducer, useState } from "react";
import { createHighlighter } from "shiki";
import { Check, Copy } from "lucide-react";

import { m } from "@/paraglide/messages";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CHAT_CODE_LANGS = [
  "tsx",
  "typescript",
  "javascript",
  "jsx",
  "json",
  "css",
  "scss",
  "html",
  "markdown",
  "md",
  "bash",
  "shell",
  "diff",
];

let chatHighlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getChatHighlighter() {
  if (!chatHighlighterPromise) {
    chatHighlighterPromise = createHighlighter({
      langs: CHAT_CODE_LANGS,
      themes: ["github-dark", "github-light"],
    });
  }

  return chatHighlighterPromise;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeCodeLanguage(lang: string) {
  if (lang === "tsx") return "typescript";
  if (lang === "ts") return "typescript";
  if (lang === "js") return "javascript";
  if (lang === "md") return "markdown";
  if (lang === "sh") return "bash";
  return lang;
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
    };
  }, []);

  return theme;
}

type HighlightState = { html: string; loading: boolean };

type HighlightAction =
  | { type: "SET_LOADING" }
  | { type: "SET_DATA"; payload: string }
  | { type: "SET_ERROR"; payload: string };

function highlightReducer(state: HighlightState, action: HighlightAction): HighlightState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: true };
    case "SET_DATA":
      return { html: action.payload, loading: false };
    case "SET_ERROR":
      return { html: action.payload, loading: false };
  }
}

export function ChatCodeBlock({ code, language }: { code: string; language?: string }) {
  /* eslint-disable react--no-danger */
  const [highlight, dispatch] = useReducer(highlightReducer, { html: "", loading: true });
  const [copied, setCopied] = useState(false);
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    let mounted = true;

    async function highlight() {
      try {
        dispatch({ type: "SET_LOADING" });
        const highlighter = await getChatHighlighter();
        const highlightedHtml = highlighter.codeToHtml(code, {
          lang: normalizeCodeLanguage(language || "text"),
          theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
        });

        if (mounted) {
          dispatch({ type: "SET_DATA", payload: highlightedHtml });
        }
      } catch {
        if (mounted) {
          dispatch({ type: "SET_ERROR", payload: `<pre><code>${escapeHtml(code)}</code></pre>` });
        }
      }
    }

    void highlight();

    return () => {
      mounted = false;
    };
  }, [code, language, resolvedTheme]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [code]);

  return (
    <div className="my-2 overflow-hidden rounded-md border border-border/40 bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/30 px-2.5 py-1">
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {language || "text"}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <button
                {...props}
                type="button"
                className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
                onClick={() => void handleCopy()}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            )}
          />
          <TooltipContent side="top">{m.copy_file_content()}</TooltipContent>
        </Tooltip>
      </div>
      <div className="overflow-x-auto">
        {highlight.loading ? (
          <div className="px-3 py-4 text-[11px] text-muted-foreground/50 font-mono">{m.loading()}</div>
        ) : (
          /* react-doctor-disable-next-line react/no-danger */
          <div
            className="text-[0.8125rem] leading-[1.55] [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-3 [&_pre]:!text-[0.8125rem] [&_pre]:!leading-[1.55] [&_code]:!bg-transparent [&_code]:!p-0 [&_code]:!font-mono [&_code]:!text-[0.8125rem]"
            dangerouslySetInnerHTML={{ __html: highlight.html }}
          />
        )}
      </div>
    </div>
  );
  /* eslint-enable react--no-danger */
}
