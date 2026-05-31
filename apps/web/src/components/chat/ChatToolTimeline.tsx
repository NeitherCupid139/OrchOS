import { memo } from "react";
import { cn, formatDuration } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import {
  CalendarIcon,
  FolderIcon,
} from "lucide-react";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStructuredText(text: string) {
  const numberedLines = text.split("\n").map((line) => line.replace(/^\s*\d+:\s?/, ""));
  const normalized = numberedLines.join("\n").trim();

  return normalized
    .replace(/<content>\s*/g, "")
    .replace(/\s*<\/content>/g, "")
    .replace(/<result>\s*/g, "")
    .replace(/\s*<\/result>/g, "")
    .replace(/<summary>\s*/g, "")
    .replace(/\s*<\/summary>/g, "")
    .trim();
}

function extractPreviewText(text: string) {
  const normalized = normalizeStructuredText(text);
  const pathMatch = normalized.match(/<path>([^<]+)<\/path>/);

  if (pathMatch) return pathMatch[1].trim();

  const contentMatch = normalized.match(/<content>([\s\S]*)$/);
  const source = contentMatch ? contentMatch[1] : normalized;

  return source
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";
}

function isLikelyMarkdown(text: string) {
  const normalized = normalizeStructuredText(text);

  return /(^#{1,6}\s|[*_`]{1,2}[^*_`]+[*_`]{1,2}|^-{3,}$|^\*\s|^\d+\.\s|```|^\|.+\|$|^>\s|\[.*\]\(.+\)|<path>[^<]+<\/path>|<content>[\s\S]*<\/content>)/m.test(normalized);
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-5">
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/70">
        {label}
      </span>
      {isLikelyMarkdown(value) ? (
        <div className="min-w-0 flex-1 text-foreground/70 [&_p]:my-0.5 [&_p]:leading-5 [&_p]:text-[11px] [&_code]:text-[10px]">
          <ChatMarkdown content={normalizeStructuredText(value)} />
        </div>
      ) : (
        <span className="min-w-0 whitespace-pre-wrap break-words text-foreground/70">{normalizeStructuredText(value)}</span>
      )}
    </div>
  );
}

