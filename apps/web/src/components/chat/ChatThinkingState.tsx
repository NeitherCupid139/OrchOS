import { Spinner } from "@/components/ui/spinner";

import { assistant, thinking } from "@/paraglide/messages";

export function ChatThinkingState() {
  return (
    <div className="flex w-full gap-2.5">
      <span className="mt-[3px] inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
        <img src="/logo.svg" alt="" className="size-4" />
      </span>
      <div className="min-w-0 max-w-[85%]">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/60">{assistant()}</span>
        </div>
        <div className="rounded-2xl rounded-bl-sm bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <Spinner size="sm" name="braille" />
            </span>
            <span className="text-[11px] text-muted-foreground">{thinking()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
