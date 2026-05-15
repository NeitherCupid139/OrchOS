import { CheckmarkCircle02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ChatClarificationCard({
  summary,
  questions,
}: {
  summary?: string;
  questions: string[];
}) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <Card size="sm" className="border border-border/70 bg-muted/20 shadow-none">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={InformationCircleIcon} className="size-4 text-amber-500" />
            Internal Clarification
          </CardTitle>
          <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/5 text-[10px] text-emerald-700">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
            Resolved
          </Badge>
        </div>
        <CardDescription>
          {summary || "Planning found a few ambiguities and resolved them internally before continuing."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div
              key={`${index}-${question}`}
              className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground/85"
            >
              <span className="mr-2 text-xs font-medium text-muted-foreground">{index + 1}.</span>
              {question}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
