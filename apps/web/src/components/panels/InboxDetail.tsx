import { useCallback, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Robot02Icon,
  Mail01Icon,
  ArrowRight01Icon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  LinkSquare01Icon,
  TimeQuarterPassIcon,
  ArrowTurnBackwardIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { no_inbox_selected, no_inbox_selected_desc, no_project } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import type { InboxMessage, InboxThread, InboxMessageType } from "@/lib/api";
import type { Project } from "@/lib/types";

interface InboxDetailProps {
  thread: InboxThread;
  messages: InboxMessage[];
  projects: Project[];
  onOpenGoal?: () => void;
  onReply: (data: {
    body: string;
    subject?: string;
    to: string[];
    cc?: string[];
  }) => Promise<void>;
}

const messageTypeConfig: Record<
  InboxMessageType,
  {
    icon: typeof Mail01Icon;
    label: string;
    accentClass: string;
    badgeClass: string;
  }
> = {
  request: {
    icon: Mail01Icon,
    label: "Request",
    accentClass: "border-sky-500/20 bg-sky-500/[0.05]",
    badgeClass: "border-sky-500/25 text-sky-700 dark:text-sky-300",
  },
  status_update: {
    icon: TimeQuarterPassIcon,
    label: "Status Update",
    accentClass: "border-border bg-card/60",
    badgeClass: "border-border text-muted-foreground",
  },
  question: {
    icon: InformationCircleIcon,
    label: "Question",
    accentClass: "border-violet-500/20 bg-violet-500/[0.05]",
    badgeClass: "border-violet-500/25 text-violet-700 dark:text-violet-300",
  },
  blocker: {
    icon: Alert01Icon,
    label: "Blocker",
    accentClass: "border-destructive/20 bg-destructive/[0.05]",
    badgeClass: "border-destructive/25 text-destructive",
  },
  artifact: {
    icon: LinkSquare01Icon,
    label: "Artifact",
    accentClass: "border-amber-500/20 bg-amber-500/[0.05]",
    badgeClass: "border-amber-500/25 text-amber-700 dark:text-amber-300",
  },
  review_request: {
    icon: Mail01Icon,
    label: "Review Request",
    accentClass: "border-fuchsia-500/20 bg-fuchsia-500/[0.05]",
    badgeClass: "border-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300",
  },
  completion: {
    icon: CheckmarkCircle02Icon,
    label: "Completion",
    accentClass: "border-emerald-500/20 bg-emerald-500/[0.05]",
    badgeClass: "border-emerald-500/25 text-emerald-700 dark:text-emerald-300",
  },
  system_note: {
    icon: InformationCircleIcon,
    label: "System Note",
    accentClass: "border-border bg-muted/20",
    badgeClass: "border-border text-muted-foreground",
  },
};

function formatMessageType(type: InboxMessageType) {
  return messageTypeConfig[type]?.label || type.replaceAll("_", " ");
}

function formatTimestamp(value: string) {
  const [date, time] = value.split("T");
  return `${date} ${time?.slice(0, 5) || ""}`;
}

function renderMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </div>
          <div className="mt-1 break-words text-xs text-foreground/85">
            {typeof value === "string"
              ? value
              : typeof value === "number" || typeof value === "boolean"
                ? String(value)
                : JSON.stringify(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxDetail({ thread, messages, projects, onOpenGoal, onReply }: InboxDetailProps) {
  const [replyBody, setReplyBody] = useState("");
  const [sendingMode, setSendingMode] = useState<"reply" | "reply_all" | null>(null);
  const latestMessage = useMemo(() => messages[messages.length - 1], [messages]);
  const projectName = useMemo(
    () => projects.find((project) => project.id === thread.projectId)?.name,
    [projects, thread.projectId],
  );

  const submitReply = useCallback(
    async (mode: "reply" | "reply_all") => {
      const trimmed = replyBody.trim();
      if (!trimmed) return;

      const latestTo = latestMessage?.to || [];
      const latestCc = latestMessage?.cc || [];
      const to = mode === "reply_all" ? latestTo : latestTo.slice(0, 1);
      const cc = mode === "reply_all" ? latestCc : [];

      setSendingMode(mode);
      try {
        await onReply({
          body: trimmed,
          subject: latestMessage?.subject ? `Re: ${latestMessage.subject}` : thread.title,
          to,
          cc,
        });
        setReplyBody("");
      } catch (err) {
        console.error("Failed to send inbox reply:", err);
      } finally {
        setSendingMode(null);
      }
    },
    [latestMessage, onReply, replyBody, thread.title],
  );

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl p-6">
        <section className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate text-xl font-semibold text-foreground">{thread.title}</h1>
                <Badge variant="outline" className="text-[9px] uppercase tracking-[0.16em]">
                  {thread.kind.replaceAll("_", " ")}
                </Badge>
                <Badge variant="outline" className="text-[9px] uppercase tracking-[0.16em]">
                  {thread.status.replaceAll("_", " ")}
                </Badge>
              </div>
              {thread.summary && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{thread.summary}</p>}
            </div>

            {thread.primaryGoalId && onOpenGoal && (
              <Button size="sm" variant="outline" onClick={onOpenGoal}>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                Open Goal
              </Button>
            )}
          </div>

          <div className="mt-5 grid gap-3 border-t border-border/70 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</div>
              <div className="mt-1 text-foreground">{thread.createdByName}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
              <div className="mt-1 text-foreground">{projectName || (thread.projectId ? thread.projectId : no_project())}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Command</div>
              <div className="mt-1 font-mono text-xs text-foreground/85">{thread.commandId || "None"}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last Update</div>
              <div className="mt-1 text-foreground">{formatTimestamp(thread.lastMessageAt)}</div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            {messages.map((message) => {
              const config = messageTypeConfig[message.messageType];
              const senderIcon = message.senderType === "agent" ? Robot02Icon : Mail01Icon;

              return (
                <article key={message.id} className={cn("rounded-2xl border p-4 shadow-sm", config.accentClass)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-foreground">
                          <HugeiconsIcon icon={senderIcon} className="size-3.5" />
                          {message.senderName}
                        </span>
                        <Badge variant="outline" className={cn("text-[9px] uppercase tracking-[0.16em]", config.badgeClass)}>
                          {formatMessageType(message.messageType)}
                        </Badge>
                        <span>{formatTimestamp(message.createdAt)}</span>
                      </div>

                      {(message.to.length > 0 || message.cc.length > 0) && (
                        <div className="mt-3 grid gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-foreground/70">To</span>
                            <div className="mt-1 break-words">{message.to.length > 0 ? message.to.join(", ") : "None"}</div>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-foreground/70">Cc</span>
                            <div className="mt-1 break-words">{message.cc.length > 0 ? message.cc.join(", ") : "None"}</div>
                          </div>
                        </div>
                      )}

                      {message.subject && <h2 className="mt-4 text-sm font-semibold text-foreground">{message.subject}</h2>}
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{message.body}</p>

                      {message.metadata && renderMetadata(message.metadata)}
                    </div>
                  </div>
                </article>
              );
            })}

            {messages.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                No thread messages yet.
              </div>
            )}

            <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Reply to Thread</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Send a follow-up note back into this agent thread.
                  </p>
                </div>
                {latestMessage && (
                  <div className="text-[11px] text-muted-foreground">
                    Reply target: {latestMessage.to.length > 0 ? latestMessage.to.join(", ") : thread.createdByName}
                  </div>
                )}
              </div>

              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Add clarification, ask a question, or redirect the work..."
                aria-label="Reply message"
                className="mt-4 min-h-32 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-muted-foreground">
                  {latestMessage?.cc?.length ? `Cc will include ${latestMessage.cc.join(", ")}` : "No Cc recipients on the latest message."}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!replyBody.trim() || sendingMode !== null}
                    onClick={() => void submitReply("reply")}
                  >
                    <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3.5" />
                    {sendingMode === "reply" ? "Sending..." : "Reply"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!replyBody.trim() || sendingMode !== null}
                    onClick={() => void submitReply("reply_all")}
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                    {sendingMode === "reply_all" ? "Sending..." : "Reply All"}
                  </Button>
                </div>
              </div>
            </section>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Thread Snapshot</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Created</div>
                  <div className="mt-1 text-foreground">{formatTimestamp(thread.createdAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</div>
                  <div className="mt-1 text-foreground">{thread.priority}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Primary Goal</div>
                  <div className="mt-1 font-mono text-xs text-foreground/85">{thread.primaryGoalId || "None"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversation</div>
                  <div className="mt-1 font-mono text-xs text-foreground/85">{thread.conversationId || "None"}</div>
                </div>
              </div>
            </section>

            {latestMessage?.metadata && (
              <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Latest Metadata</h3>
                <div className="mt-3 space-y-2 text-xs text-foreground/85">
                  {Object.entries(latestMessage.metadata).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <div className="font-semibold uppercase tracking-wider text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="mt-1 break-words">
                        {typeof value === "string"
                          ? value
                          : typeof value === "number" || typeof value === "boolean"
                            ? String(value)
                            : JSON.stringify(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export function InboxNoSelection() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{no_inbox_selected()}</p>
        <p className="mt-1 text-xs text-muted-foreground/60">{no_inbox_selected_desc()}</p>
      </div>
    </div>
  );
}
