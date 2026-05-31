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

/** Maximum number of additional languages to keep loaded beyond the core set. */
const MAX_EXTRA_LANGS = 6;

let highlighterPromise: Promise<Highlighter> | null = null;

/** Tracks loaded languages outside core set, with access timestamps for LRU eviction. */
const loadedExtraLangs = new Map<string, number>();
const coreLangSet = new Set<string>(CORE_LANGS);

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
 *
 * When the number of loaded extra languages exceeds MAX_EXTRA_LANGS,
 * the least-recently-used language is evicted.
 */
export async function ensureLanguage(lang: string): Promise<void> {
  if (coreLangSet.has(lang) || !LAZY_LANGS.has(lang)) return;

  const highlighter = await getSharedHighlighter();

  // Already loaded — update timestamp
  if (loadedExtraLangs.has(lang)) {
    loadedExtraLangs.set(lang, Date.now());
    return;
  }

  // Evict LRU if at capacity
  if (loadedExtraLangs.size >= MAX_EXTRA_LANGS) {
    let oldestLang: string | null = null;
    let oldestTime = Infinity;
    for (const [loadedLang, ts] of loadedExtraLangs) {
      if (ts < oldestTime) {
        oldestTime = ts;
        oldestLang = loadedLang;
      }
    }
    if (oldestLang) {
      loadedExtraLangs.delete(oldestLang);
    }
  }

  try {
    await highlighter.loadLanguage(lang as Parameters<typeof highlighter.loadLanguage>[0]);
    loadedExtraLangs.set(lang, Date.now());
    LAZY_LANGS.delete(lang);
  } catch {
    // Language not available — fall back to plain text
  }
}
