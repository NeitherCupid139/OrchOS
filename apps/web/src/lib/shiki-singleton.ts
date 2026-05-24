import { createHighlighter, type Highlighter } from "shiki";

/**
 * Most commonly used languages in chat messages — loaded eagerly.
 * Keeps initial overhead small while covering ~95% of code blocks.
 */
const CORE_LANGS = [
  "typescript",
  "javascript",
  "bash",
  "json",
  "markdown",
  "text",
] as const;

/**
 * Secondary languages — loaded on demand when first encountered.
 */
const LAZY_LANGS = new Set([
  "tsx",
  "jsx",
  "css",
  "scss",
  "html",
  "xml",
  "diff",
  "yaml",
  "python",
  "rust",
  "go",
  "sql",
  "shell",
  "md",
]);

let highlighterPromise: Promise<Highlighter> | null = null;

export function getSharedHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: [...CORE_LANGS],
      themes: ["github-dark", "github-light"],
    });
  }
  return highlighterPromise;
}

/**
 * Ensure a language grammar is loaded. Called by ChatCodeBlock
 * before highlighting unknown languages.
 */
export async function ensureLanguage(lang: string): Promise<void> {
  if ((CORE_LANGS as readonly string[]).includes(lang) || !LAZY_LANGS.has(lang)) return;

  const highlighter = await getSharedHighlighter();
  try {
    await highlighter.loadLanguage(lang as Parameters<typeof highlighter.loadLanguage>[0]);
    LAZY_LANGS.delete(lang);
  } catch {
    // Language not available — fall back to plain text
  }
}
