import { createHighlighter, type Highlighter } from "shiki";

const LANGS = [
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

let highlighterPromise: Promise<Highlighter> | null = null;

export function getSharedHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: LANGS,
      themes: ["github-dark", "github-light"],
    });
  }
  return highlighterPromise;
}
