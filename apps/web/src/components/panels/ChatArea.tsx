import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Google,
  Bing,
  Baidu,
  Yandex,
  Ai360,
  OpenAI,
  Gemini,
  Claude,
  DeepSeek,
  OpenCode,
  OpenRouter,
} from "@lobehub/icons";
import {
  ArrowUp01Icon,
  Bookmark01Icon,
  Cancel01Icon,
  Chat01Icon,
  Delete02Icon,
  Folder01Icon,
  GlobeIcon,
  Mic01Icon,
  PinIcon,
  Search01Icon,
  Settings01Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  api,
  type BookmarkCategory,
  type Conversation,
  type CustomAgent,
} from "@/lib/api";
import type { RuntimeProfile } from "@/lib/types";
import { useUser } from "@clerk/clerk-react";
import { useConversationStore } from "@/lib/stores/conversation";
import { useUIStore } from "@/lib/store";
import {
  agent,
  bookmarks as bookmarks_label,
  bookmarks_pin_hint,
  chat,
  conversation as conversation_label,
  creation_image_unsupported,
  creation_intro_desc,
  creation_intro_search_desc,
  creation_intro_title,
  creation_placeholder,
  message_agent_placeholder,
  message_runtime_placeholder,
  none,
  no_messages_yet,
  search_engine_360,
  search_engine_baidu,
  search_engine_bing,
  search_engine_google,
  search_engine_yandex,
  search_web_placeholder,
  send,
  send_failed,
  shortcuts_send_message_preview_label,
  show_bookmarks,
  voice_input,
  voice_input_stop,
  web_search,
} from "@/paraglide/messages";
import { BookmarkFavicon } from "@/components/ui/bookmark-favicon";
import { toast } from "@/components/ui/toast";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { MessageBubble } from "@/components/chat/ConversationFlow";
import { ChatThinkingState } from "@/components/chat/ChatThinkingState";
import { useDashboard } from "@/lib/dashboard-context";

/* ── Constants ── */

const searchEngineMeta = [
  { id: "google", url: "https://www.google.com/search?q=" },
  { id: "bing", url: "https://www.bing.com/search?q=" },
  { id: "baidu", url: "https://www.baidu.com/s?wd=" },
  { id: "360", url: "https://www.so.com/s?q=" },
  { id: "yandex", url: "https://yandex.com/search/?text=" },
] as const;

const PROVIDER_META = [
  { id: "opencode-go", urlPrefix: "https://opencode.ai/zen/go" },
  { id: "opencode-zen", urlPrefix: "https://opencode.ai/zen" },
  { id: "openai", urlPrefix: "https://api.openai.com" },
  { id: "gemini", urlPrefix: "https://generativelanguage.googleapis.com" },
  { id: "anthropic", urlPrefix: "https://api.anthropic.com" },
  { id: "openrouter", urlPrefix: "https://openrouter.ai" },
  { id: "deepseek", urlPrefix: "https://api.deepseek.com" },
];

const searchEngineIconComponent: Record<
  string,
  (props: { className?: string }) => ReactNode
