import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { agents, ai_ask, calendar, home_bento_agents_desc, home_bento_calendar_desc, home_bento_chat_fixed_with, home_bento_chat_input_hint, home_bento_chat_placeholder, home_bento_chat_start_fixed, home_bento_kanban_desc, home_bento_mail_desc, home_bento_mock_input, home_bento_mock_response_capabilities, home_bento_mock_response_default, home_bento_mock_response_help, home_bento_mock_trigger_help, home_bento_mock_trigger_what_can_you_do, kanban, mail, no_agents_available, thinking } from "@/paraglide/messages";
import { formatDuration } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  Cancel01Icon,
  Robot02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { RuntimeProfile } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";

const MOCK_RUNTIME: RuntimeProfile = {
  id: "mock-runtime-01",
  name: "OrchOS Agent",
  command: "orchos",
  version: "0.1.0",
  role: "assistant",
  capabilities: ["chat", "code", "debug"],
  model: "claude-4-sonnet",
  transport: "stdio",
  enabled: true,
  status: "idle",
};

function getMockResponse(
  userMessage: string,
  options: {
    whatCanYouDoTrigger: string;
    helpTrigger: string;
    defaultResponse: string;
    whatCanYouDoResponse: string;
    helpResponse: string;
  },
): string {
  const lower = userMessage.toLowerCase().trim();

  if (lower.includes(options.whatCanYouDoTrigger.toLowerCase().trim())) {
    return options.whatCanYouDoResponse;
  }

  if (lower.includes(options.helpTrigger.toLowerCase().trim())) {
    return options.helpResponse;
  }

  return options.defaultResponse;
}

interface AskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
  responseTime?: number;
}

