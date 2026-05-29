import ReactMarkdown from "react-markdown";
import { memo, type ComponentPropsWithoutRef, type ComponentType, type ReactElement, type ReactNode } from "react";
import { useEffect, useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import remarkGfm from "remark-gfm";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function stripNumberedLines(text: string): string {
  const lines = text.split("\n");
  const numberedLines = lines.filter((line) => /^\s*\d+:\s/.test(line)).length;

  if (numberedLines === 0) return text;
  if (numberedLines < Math.max(2, Math.ceil(lines.length * 0.6))) return text;

  return lines.map((line) => line.replace(/^\s*\d+:\s?/, "")).join("\n");
}

function preprocessAgentOutput(text: string): string {
  let result = text;

  result = stripNumberedLines(result);

  result = result.replace(/<path>([^<]+)<\/path>/g, (_, path) => {
    return `\`${path}\``;
  });

  result = result.replace(/<type>([^<]+)<\/type>/g, "`$1`");
  result = result.replace(/<content>([^<]*)<\/content>/g, "$1");
  result = result.replace(/<result>([^<]*)<\/result>/g, "$1");
  result = result.replace(/<error>([^<]*)<\/error>/g, "**Error:** $1");
  result = result.replace(/<tool>([^<]+)<\/tool>/g, "`$1`");
  result = result.replace(/<command>([^<]+)<\/command>/g, "`$1`");
  result = result.replace(/<file>([^<]+)<\/file>/g, "`$1`");
  result = result.replace(/<summary>([^<]*)<\/summary>/g, "$1");
  result = result.replace(/<\/?(?:path|type|content|result|error|tool|command|file|summary)>/g, "");

  // Some model outputs omit the blank line before markdown blocks.
  result = result.replace(/([。！？.!?])\s*(#{1,6}\s)/g, "$1\n\n$2");
  result = result.replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");
  result = result.replace(/([。！？.!?])\s*(\|[^\n]+\|\s*\n\|[-:|\s]+\|)/g, "$1\n\n$2");
  result = result.replace(/([^\n])\n(\|[^\n]+\|\s*\n\|[-:|\s]+\|)/g, "$1\n\n$2");

  return result;
}

function FilePathInline({ path }: { path: string }) {
  const filename = path.split("/").pop() || path;

  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.75rem] text-foreground/80">
      <HugeiconsIcon icon={Folder01Icon} className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate max-w-[280px]" title={path}>{filename}</span>
    </span>
  );
}

function getCodeText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map((child) => getCodeText(child)).join("");
  if (children && typeof children === "object" && "props" in children) {
    return getCodeText((children as ReactElement<{ children?: ReactNode }>).props.children);
  }

  return "";
}

const loadChatCodeBlock = createClientOnlyFn(async () => {
  const mod = await import("@/components/chat/ChatCodeBlock");
  return mod.ChatCodeBlock;
});

function ChatCodeBlockClient({ code, language }: { code: string; language?: string }) {
  const [Component, setComponent] = useState<ComponentType<{ code: string; language?: string }> | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadChatCodeBlock().then((loaded) => {
      if (mounted) {
        setComponent(() => loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!Component) {
    return (
      <pre className="my-2 overflow-x-auto rounded-md border border-border/40 bg-muted/20 p-3">
        <code>{code}</code>
      </pre>
    );
  }

  return <Component code={code} language={language} />;
}

export const ChatMarkdown = memo(function ChatMarkdown({ content }: { content: string }) {
  const processed = preprocessAgentOutput(content);

  return (
    <div className="prose prose-sm max-w-none text-inherit dark:prose-invert prose-headings:mb-1.5 prose-headings:mt-3 prose-headings:text-inherit prose-headings:font-semibold prose-p:my-1.5 prose-p:text-inherit prose-p:leading-6 prose-li:my-0.5 prose-li:text-inherit prose-strong:text-inherit prose-code:rounded prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.75rem] prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-blockquote:border-l-border/50 prose-blockquote:text-inherit prose-hr:border-border/40 prose-a:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline dark:prose-code:bg-white/8 prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:border-collapse prose-thead:border-b prose-th:border prose-th:border-border/40 prose-th:bg-muted/40 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-td:border prose-td:border-border/30 prose-td:px-3 prose-td:py-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              className="font-medium text-primary underline-offset-4 hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            />
          ),
          pre: ({ children }) => {
            const child = Array.isArray(children) ? children[0] : children;

            if (!child || typeof child !== "object" || !("props" in child)) {
              return <pre>{children}</pre>;
            }

            const codeChild = child as ReactElement<{ className?: string; children?: ReactNode }>;
            const match = /language-([\w-]+)/.exec(codeChild.props.className || "");
            const code = getCodeText(codeChild.props.children).replace(/\n$/, "");

            return <ChatCodeBlockClient code={code} language={match?.[1]} />;
          },
          code: ({
            node: _node,
            className,
            children,
            ...props
          }: ComponentPropsWithoutRef<"code"> & { node?: unknown }) => {
            const code = String(children).replace(/\n$/, "");

            if (code.startsWith("/") && code.includes(".")) {
              return <FilePathInline path={code} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});
