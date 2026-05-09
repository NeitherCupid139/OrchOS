import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  use,
} from "react";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Server,
  CloudIcon,
  Robot02Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { m } from "@/paraglide/messages";
import { formatDuration } from "@/lib/utils";
import type { RuntimeProfile } from "@/lib/types";

const SPEED_FACTOR = 1;
const FORM_WIDTH = 420;
const FORM_HEIGHT = 480;
const COLLAPSED_WIDTH = 44;
const COLLAPSED_HEIGHT = 44;

interface ContextShape {
  showForm: boolean;
  triggerOpen: () => void;
  triggerClose: () => void;
}

const FormContext = createContext({} as ContextShape);

function useFormContext() {
  return use(FormContext);
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: string;
  responseTime?: number;
}

interface MorphPanelProps {
  runtimes: RuntimeProfile[];
}

export function MorphPanel({ runtimes }: MorphPanelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);

  const triggerClose = useCallback(() => {
    setShowForm(false);
  }, []);

  const triggerOpen = useCallback(() => {
    setShowForm(true);
  }, []);

  useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-slot="select-content"]')) {
        return;
      }

      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose();
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler);
    return () => document.removeEventListener("mousedown", clickOutsideHandler);
  }, [showForm, triggerClose]);

  const ctx = useMemo(
    () => ({ showForm, triggerOpen, triggerClose }),
    [showForm, triggerOpen, triggerClose],
  );

  const enabledRuntimes = useMemo(() => runtimes.filter((r) => r.enabled), [runtimes]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        ref={wrapperRef}
        data-panel
        className="bg-background relative flex flex-col items-center overflow-hidden rounded-2xl border shadow-lg"
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : COLLAPSED_WIDTH,
          height: showForm ? FORM_HEIGHT : COLLAPSED_HEIGHT,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <InputForm runtimes={enabledRuntimes} />
        </FormContext.Provider>
      </motion.div>
    </div>
  );
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext();

  if (showForm) return null;

  return (
    <footer className="flex h-[44px] w-[44px] items-center justify-center select-none">
      <Button
        type="button"
        size="icon"
        className="size-9 rounded-full"
        variant="ghost"
        onClick={triggerOpen}
        aria-label={m.ai_ask()}
      >
        <HugeiconsIcon icon={Robot02Icon} className="size-4 text-primary shrink-0" />
      </Button>
    </footer>
  );
}

function InputForm({ runtimes }: { runtimes: RuntimeProfile[] }) {
  const { triggerClose, showForm } = useFormContext();
  const btnRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedRuntime = useMemo(
    () => runtimes.find((r) => r.id === selectedRuntimeId),
    [runtimes, selectedRuntimeId],
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedRuntimeId || sending) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const result = await api.chatWithRuntime(selectedRuntimeId, userMessage.content);
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_resp`,
        role: "assistant",
        content: result.output || result.error || "No response",
        timestamp: Date.now(),
        error: result.success ? undefined : result.error,
        responseTime: result.responseTime,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: "assistant",
        content: err instanceof Error ? err.message : "Failed to send message",
        timestamp: Date.now(),
        error: "Request failed",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }, [input, selectedRuntimeId, sending]);

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") triggerClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  const modelDisplay = selectedRuntime?.model.replace(/^(cloud|local)\//, "") || "";
  const isCloudModel = selectedRuntime?.model.startsWith("cloud/");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="absolute bottom-0"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
          className="flex h-full flex-col"
        >
            {/* Header with agent selector */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <HugeiconsIcon icon={Robot02Icon} className="size-4 text-primary shrink-0" />
                {runtimes.length > 0 ? (
                  <Select
                    value={selectedRuntimeId ?? ""}
                    onValueChange={(v: string | null) => v && setSelectedRuntimeId(v)}
                  >
                    <SelectTrigger className="h-7 w-36 min-w-0 text-xs">
                      <SelectValue placeholder={m.agent_runtime_placeholder()}>
                        {selectedRuntime ? selectedRuntime.name : m.agent_runtime_placeholder()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {runtimes.map((runtime) => (
                          <SelectItem key={runtime.id} value={runtime.id}>
                            <span className="flex items-center gap-1.5">
                              {runtime.name}
                              <span className="text-muted-foreground">
                                {runtime.model.replace(/^(cloud|local)\//, "")}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">No runtimes available</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedRuntime && modelDisplay && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      isCloudModel
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    )}
                  >
                    <HugeiconsIcon icon={isCloudModel ? CloudIcon : Server} className="size-2.5" />
                    {modelDisplay}
                  </span>
                )}
                <button
                  type="button"
                  onClick={triggerClose}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <HugeiconsIcon icon={Robot02Icon} className="size-6 opacity-20" />
                  <p className="text-xs">{m.ai_placeholder()}</p>
                  {selectedRuntime && (
                    <p className="text-[10px] text-muted-foreground/60">{selectedRuntime.role}</p>
                  )}
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs",
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground ml-4"
                      : msg.error
                        ? "bg-destructive/10 text-destructive mr-4"
                        : "bg-muted text-foreground mr-4",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  {msg.responseTime && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDuration(msg.responseTime)}
                    </p>
                  )}
                </div>
              ))}
              {sending && (
                <div className="rounded-lg bg-muted px-3 py-2 text-xs mr-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner size="sm" className="text-current" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-border p-2">
              <div className="flex items-end gap-1.5">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedRuntime
                      ? `Message ${selectedRuntime.name}...`
                      : "Select a runtime to start"
                  }
                  className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-xs outline-0 focus:border-primary/50"
                  rows={2}
                  onKeyDown={handleKeys}
                  spellCheck={false}
                  disabled={!selectedRuntime || sending}
                />
                <Button
                  type="submit"
                  ref={btnRef}
                  size="icon-sm"
                  disabled={!input.trim() || !selectedRuntimeId || sending}
                  className="shrink-0"
                >
                  {sending ? (
                    <Spinner size="sm" className="text-current" />
                  ) : (
                    <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">
                ⌘ Enter to send · Esc to close
              </p>
            </div>
        </motion.div>
      )}
    </form>
  );
}

export default MorphPanel;