> = {
  google: (props) => {
    const Icon = (Google as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
  bing: (props) => {
    const Icon = (Bing as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
  baidu: (props) => {
    const Icon = (Baidu as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
  yandex: (props) => {
    const Icon = (Yandex as unknown as { Avatar: React.ElementType }).Avatar;
    return <Icon size={14} className={props.className} />;
  },
  ["360"]: (props) => {
    const Icon = (Ai360 as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
};

const providerIconComponent: Record<
  string,
  (props: { className?: string }) => ReactNode
> = {
  "opencode-go": (props) => <OpenCode size={14} className={props.className} />,
  "opencode-zen": (props) => <OpenCode size={14} className={props.className} />,
  openai: (props) => <OpenAI size={14} className={props.className} />,
  gemini: (props) => {
    const Icon = (Gemini as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
  anthropic: (props) => {
    const Icon = (Claude as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
  openrouter: (props) => <OpenRouter size={14} className={props.className} />,
  deepseek: (props) => {
    const Icon = (DeepSeek as unknown as { Color: React.ElementType }).Color;
    return <Icon size={14} className={props.className} />;
  },
};

/* ── Sub-components ── */

function ProviderIcon({
  url,
  className,
}: {
  url?: string;
  className?: string;
}) {
  const provider = PROVIDER_META.find((p) => url?.startsWith(p.urlPrefix));
  if (provider) {
    const IconComponent = providerIconComponent[provider.id];
    if (IconComponent) return IconComponent({ className });
  }
  return <HugeiconsIcon icon={Settings01Icon} className={className} />;
}

function SearchEngineIcon({
  engineId,
  className,
}: {
  engineId: string;
  className?: string;
}) {
  const IconComponent = searchEngineIconComponent[engineId];
  if (IconComponent) {
    return IconComponent({ className });
  }
  return <HugeiconsIcon icon={GlobeIcon} className={className} />;
}

interface CustomAgentSelectorProps {
  agents: CustomAgent[];
  selectedAgentId: string | null;
  onSelect: (agentId: string | null) => void;
  onOpen?: () => void;
}

function CustomAgentSelector({
  agents,
  selectedAgentId,
  onSelect,
  onOpen,
}: CustomAgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpen?.();
      }}
    >
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-36 cursor-default items-center justify-between gap-1.5 rounded-full border border-input bg-transparent py-2 pe-2 ps-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden text-foreground/70">
            <ProviderIcon
              url={selectedAgent?.url}
              className="size-3 shrink-0"
            />
          </span>
          <span className="truncate">{selectedAgent?.name || agent()}</span>
        </span>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          className="size-3 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
        {agents.length === 0 ? (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
              setOpen(false);
            }}
            className="text-muted-foreground"
          >
            {none()}
          </DropdownMenuItem>
        ) : null}
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(agent.id);
              setOpen(false);
            }}
            className="flex items-center gap-2"
          >
            <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden">
              <ProviderIcon url={agent.url} className="size-3.5" />
            </span>
            <span className="truncate">{agent.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SearchEngineSelectorProps {
  engines: readonly { id: string; name: string; url: string }[];
  selectedEngineId: string;
  onSelect: (engineId: string) => void;
}

function SearchEngineSelector({
  engines,
  selectedEngineId,
  onSelect,
}: SearchEngineSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedEngine = engines.find((e) => e.id === selectedEngineId);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-36 cursor-default items-center justify-between gap-1.5 rounded-full border border-input bg-transparent py-2 pe-2 ps-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden">
            <SearchEngineIcon
              engineId={selectedEngineId}
              className="size-3.5"
            />
          </span>
          <span className="truncate">
            {selectedEngine?.name || search_engine_google()}
          </span>
        </span>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          className="size-3 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
        {engines.map((engine) => (
          <DropdownMenuItem
            key={engine.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(engine.id);
              setOpen(false);
            }}
            className="flex items-center gap-2"
          >
            <SearchEngineIcon engineId={engine.id} className="size-3.5" />
            <span className="truncate">{engine.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── ChatArea Interface & Component ── */

export interface ChatAreaProps {
  conversation: Conversation;
  isDraftConversation: boolean;
  messages: UIMessage[];
  sending: boolean;
  showBookmarks: boolean;
  onShowBookmarksChange: (value: boolean) => void;
  runtimes: RuntimeProfile[];
  customAgents: CustomAgent[];
  selectedCustomAgentId: string | null;
  onSelectCustomAgent: (id: string | null) => void;
  onLoadCustomAgents?: () => Promise<void>;
  onCreateConversation: (data: { runtimeId?: string }) => Promise<Conversation>;
  onUpdateConversation: (
    id: string,
    data: {
      title?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ) => Promise<void>;
  onSendMessage: (
    content: string,
    conversation?: Conversation,
    customAgentId?: string,
  ) => Promise<void>;
  onReloadMessages?: () => Promise<void>;
}

export function ChatArea({
  conversation,
  isDraftConversation,
  messages,
  sending,
  showBookmarks,
  onShowBookmarksChange,
  runtimes,
  customAgents,
  selectedCustomAgentId,
  onSelectCustomAgent,
  onLoadCustomAgents,
  onCreateConversation,
  onUpdateConversation,
  onSendMessage,
  onReloadMessages,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const settings = useUIStore((s) => s.settings);
  const { uiPreviewTarget } = useDashboard();
  const [isConversationUpdating, setIsConversationUpdating] = useState(false);
  const [inputCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputShellRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const chatBtnRef = useRef<HTMLButtonElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const pendingConversationUpdateRef = useRef<Promise<void> | null>(null);
  const [modeIndicator, setModeIndicator] = useState({
    left: 4,
    width: 0,
    ready: false,
  });
  const [draftRuntimeId, setDraftRuntimeId] = useState<string | undefined>(
    undefined,
  );
  const [bookmarks, setBookmarks] = useState<BookmarkCategory[]>([]);
  const bookmarksLoadedRef = useRef(false);
  const [mode, setMode] = useState<"chat" | "search">("chat");
  const [searchEngineId, setSearchEngineId] = useState<string>(
    searchEngineMeta[0].id,
  );
  const isSendShortcutPreviewing =
    uiPreviewTarget === "send-shortcut" && mode === "chat";
  const searchEngines = searchEngineMeta.map((e) => ({
    ...e,
    name: {
      google: search_engine_google(),
      bing: search_engine_bing(),
      baidu: search_engine_baidu(),
      ["360"]: search_engine_360(),
      yandex: search_engine_yandex(),
    }[e.id],
  }));
  const pinnedGroups = useMemo(
    () =>
      bookmarks.reduce<
        {
          name: string;
          id: string;
          bookmarks: (typeof bookmarks)[number]["bookmarks"];
        }[]
      >((acc, category) => {
        const pinned = category.bookmarks.filter((b) => b.pinned);
        if (pinned.length > 0) {
          acc.push({ name: category.name, id: category.id, bookmarks: pinned });
        }
        return acc;
      }, []),
    [bookmarks],
  );

  const loadBookmarks = useCallback(async () => {
    if (bookmarksLoadedRef.current) return;
    bookmarksLoadedRef.current = true;
    try {
      const data = await api.listBookmarks();
      setBookmarks(data.filter((c) => c.bookmarks.length > 0));
    } catch {}
  }, []);

  useEffect(() => {
    if (showBookmarks) {
      void loadBookmarks();
    }
  }, [showBookmarks, loadBookmarks]);

  const effectiveRuntimeId = isDraftConversation
    ? (draftRuntimeId ?? conversation.runtimeId)
    : conversation.runtimeId;

  const { isListening, transcript, isSupported, start, stop } =
    useSpeechRecognition();

  const prevTranscriptRef = useRef("");
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      setInput((prev) => prev + transcript);
      prevTranscriptRef.current = transcript;
    }
  }, [transcript]);

  const selectedRuntime = useMemo(
    () => runtimes.find((r) => r.id === effectiveRuntimeId),
    [effectiveRuntimeId, runtimes],
  );
  const selectedCustomAgent = useMemo(
    () => customAgents.find((a) => a.id === selectedCustomAgentId),
    [customAgents, selectedCustomAgentId],
  );
  const { user } = useUser();
  const pendingConversationId = useConversationStore(
    (s) => s.pendingConversationId,
  );
  const flowDraftByConversationId = useConversationStore(
    (s) => s.flowDraftByConversationId,
  );
  const pendingUserMessageByConversationId = useConversationStore(
    (s) => s.pendingUserMessageByConversationId,
  );
  const setPendingUserMessage = useConversationStore(
    (s) => s.setPendingUserMessage,
  );
  const pendingUserMessage =
    conversation.id === "__draft__"
      ? null
      : (pendingUserMessageByConversationId[conversation.id] ?? null);
  const flowDraft = flowDraftByConversationId[conversation.id];
  const showPendingAssistantReply =
    conversation.id !== "__draft__" &&
    pendingConversationId === conversation.id;

  const visibleMessages = useMemo(() => {
    if (!pendingUserMessage) return messages;

    return [
      ...messages,
      {
        id: `pending-user-${conversation.id}`,
        role: "user",
        parts: [{ type: "text", text: pendingUserMessage }],
      } as UIMessage,
    ];
  }, [conversation.id, messages, pendingUserMessage]);

  const allMessages = useMemo(() => {
    const result = [...visibleMessages];
    if (flowDraft) {
      result.push({
        id: flowDraft.id,
        role: "assistant",
        parts: [{ type: "text", text: flowDraft.content }],
      } as UIMessage);
    }
    return result;
  }, [visibleMessages, flowDraft]);

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.cssText =
      textarea.style.cssText.replace(/height:[^;]*;?/g, "") +
      `height:${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, sending]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversation.id]);

  const syncModeIndicator = useCallback(() => {
    const container = toggleRef.current;
    const activeBtn =
      mode === "chat" ? chatBtnRef.current : searchBtnRef.current;
    if (!container || !activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeBtn.getBoundingClientRect();
    const nextLeft = Math.max(4, activeRect.left - containerRect.left);
    const nextWidth = Math.max(0, activeRect.width);

    setModeIndicator((current) => {
      if (
        current.ready &&
        Math.abs(current.left - nextLeft) < 0.5 &&
        Math.abs(current.width - nextWidth) < 0.5
      ) {
        return current;
      }

      return { left: nextLeft, width: nextWidth, ready: true };
    });
  }, [mode]);

  useLayoutEffect(() => {
    syncModeIndicator();

    const container = toggleRef.current;
    const chatBtn = chatBtnRef.current;
    const searchBtn = searchBtnRef.current;
    if (!container || !chatBtn || !searchBtn) return;

    let frameId = window.requestAnimationFrame(() => {
      syncModeIndicator();
      frameId = window.requestAnimationFrame(syncModeIndicator);
    });

    const observer = new ResizeObserver(() => {
      syncModeIndicator();
    });

    observer.observe(container);
    observer.observe(chatBtn);
    observer.observe(searchBtn);
    window.addEventListener("resize", syncModeIndicator);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", syncModeIndicator);
    };
  }, [syncModeIndicator]);

  useEffect(() => {
    if (!pendingUserMessage) return;
    const hasMatchedUserMessage = messages.some(
      (message) =>
        message.role === "user" &&
        message.parts.some(
          (part) => part.type === "text" && part.text === pendingUserMessage,
        ),
    );

    if (hasMatchedUserMessage && conversation.id !== "__draft__") {
      setPendingUserMessage(conversation.id, undefined);
    }
  }, [conversation.id, messages, pendingUserMessage, setPendingUserMessage]);

  useEffect(() => {
    syncTextareaHeight();
  }, [attachedFiles.length, conversation.id, input, syncTextareaHeight]);

  useEffect(() => {
    if (uiPreviewTarget === "send-shortcut" && mode !== "chat") {
      setMode("chat");
    }
  }, [mode, uiPreviewTarget]);

  useEffect(() => {
    if (!isSendShortcutPreviewing) {
      return;
    }

    inputShellRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isSendShortcutPreviewing]);

  const queueConversationUpdate = useCallback(
    (data: {
      title?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    }) => {
      if (isDraftConversation) {
        if (data.runtimeId !== undefined) setDraftRuntimeId(data.runtimeId);
        return Promise.resolve();
      }

      setIsConversationUpdating(true);
      const request = onUpdateConversation(conversation.id, data);
      pendingConversationUpdateRef.current = request;

      void request.finally(() => {
        if (pendingConversationUpdateRef.current === request) {
          pendingConversationUpdateRef.current = null;
          setIsConversationUpdating(false);
        }
      });

      return request;
    },
    [conversation.id, isDraftConversation, onUpdateConversation],
  );

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    onShowBookmarksChange(false);

    if (mode === "search") {
      const engine = searchEngineMeta.find((e) => e.id === searchEngineId);
      if (engine) {
        const query = input.trim();
        setInput("");
        window.open(engine.url + encodeURIComponent(query), "_blank");
      }
      return;
    }

    if (pendingConversationUpdateRef.current) {
      await pendingConversationUpdateRef.current;
    }

    const content = input.trim();
    const filesToSend = [...attachedFiles];
    setInput("");
    setAttachedFiles([]);

    try {
      if (filesToSend.length > 0) {
        toast.error(creation_image_unsupported());
        return;
      }

      const targetConversation = isDraftConversation
        ? await onCreateConversation({
            runtimeId: draftRuntimeId,
          })
        : conversation;

      await onSendMessage(
        content,
        targetConversation,
        selectedCustomAgentId ?? undefined,
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(send_failed());
    }
  }, [
    attachedFiles,
    conversation,
    draftRuntimeId,
    input,
    isDraftConversation,
    mode,
    onCreateConversation,
    onUpdateConversation,
    onSendMessage,
    onShowBookmarksChange,
    searchEngineId,
    selectedCustomAgentId,
    sending,
  ]);

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      settings?.sendShortcut !== "cmd-enter"
    ) {
      e.preventDefault();
      handleSend();
    }
  }

  const inputArea = !inputCollapsed ? (
    <motion.div
      layoutId="creation-shared-input"
      transition={{ type: "spring", duration: 0.42, bounce: 0 }}
      className="shrink-0 overflow-visible bg-background px-4 py-4 md:px-6"
    >
      <div className="mx-auto max-w-3xl">
        {allMessages.length === 0 && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium text-foreground/85">
              {creation_intro_title()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "chat"
                ? creation_intro_desc()
                : creation_intro_search_desc()}
            </p>
          </div>
        )}
        <BorderBeam
          size="md"
          theme="auto"
          colorVariant="ocean"
          strength={0.65}
          duration={2.6}
          className="rounded-xl"
        >
          <div
            ref={inputShellRef}
            className={cn(
              "relative flex flex-col gap-2 overflow-visible rounded-xl border border-border bg-background px-3 pt-3 pb-1.5 transition-[box-shadow,border-color] duration-300 ease-out",
              isSendShortcutPreviewing &&
                "border-primary/40 shadow-[0_0_0_1px_rgba(0,72,239,0.18),0_0_0_8px_rgba(0,72,239,0.08),0_18px_48px_-24px_rgba(0,72,239,0.55)]",
            )}
          >
            {isSendShortcutPreviewing ? (
              <div className="pointer-events-none absolute -top-3 right-3 z-30 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                {shortcuts_send_message_preview_label()}
              </div>
            ) : null}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="relative group overflow-hidden rounded-md border border-border bg-muted"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="size-12 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute -right-1 -top-1 rounded-full border border-border bg-background p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:border-destructive/30 hover:bg-destructive/10"
                      tabIndex={-1}
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        className="size-3 text-muted-foreground"
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "search"
                  ? search_web_placeholder()
                  : selectedRuntime
                    ? message_runtime_placeholder({
                        name: selectedRuntime.name,
                      })
                    : selectedCustomAgent
                      ? message_agent_placeholder({
                          name: selectedCustomAgent.name,
                        })
                      : creation_placeholder()
              }
              className="min-h-[40px] w-full resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
              rows={1}
              onKeyDown={handleKeys}
              spellCheck={false}
              disabled={sending}
              style={{ maxHeight: "120px" }}
              onInput={syncTextareaHeight}
            />
            <div className="relative z-20 flex items-center justify-between gap-2 pt-2 pb-0.5">
              <div className="flex min-w-0 items-center gap-1 overflow-visible">
                <div
                  ref={toggleRef}
                  className="relative shrink-0 flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
                >
                  <div
                    className="pointer-events-none absolute inset-y-[3px] rounded-md bg-background shadow-sm transition-[left,width,opacity] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] dark:bg-input/30"
                    style={{
                      left: modeIndicator.left,
                      width: modeIndicator.width,
                      opacity: modeIndicator.ready ? 1 : 0,
                    }}
                  />
                  <button
                    ref={chatBtnRef}
                    type="button"
                    onClick={() => setMode("chat")}
                    className={cn(
                      "relative z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      mode === "chat"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={Chat01Icon} className="size-3" />
                    {chat()}
                  </button>
                  <button
                    ref={searchBtnRef}
                    type="button"
                    onClick={() => {
                      if (mode === "search") {
                        handleSend();
                      } else {
                        setMode("search");
                      }
                    }}
                    className={cn(
                      "relative z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      mode === "search"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={Search01Icon} className="size-3" />
                    {web_search()}
                  </button>
                </div>
                {mode === "chat" ? (
                  <CustomAgentSelector
                    agents={customAgents}
                    selectedAgentId={selectedCustomAgentId}
                    onSelect={(id) => {
                      onSelectCustomAgent(id);
                      if (id) queueConversationUpdate({ runtimeId: undefined });
                    }}
                    onOpen={onLoadCustomAgents}
                  />
                ) : (
                  <SearchEngineSelector
                    engines={searchEngines}
                    selectedEngineId={searchEngineId}
                    onSelect={setSearchEngineId}
                  />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "text-muted-foreground hover:text-foreground",
                          isListening && "text-red-500 hover:text-red-600",
                        )}
                        onClick={isListening ? stop : start}
                        disabled={!isSupported}
                      >
                        <HugeiconsIcon
                          icon={isListening ? Cancel01Icon : Mic01Icon}
                          className="size-4"
                        />
                      </Button>
                    }
                  />
                  <TooltipContent side="top">
                    {isListening ? voice_input_stop() : voice_input()}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-sm"
                        className={cn(
                          "transition-[transform,box-shadow] duration-300 ease-out",
                          isSendShortcutPreviewing &&
                            "shadow-[0_0_0_1px_rgba(0,72,239,0.24),0_0_0_6px_rgba(0,72,239,0.14)]",
                        )}
                        disabled={
                          (!input.trim() && attachedFiles.length === 0) ||
                          sending ||
                          isConversationUpdating
                        }
                        onClick={handleSend}
                      >
                        {sending ? (
                          <Spinner size="sm" />
                        ) : (
                          <span className="relative flex items-center justify-center">
                            <span
                              className={cn(
                                "absolute inset-[-10px] rounded-full bg-primary/12 blur-md transition-opacity duration-300",
                                isSendShortcutPreviewing
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <HugeiconsIcon
                              icon={ArrowUp01Icon}
                              className={cn(
                                "relative size-3.5 transition-transform duration-300 ease-out",
                                isSendShortcutPreviewing && "scale-110",
                              )}
                            />
                          </span>
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent side="top">{send()}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </BorderBeam>
      </div>
    </motion.div>
  ) : null;

  return (
    <LayoutGroup id="creation-mode-layout">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {showBookmarks ? (
            <motion.div key="bookmark-mode" className="contents">
              {inputArea}
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                className="flex min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 md:px-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <HugeiconsIcon icon={PinIcon} className="size-3.5" />
                    {bookmarks_label()}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                    {pinnedGroups.length > 0 ? (
                      pinnedGroups.map((group) => (
                        <div key={group.id} className="flex flex-col gap-1.5">
                          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                            <HugeiconsIcon
                              icon={Folder01Icon}
                              className="size-3"
                            />
                            {group.name}
                          </span>
                          <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
                            {group.bookmarks.map((bookmark) => (
                              <button
                                key={bookmark.id}
                                type="button"
                                onClick={() =>
                                  window.open(bookmark.url, "_blank")
                                }
                                className="flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-colors hover:bg-accent/40 active:scale-[0.93]"
                              >
                                <BookmarkFavicon url={bookmark.url} />
                                <span className="max-w-[72px] truncate text-center text-[11px] leading-tight text-foreground">
                                  {bookmark.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="mb-2 flex flex-1 flex-col justify-center rounded-lg border border-dashed border-border/50 p-4">
                        <p className="text-center text-xs text-muted-foreground/60">
                          {bookmarks_pin_hint()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="conversation-mode" className="contents">
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto"
              >
                <div className="flex items-center justify-between px-4 py-2 md:px-6">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <HugeiconsIcon icon={Chat01Icon} className="size-3.5" />
                    {conversation_label()}
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => onShowBookmarksChange(true)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <HugeiconsIcon
                            icon={Bookmark01Icon}
                            className="size-3.5"
                          />
                        </button>
                      }
                    />
                    <TooltipContent side="top">
                      {show_bookmarks()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex-1 space-y-4 px-4 py-4 md:px-6">
                  {allMessages.length > 0 || showPendingAssistantReply ? (
                    <>
                      {allMessages.map((message, index) => {
                        const onRetry =
                          message.role === "assistant" &&
                          allMessages[index - 1]?.role === "user"
                            ? async () => {
                                try {
                                  await api.retryConversationMessage(
                                    conversation.id,
                                    selectedCustomAgentId ?? undefined,
                                  );
                                  await onReloadMessages?.();
                                } catch (err) {
                                  console.error("Retry failed:", err);
                                }
                              }
                            : undefined;

                        return (
                          <MessageBubble
                            key={message.id}
                            msg={message}
                            userImageUrl={user?.imageUrl}
                            onRetry={onRetry}
                          />
                        );
                      })}
                      {showPendingAssistantReply ? <ChatThinkingState /> : null}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="flex h-full min-h-48 items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        {no_messages_yet()}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
              {inputArea}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
