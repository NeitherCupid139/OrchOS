import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  docs_audio_playground_title,
  docs_audio_playground_stop,
  docs_audio_playground_play,
  docs_audio_playground_caption,
  docs_audio_playground_preview_label,
  docs_audio_playground_preview_desc,
} from "@/paraglide/messages";

export function PlaygroundPreview() {
  const [active, setActive] = React.useState(false);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-5 py-3 text-sm text-muted-foreground">
        {docs_audio_playground_title()}
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-sm leading-6 text-foreground"><code className="language-ts">{`defineSound({\n  source: { type: "sine", frequency: { start: 400, end: 150 } },\n  envelope: { decay: 0.05 },\n  gain: 0.35,\n})`}</code></pre>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => setActive((value) => !value)}>
              {active
                ? docs_audio_playground_stop()
                : docs_audio_playground_play()}
            </Button>
            <span className="text-sm text-muted-foreground">
              {docs_audio_playground_caption()}
            </span>
          </div>
        </div>

        <div className="flex min-h-64 flex-col justify-between rounded-2xl border border-border bg-background p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {docs_audio_playground_preview_label()}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {docs_audio_playground_preview_desc()}
            </p>
          </div>

          <div className="flex items-end gap-2">
            {[0.35, 0.65, 0.95, 0.6, 0.25, 0.1].map((height) => (
              <div
                key={`bar-${height}`}
                className="w-full rounded-full bg-primary/80 transition-all duration-300"
                style={{
                  height: `${(active ? height : 0.12) * 120}px`,
                  opacity: active ? 1 : 0.45,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