function JsonFallback({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded border border-border/25 bg-muted/15 p-2 text-[11px] leading-relaxed text-foreground/60">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ExpandableText({
  label,
  value,
  collapsedLines = 4,
}: {
  label: string;
  value: string;
  collapsedLines?: number;
}) {
  const isLong = value.length > 220 || value.split("\n").length > collapsedLines;
  const md = isLikelyMarkdown(value);
  const preview = extractPreviewText(value);
  const normalizedValue = normalizeStructuredText(value);

  if (!isLong) {
    return <KeyValueRow label={label} value={value} />;
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/70">
          {label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/50">
          {preview}
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50 group-open:hidden">展开</span>
        <span className="ml-auto hidden shrink-0 text-[10px] text-muted-foreground/50 group-open:inline">收起</span>
      </summary>
      <div className="mt-1">
        {md ? (
          <div className="text-[11px] text-foreground/70 [&_p]:my-0.5 [&_p]:leading-5 [&_p]:text-[11px] [&_code]:text-[10px] [&_pre]:my-1">
            <ChatMarkdown content={normalizedValue} />
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground/70">
            {normalizedValue}
          </div>
        )}
      </div>
    </details>
  );
}

function readToolType(partType: string) {
  return partType.startsWith("tool-") ? partType.replace(/^tool-/, "") : partType;
}

function BashToolCard({ input, output }: { input: unknown; output: unknown }) {
  const inputRecord = isRecord(input) ? input : undefined;
  const outputRecord = isRecord(output) ? output : undefined;
  const command = readString(inputRecord?.command);
  const description = readString(inputRecord?.description);
  const outputText =
    readString(outputRecord?.output) ||
    readString(outputRecord?.stdout) ||
    readString(outputRecord?.stderr);

  return (
    <div className="space-y-2 px-2.5 py-2">
      {description && <KeyValueRow label="说明" value={description} />}
      {command && <ExpandableText label="命令" value={command} />}
      {outputText && <ExpandableText label="输出" value={outputText} collapsedLines={8} />}
      {!description && !command && !outputText && (
        <ToolDetailCard input={input} output={output} />
      )}
    </div>
  );
}

function ReadToolCard({ input, output }: { input: unknown; output: unknown }) {
  const inputRecord = isRecord(input) ? input : undefined;
  const outputRecord = isRecord(output) ? output : undefined;
  const filePath = readString(inputRecord?.filePath);
  const preview =
    readString(outputRecord?.output) ||
    readString(outputRecord?.content) ||
    readString(outputRecord?.preview);

  return (
    <div className="space-y-2 px-2.5 py-2">
      {filePath && <KeyValueRow label="文件" value={filePath} />}
      {preview && <ExpandableText label="内容" value={preview} collapsedLines={8} />}
      {!filePath && !preview && <ToolDetailCard input={input} output={output} />}
    </div>
  );
}

function WriteToolCard({ input, output }: { input: unknown; output: unknown }) {
  const inputRecord = isRecord(input) ? input : undefined;
  const outputRecord = isRecord(output) ? output : undefined;
  const filePath = readString(inputRecord?.filePath) || readString(outputRecord?.path);
  const content = readString(inputRecord?.content);
  const status = readString(outputRecord?.status) || readString(outputRecord?.output);

  return (
    <div className="space-y-2 px-2.5 py-2">
      {filePath && <KeyValueRow label="文件" value={filePath} />}
      {content && <ExpandableText label="写入内容" value={content} collapsedLines={6} />}
      {status && <KeyValueRow label="结果" value={status} />}
      {!filePath && !content && !status && <ToolDetailCard input={input} output={output} />}
    </div>
  );
}

function GrepToolCard({ input, output }: { input: unknown; output: unknown }) {
  const inputRecord = isRecord(input) ? input : undefined;
  const outputRecord = isRecord(output) ? output : undefined;
  const pattern = readString(inputRecord?.pattern);
  const include = readString(inputRecord?.include);
  const path = readString(inputRecord?.path);
  const matches = readString(outputRecord?.output) || readString(outputRecord?.matches);

  return (
    <div className="space-y-2 px-2.5 py-2">
      {pattern && <KeyValueRow label="匹配" value={pattern} />}
      {include && <KeyValueRow label="范围" value={include} />}
      {path && <KeyValueRow label="目录" value={path} />}
      {matches && <ExpandableText label="结果" value={matches} collapsedLines={8} />}
      {!pattern && !include && !path && !matches && <ToolDetailCard input={input} output={output} />}
    </div>
  );
}

function MatchedRulesCard({ output }: { output: unknown }) {
  const rules = Array.isArray(output) ? output.filter(isRecord) : [];

  return (
    <div className="space-y-2 px-2.5 py-2">
      {rules.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">No rules were evaluated.</div>
      ) : (
        rules.map((rule, index) => {
          const name = readString(rule.name) || `Rule ${index + 1}`;
          const matched = rule.matched === true;
          const priority = readString(rule.priority);
          const scope = readString(rule.scope);
          const reasons = Array.isArray(rule.reasons) ? rule.reasons.map(String) : [];
          const taskTypes = Array.isArray(rule.taskTypes) ? rule.taskTypes.map(String) : [];
          const pathPatterns = Array.isArray(rule.pathPatterns) ? rule.pathPatterns.map(String) : [];

          return (
            <div key={name} className="rounded-lg border border-border/40 bg-background/60 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px]">
                <span className={cn("size-2 rounded-full", matched ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="font-medium text-foreground/80">{name}</span>
                {priority ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{priority}</span> : null}
                {scope ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{scope}</span> : null}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{matched ? "Matched" : "Not matched"}</div>
              {taskTypes.length > 0 ? <div className="mt-1 text-[11px] text-muted-foreground">Task types: {taskTypes.join(", ")}</div> : null}
              {pathPatterns.length > 0 ? <div className="mt-1 text-[11px] text-muted-foreground">Paths: {pathPatterns.join(", ")}</div> : null}
              {!matched && reasons.length > 0 ? <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Reasons: {reasons.join(", ")}</div> : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function ReminderToolCard({ output }: { output: unknown }) {
  const record = isRecord(output) ? output : undefined;
  const title = readString(record?.title);
  const notes = readString(record?.notes);
  const remindAt = readString(record?.remindAt);
  const completed = typeof record?.completed === "boolean" ? record.completed : undefined;
  const provider = readString(record?.provider) || "local";

  if (!title) return <ToolDetailCard input={undefined} output={output} />;

  return (
    <div className="space-y-1.5 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 font-medium text-foreground/80">{title}</span>
        {completed !== undefined && (
          <span className={cn("rounded px-1 py-0 text-[10px]", completed ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
            {completed ? "已完成" : "待办"}
          </span>
        )}
      </div>
      {notes && <KeyValueRow label="备注" value={notes} />}
      {remindAt && <KeyValueRow label="提醒时间" value={remindAt} />}
      <KeyValueRow label="来源" value={provider} />
    </div>
  );
}

function CalendarEventToolCard({ output }: { output: unknown }) {
  const record = isRecord(output) ? output : undefined;
  const event = isRecord(record?.event) ? record.event : record;
  const title = readString(event?.title);
  const description = readString(event?.description);
  const location = readString(event?.location);
  const startAt = readString(event?.startAt);
  const endAt = readString(event?.endAt);
  const allDay = event?.allDay === true;
  const provider = readString(event?.provider) || readString(record?.provider) || "local";

  if (!title) return <ToolDetailCard input={undefined} output={output} />;

  return (
    <div className="space-y-1.5 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-4 text-blue-500 shrink-0" />
        <span className="font-medium text-foreground/80">{title}</span>
      </div>
      {description && <KeyValueRow label="描述" value={description} />}
      {location && <KeyValueRow label="地点" value={location} />}
      {startAt && <KeyValueRow label="开始" value={startAt} />}
      {endAt && <KeyValueRow label="结束" value={endAt} />}
      {allDay && <KeyValueRow label="全天" value="是" />}
      <KeyValueRow label="来源" value={provider} />
    </div>
  );
}

function CurrentTimeToolCard({ output }: { output: unknown }) {
  const record = isRecord(output) ? output : undefined;
  const iso = readString(record?.iso);
  const timezone = readString(record?.timezone);
  const displayTime = iso ? formatCurrentTime(iso, timezone) : undefined;

  if (!iso && !timezone) return <ToolDetailCard input={undefined} output={output} />;

  return (
    <div className="space-y-1.5 px-2.5 py-2">
      {displayTime && <KeyValueRow label="当前时间" value={displayTime} />}
      {timezone && <KeyValueRow label="时区" value={timezone} />}
      {iso && <KeyValueRow label="ISO" value={iso} />}
    </div>
  );
}

function WebSearchToolCard({ output }: { output: unknown }) {
  const record = isRecord(output) ? output : undefined;
  const query = readString(record?.query);
  const results = Array.isArray(record?.results) ? record.results.filter(isRecord) : [];
  const success = record?.success === true;
  const error = readString(record?.error);

  return (
    <div className="space-y-2 px-2.5 py-2">
      {query && <KeyValueRow label="搜索" value={query} />}
      {!success && error && <KeyValueRow label="错误" value={error} />}
      {success && results.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">搜索结果 ({results.length})</div>
          {results.slice(0, 5).map((r, i) => {
            const title = readString(r.title) || `结果 ${i + 1}`;
            const snippet = readString(r.snippet) || readString(r.description);
            const url = readString(r.url) || readString(r.link);
            return (
              <div key={url || title} className="rounded border border-border/30 px-2 py-1.5">
                <div className="text-[11px] font-medium text-foreground/70">{title}</div>
                {snippet && <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{snippet}</div>}
                {url && <div className="mt-0.5 text-[10px] text-blue-500 truncate">{url}</div>}
              </div>
            );
          })}
        </div>
      )}
      {success && results.length === 0 && (
        <div className="text-[11px] text-muted-foreground">无搜索结果</div>
      )}
    </div>
  );
}

function BookmarkToolCard({ toolType, output }: { toolType: string; output: unknown }) {
  const record = isRecord(output) ? output : undefined;
  const name = readString(record?.name);
  const title = readString(record?.title);
  const url = readString(record?.url);
  const icon = readString(record?.icon);
  const categories = Array.isArray(record) ? record.filter(isRecord) : undefined;
  const categoryName = name || title;

  if (categories && toolType === "list_bookmarks") {
    if (categories.length === 0) {
      return <div className="px-2.5 py-2 text-[11px] text-muted-foreground">暂无书签</div>;
    }
    return (
      <div className="space-y-1.5 px-2.5 py-2">
        {categories.map((cat, i) => (
          <div key={readString(cat.name) || `cat-${i}`} className="rounded border border-border/30 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-medium text-foreground/70">{readString(cat.name) || `分类 ${i + 1}`}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (categoryName) {
    return (
      <div className="space-y-1.5 px-2.5 py-2">
        {icon && <KeyValueRow label="图标" value={icon} />}
        <KeyValueRow label="名称" value={categoryName} />
        {url && <KeyValueRow label="链接" value={url} />}
      </div>
    );
  }

  return <ToolDetailCard input={undefined} output={output} />;
}

function SpecializedToolCard({ toolType, input, output }: { toolType: string; input: unknown; output: unknown }) {
  if (toolType === "get_current_time") return <CurrentTimeToolCard output={output} />;
  if (toolType === "create_reminder") return <ReminderToolCard output={output} />;
  if (toolType === "create_calendar_event") return <CalendarEventToolCard output={output} />;
  if (toolType === "web_search") return <WebSearchToolCard output={output} />;
  if (toolType === "send_email") return <ToolDetailCard input={input} output={output} />;
  if (toolType === "list_bookmarks" || toolType === "create_bookmark_category" || toolType === "rename_bookmark_category" || toolType === "delete_bookmark_category" || toolType === "create_bookmark" || toolType === "rename_bookmark" || toolType === "move_bookmark" || toolType === "delete_bookmark" || toolType === "organize_bookmarks") {
    return <BookmarkToolCard toolType={toolType} output={output} />;
  }
  if (toolType === "matched_rules") return <MatchedRulesCard output={output} />;
  if (toolType === "bash") return <BashToolCard input={input} output={output} />;
  if (toolType === "read") return <ReadToolCard input={input} output={output} />;
  if (toolType === "write") return <WriteToolCard input={input} output={output} />;
  if (toolType === "grep") return <GrepToolCard input={input} output={output} />;

  return <ToolDetailCard input={input} output={output} />;
}

function formatCurrentTime(iso: string, timezone?: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    }).format(parsed);
  } catch {
    return iso;
  }
}

function ToolDetailCard({ input, output }: { input: unknown; output: unknown }) {
  const inputRecord = isRecord(input) ? input : undefined;
  const outputRecord = isRecord(output) ? output : undefined;
  const command = readString(inputRecord?.command);
  const description = readString(inputRecord?.description);
  const filePath = readString(inputRecord?.filePath);
  const promptPreview = readString(inputRecord?.promptPreview);
  const prompt = readString(inputRecord?.prompt);
  const phase = readString(outputRecord?.phase);
  const status = readString(outputRecord?.status);
  const outputText = readString(outputRecord?.output);

  const hasFriendlyRows =
    !!command ||
    !!description ||
    !!filePath ||
    !!promptPreview ||
    !!prompt ||
    !!phase ||
    !!status ||
    !!outputText;

  return (
    <div className="space-y-2 px-2.5 py-2">
      {hasFriendlyRows && (
        <div className="space-y-1.5">
          {description && <KeyValueRow label="说明" value={description} />}
          {command && <KeyValueRow label="命令" value={command} />}
          {filePath && <KeyValueRow label="文件" value={filePath} />}
          {promptPreview && <KeyValueRow label="摘要" value={promptPreview} />}
          {prompt && <KeyValueRow label="提示词" value={prompt} />}
          {phase && <KeyValueRow label="阶段" value={phase} />}
          {status && <KeyValueRow label="结果" value={status} />}
          {outputText && <ExpandableText label="输出" value={outputText} />}
        </div>
      )}

      {input !== undefined && (!inputRecord || Object.keys(inputRecord).length === 0 || !hasFriendlyRows) && (
        <JsonFallback value={input} />
      )}

      {output !== undefined && output !== input && (!outputRecord || (Object.keys(outputRecord).length > 0 && !outputText && !phase && !status)) && (
        <JsonFallback value={output} />
      )}
    </div>
  );
}

function getToolStateLabel(state?: string, hasError?: boolean) {
  if (hasError || state === "output-error") return "失败";
  if (state === "output-denied") return "已拒绝";
  if (state === "output-available" || state === "completed") return "已完成";
  if (state === "pending") return "等待中";
  if (state === "in_progress" || state === "input-streaming") return "执行中";
  return "执行中";
}

function ToolStateDot({ state }: { state?: string }) {
  const tone =
    state === "output-error"
      ? "bg-destructive"
      : state === "output-denied"
        ? "bg-amber-500"
        : state === "output-available" || state === "completed"
          ? "bg-emerald-500"
          : "bg-sky-500";

  return <span className={cn("size-1.5 rounded-full shrink-0", tone)} />;
}

function getGroupedToolState(
  parts: Array<Record<string, unknown> & { type: string }>,
) {
  if (parts.some((part) => typeof part.errorText === "string")) return "output-error";
  if (parts.some((part) => {
    const state = typeof part.state === "string" ? part.state : undefined;
    return !state || state === "input-streaming" || state === "in_progress";
  })) return "in_progress";
  return "completed";
}

export const ChatToolTimelineGroup = memo(function ChatToolTimelineGroup({
  displayName,
  parts,
}: {
  displayName: string;
  parts: Array<Record<string, unknown> & { type: string }>;
}) {
  const state = getGroupedToolState(parts);
  const isRunning = state === "in_progress";
  const stateLabel = getToolStateLabel(state, state === "output-error");

  return (
    <div>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/30 transition-colors">
          {isRunning ? (
            <Spinner size="sm" name="braille" className="shrink-0" />
          ) : (
            <ToolStateDot state={state} />
          )}
          <span className="font-medium text-foreground/70">{displayName}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/70">
            {stateLabel}
          </span>
          <span className="text-[10px] text-muted-foreground/45">{parts.length} 次</span>
          <span className="ml-auto shrink-0 select-none text-[10px] opacity-30 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-1 space-y-1">
          {parts.map((part, index) => {
            const input = "input" in part ? part.input : undefined;
            const output = "output" in part ? part.output : undefined;
            const errorText = typeof part.errorText === "string" ? part.errorText : undefined;
            const toolType = readToolType(part.type);

            return (
              <div key={`${part.type}-${index}`} className="rounded-md border border-border/25 bg-background/40">
                {(input !== undefined || output !== undefined) && (
                  <SpecializedToolCard toolType={toolType} input={input} output={output} />
                )}
                {errorText && (
                  <div className="mx-2 mb-2 rounded border border-destructive/15 bg-destructive/[0.04] px-2 py-1.5 text-[11px] text-destructive/80">
                    {errorText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
});

export const ChatToolTimeline = memo(function ChatToolTimeline({
  part,
}: {
  part: Record<string, unknown> & { type: string };
}) {
  const toolName =
    typeof part.toolDisplayName === "string"
      ? part.toolDisplayName
      : part.type.startsWith("tool-")
        ? part.type.replace(/^tool-/, "")
        : part.type;
  const state = typeof part.state === "string" ? part.state : undefined;
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;
  const errorText = typeof part.errorText === "string" ? part.errorText : undefined;
  const toolType = readToolType(part.type);
  const completedIn =
    output && typeof output === "object" && "responseTime" in output && typeof output.responseTime === "number"
      ? output.responseTime
      : undefined;
  const isRunning = !state || state === "input-streaming";
  const stateLabel = getToolStateLabel(state, !!errorText);

  return (
    <div>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/30 transition-colors">
          {isRunning ? (
            <Spinner size="sm" name="braille" className="shrink-0" />
          ) : (
            <ToolStateDot state={state} />
          )}
          <span className="font-medium text-foreground/70">{toolName}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/70">
            {stateLabel}
          </span>
          {completedIn != null && (
            <span className="text-muted-foreground/40">{formatDuration(completedIn)}</span>
          )}
          <span className="ml-auto shrink-0 select-none text-[10px] opacity-30 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-1 space-y-1">
          {(input !== undefined || output !== undefined) && (
            <SpecializedToolCard toolType={toolType} input={input} output={output} />
          )}
          {errorText && (
            <div className="rounded border border-destructive/15 bg-destructive/[0.04] px-2 py-1.5 text-[11px] text-destructive/80">
              {errorText}
            </div>
          )}
        </div>
      </details>
    </div>
  );
});
