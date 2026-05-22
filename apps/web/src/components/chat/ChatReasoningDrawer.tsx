import { memo } from "react";
import { formatDuration } from "@/lib/utils";

export const ChatReasoningDrawer = memo(function ChatReasoningDrawer({
  text,
  metadata,
}: {
  text: string;
  metadata?: { responseTime?: number };
}) {
  const preview = text.replace(/\s+/g, " ").trim();

  return (
    <div>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/30 transition-colors">
          <span className="size-1.5 rounded-full bg-emerald-500/80 shrink-0" aria-hidden="true" />
          <span className="font-medium text-foreground/70">Reasoning</span>
          {metadata?.responseTime != null && (
            <span className="text-muted-foreground/40">{formatDuration(metadata.responseTime)}</span>
          )}
          <span className="ml-auto shrink-0 opacity-30 group-open:rotate-90 transition-transform text-[10px]">›</span>
        </summary>
        <div className="mt-1">
          <div className="rounded border border-border/25 bg-muted/10 px-2.5 py-2 text-[11px] leading-5 text-foreground/60 whitespace-pre-wrap break-words">
            {preview}
          </div>
        </div>
      </details>
    </div>
  );
});
