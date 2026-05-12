import { HugeiconsIcon } from "@hugeicons/react";
import { Robot02Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";

import { cn, formatDuration } from "@/lib/utils";
import { assistant, user } from "@/paraglide/messages";

export function ChatMessageShell({
  role,
  isError,
  responseTime,
  children,
}: {
  role: "user" | "assistant";
  isError?: boolean;
  responseTime?: number;
  children: ReactNode;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("group w-full", isUser ? "pl-8" : "pr-8")}>
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
            isUser
              ? "bg-primary/10 text-primary"
              : isError
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
          )}
        >
          {isUser ? ">" : <HugeiconsIcon icon={Robot02Icon} className="size-3" />}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">{isUser ? user() : assistant()}</span>
            {responseTime != null && <span>{formatDuration(responseTime)}</span>}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
