function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function createHighlighter() {
  return {
    codeToHtml(code: string) {
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    },
  };
}