export function FeaturesBento() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const defaultInput = home_bento_mock_input();
  const [input, setInput] = useState(defaultInput);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRuntime: RuntimeProfile | null = MOCK_RUNTIME.enabled ? MOCK_RUNTIME : null;



  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedRuntime || sending) return;

    const userMessage: AskMessage = {
      id: `ask_${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    const startTime = Date.now();

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

    const responseContent = getMockResponse(userMessage.content, {
      whatCanYouDoTrigger: home_bento_mock_trigger_what_can_you_do(),
      helpTrigger: home_bento_mock_trigger_help(),
      defaultResponse: home_bento_mock_response_default(),
      whatCanYouDoResponse: home_bento_mock_response_capabilities(),
      helpResponse: home_bento_mock_response_help(),
    });
    const responseTime = Date.now() - startTime;

    setMessages((prev) => [
      ...prev,
      {
        id: `ask_${Date.now()}_response`,
        role: "assistant",
        content: responseContent,
        responseTime,
      },
    ]);
    setSending(false);
  }, [input, selectedRuntime, sending]);

  return (
    <>
      <section className="dark:bg-muted/25 bg-zinc-50 flex items-center justify-center py-16 md:py-24 min-h-screen">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mx-auto grid gap-2 sm:grid-cols-5">
            {/* Main: Kanban */}
            <Card className="group overflow-hidden shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-tl-xl">
              <CardHeader className="pb-0">
                <div className="md:p-4 md:pb-2">
                  <p className="font-medium">
                    {kanban()}
                  </p>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                    {home_bento_kanban_desc()}
                  </p>
                </div>
              </CardHeader>

              <div className="relative pl-4 md:pl-6">
                <div className="bg-background h-44 overflow-hidden rounded-tl-lg border-l border-t dark:bg-zinc-950 sm:h-52 md:h-56">
                  <img
                    src="/hero/bento1.png"
                    className="shadow h-full w-full object-cover object-top dark:hidden"
                    alt=""
                    width={1207}
                    height={929}
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src="/hero/bento1-dark.png"
                    className="hidden h-full w-full object-cover object-top dark:block"
                    alt=""
                    width={1207}
                    height={929}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </Card>

            {/* Top Right: Mail */}
            <Card className="group h-full overflow-hidden shadow-zinc-950/5 sm:col-span-2 sm:rounded-none sm:rounded-tr-xl">
              <CardHeader>
                <div className="md:p-4 md:pb-2">
                  <p className="font-medium">{mail()}</p>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                    {home_bento_mail_desc()}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="mt-auto flex-1">
                <div className="relative h-full pl-4 md:pl-6">
                  <div className="h-44 overflow-hidden rounded-r-lg border sm:h-52 md:h-56">
<img
                      src="/hero/bento2.png"
                      className="shadow dark:hidden w-full h-full object-cover"
                      alt=""
                      width={1207}
                      height={929}
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      src="/hero/bento2-dark.png"
                      className="hidden dark:block w-full h-full object-cover"
                      alt=""
                      width={1207}
                      height={929}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Left: Calendar */}
            <Card
              className="group shadow-black/5 sm:col-span-2 sm:rounded-none sm:rounded-bl-xl"
            >
              <CardHeader className="pb-0">
                <div className="md:p-4 md:pb-2">
                  <p className="font-medium">
                    {calendar()}
                  </p>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                    {home_bento_calendar_desc()}
                  </p>
                </div>
              </CardHeader>
            </Card>

            {/* Bottom Right: Agents */}
            <Card className="group relative shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-br-xl">
              <CardHeader className="pb-0">
                <div className="md:p-4 md:pb-2">
                  <p className="font-medium">{agents()}</p>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                    {home_bento_agents_desc()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="relative px-5 md:px-8">
                <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img className="m-auto size-6 md:size-7" src="/runtimes/opencode.svg" alt="OpenCode" width={32} height={32} loading="lazy" decoding="async" />
                  </div>
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img className="m-auto size-6 md:size-7" src="/runtimes/gemini-color.svg" alt="Gemini" width={32} height={32} loading="lazy" decoding="async" />
                  </div>
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img className="m-auto size-6 md:size-7" src="/runtimes/codex-color.svg" alt="Codex" width={32} height={32} loading="lazy" decoding="async" />
                  </div>
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img className="m-auto size-6 md:size-7" src="/runtimes/claudecode-color.svg" alt="Claude Code" width={32} height={32} loading="lazy" decoding="async" />
                  </div>
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border border-dashed p-3">
                    <img className="m-auto size-6 md:size-7 opacity-30" src="/runtimes/pi.svg" alt="Pi" width={32} height={32} loading="lazy" decoding="async" />
                  </div>
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border border-dashed p-3">
                    <img className="m-auto size-6 md:size-7 opacity-30" src="/runtimes/amp-color.svg" alt="AMP" width={32} height={32} loading="lazy" decoding="async" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(false); } }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            role="button"
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); } }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Robot02Icon} className="size-4 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{ai_ask()}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedRuntime
                      ? home_bento_chat_fixed_with({ name: selectedRuntime.name })
                      : no_agents_available()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>

            <div className="flex h-[520px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <HugeiconsIcon icon={Robot02Icon} className="size-6 opacity-20" />
                    <p className="text-sm text-foreground">{ai_ask()}</p>
                    <p className="max-w-sm text-xs text-muted-foreground/70">
                      {selectedRuntime
                        ? home_bento_chat_start_fixed({ name: selectedRuntime.name })
                        : no_agents_available()}
                    </p>
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-xl px-4 py-3 text-sm",
                      message.role === "user"
                        ? "ml-12 bg-primary/10 text-foreground"
                        : message.error
                          ? "mr-12 bg-destructive/10 text-destructive"
                          : "mr-12 bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                    {message.responseTime ? (
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {formatDuration(message.responseTime)}
                      </p>
                    ) : null}
                  </div>
                ))}

                {sending ? (
                  <div className="mr-12 rounded-xl bg-muted px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner size="sm" className="text-muted-foreground" />
                      <span className="text-xs">{thinking()}</span>
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              <form
                action={() => { void handleSend(); }}
                className="border-t border-border px-5 py-4"
              >
                <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      selectedRuntime
                        ? home_bento_chat_placeholder({ name: selectedRuntime.name })
                        : no_agents_available()
                    }
                    className="min-h-[68px] max-h-[220px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                    disabled={!selectedRuntime || sending}
                    rows={1}
                    spellCheck={false}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setOpen(false);
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon-sm"
                    disabled={!input.trim() || !selectedRuntime || sending}
                    className="mb-1 shrink-0"
                  >
                    {sending ? (
                      <Spinner size="sm" className="text-current" />
                    ) : (
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
                  {home_bento_chat_input_hint({ name: selectedRuntime?.name || ai_ask() })}
                </p>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
