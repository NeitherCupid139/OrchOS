import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Google, Bing, Baidu, Yandex, Ai360, Claude, DeepSeek, Gemini, OpenAI, OpenCode, OpenRouter } from "@lobehub/icons";
import {
  Add01Icon, Archive01Icon, ArrowLeft01Icon, ArrowRight01Icon,
  Chat01Icon, Clock01Icon, ArrowUp01Icon, Mic01Icon, Cancel01Icon,
  UnfoldMoreIcon, Delete02Icon, Folder01Icon, Search01Icon, GlobeIcon,
  PinIcon, Settings01Icon, Bookmark01Icon,
} from "@hugeicons/core-free-icons";
import { type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  type ConversationMessage,
  type CustomAgent,
} from "@/lib/api";
import type { ControlSettings, RuntimeProfile } from "@/lib/types";
import { useUser } from "@clerk/clerk-react";
import { useConversationStore } from "@/lib/stores/conversation";
import { useUIStore } from "@/lib/store";
import {
  agent,
  all,
  archive,
  bookmarks as bookmarks_label,
  bookmarks_pin_hint,
  chat,
  collapse_sidebar,
  conversation as conversation_label,
  creation,
  creation_active,
  creation_archived,
  creation_image_unsupported,
  creation_intro_desc,
  creation_intro_title,
  creation_placeholder,
  delete as delete_message,
  delete_conversation_confirm,
  expand_sidebar,
  message_agent_placeholder,
  message_runtime_placeholder,
  new_conversation,
  no_conversations,
  no_messages_yet,
  none,
  resize_creation_sidebar,
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
  untitled_conversation,
  voice_input,
  voice_input_stop,
  web_search,
} from "@/paraglide/messages";
import { toast } from "@/components/ui/toast";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import {
  mapConversationMessagesToUiMessages,
  MessageBubble,
} from "@/components/chat/ConversationFlow";
import { ChatThinkingState } from "@/components/chat/ChatThinkingState";
import { useDashboard } from "@/lib/dashboard-context";

interface CreationViewProps {
  runtimes: RuntimeProfile[];
  settings: ControlSettings | null;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];

const searchEngineMeta = [
  { id: "google", url: "https://www.google.com/search?q=" },
  { id: "bing", url: "https://www.bing.com/search?q=" },
  { id: "baidu", url: "https://www.baidu.com/s?wd=" },
  { id: "360", url: "https://www.so.com/s?q=" },
  { id: "yandex", url: "https://yandex.com/search/?text=" },
] as const;

export function CreationView(props?: CreationViewProps | null) {
  const { runtimes = [], settings = null } = props ?? {};
  const creationFilterButtons = [
    { value: "all", label: all(), icon: Chat01Icon, iconClassName: "text-muted-foreground/80" },
    { value: "active", label: creation_active(), icon: Clock01Icon, iconClassName: "text-sky-500" },
    {
      value: "archived",
      label: creation_archived(),
      icon: Archive01Icon,
      iconClassName: "text-amber-500",
    },
  ] as const;

  const creationArchiveFilter = useUIStore((s) => s.creationArchiveFilter);
  const setCreationArchiveFilter = useUIStore((s) => s.setCreationArchiveFilter);
  const creationSidebarCollapsed = useUIStore((s) => s.creationSidebarCollapsed);
  const setCreationSidebarCollapsed = useUIStore((s) => s.setCreationSidebarCollapsed);
  const creationSidebarWidth = useUIStore((s) => s.creationSidebarWidth);
  const setCreationSidebarWidth = useUIStore((s) => s.setCreationSidebarWidth);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(!creationSidebarCollapsed);
  const [showBookmarks, setShowBookmarks] = useState(true);
  const collapseTimerRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [selectedCustomAgentId, setSelectedCustomAgentId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.listCustomAgents(), api.getDefaultCustomAgentId()])
      .then(([agents, defaultAgentId]) => {
        setCustomAgents(agents);
        setSelectedCustomAgentId(defaultAgentId);
      })
      .catch(() => {});
  }, []);

  const {
    conversations,
    activeConversationId,
    messagesByConversationId,
    hasLoadedConversations,
    isLoadingConversations,
    loadConversations,
    setActiveConversationId,
    loadMessages,
    createConversation,
    updateConversation,
    deleteConversation,
    setPendingUserMessage,
  } = useConversationStore();

  const handleConversationListItemKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    conversationId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setActiveConversationId(conversationId);
    setShowBookmarks(false);
    loadMessages(conversationId);
  };

  const messages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ?? EMPTY_CONVERSATION_MESSAGES)
    : EMPTY_CONVERSATION_MESSAGES;
  const uiMessages = useMemo(() => mapConversationMessagesToUiMessages(messages), [messages]);

  const [sending, setSending] = useState(false);
  const enabledRuntimes = useMemo(() => runtimes.filter((r) => r.enabled), [runtimes]);
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );
  const draftConversation = useMemo<Conversation>(
    () => ({
      id: "__draft__",
      title: "",
      archived: false,
      deleted: false,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }),
    [],
  );
  const displayConversation = activeConversation ?? draftConversation;

  const availableConversations = useMemo(() => {
    if (creationArchiveFilter === "archived") {
      return conversations.filter((conversation) => conversation.archived && !conversation.deleted);
    }

    if (creationArchiveFilter === "active") {
      return conversations.filter(
        (conversation) => !conversation.archived && !conversation.deleted,
      );
    }

    return conversations.filter((conversation) => !conversation.deleted);
  }, [conversations, creationArchiveFilter]);
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowBookmarks(false);
      return;
    }

    if (!activeConversation) {
      setShowBookmarks(true);
      return;
    }

    setShowBookmarks(false);
  }, [activeConversation, messages.length]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (creationSidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [creationSidebarCollapsed]);

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setCreationSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, [setCreationSidebarCollapsed]);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setCreationSidebarCollapsed(false);
  }, [setCreationSidebarCollapsed]);

  const handleNewConversation = useCallback(async () => {
    if (
      activeConversation &&
      !activeConversation.archived &&
      !activeConversation.deleted &&
      messages.length === 0
    ) {
      setActiveConversationId(activeConversation.id);
      loadMessages(activeConversation.id);
      return;
    }

    try {
      await createConversation({
        runtimeId: settings?.defaultRuntimeId || undefined,
      });
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [
    activeConversation,
    createConversation,
    messages.length,
    setActiveConversationId,
    settings?.defaultRuntimeId,
  ]);

  useEffect(() => {
    if (!hasLoadedConversations) return;

    if (
      activeConversationId &&
      availableConversations.some((conv) => conv.id === activeConversationId)
    ) {
      return;
    }

    if (activeConversationId) return;
  }, [activeConversationId, availableConversations, hasLoadedConversations]);

  const handleDeleteConversation = useCallback(async () => {
    if (!convToDelete) return;
    try {
      await deleteConversation(convToDelete);
      setConvToDelete(null);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, [convToDelete, deleteConversation]);

  const handleDeleteConfirmOpenChange = useCallback((open: boolean) => {
    setDeleteConfirmOpen(open);
    if (!open) {
      setConvToDelete(null);
    }
  }, []);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const sidebarEl = sidebarRef.current;
      if (!sidebarEl) return;
      const sidebarLeft = sidebarEl.getBoundingClientRect().left;
      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      // Suppress CSS transition during drag
      sidebarEl.style.transition = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 420);
        sidebarEl.style.setProperty("--creation-sidebar-width", `${nextWidth}px`);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Restore CSS transition
        sidebarEl.style.transition = "";
        // Sync final width to store
        const finalWidth = sidebarEl.style.getPropertyValue("--creation-sidebar-width");
        if (finalWidth) {
          setCreationSidebarWidth(Number.parseFloat(finalWidth));
        }
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [setCreationSidebarWidth],
  );

  const handleUpdateConversation = useCallback(
    async (
      id: string,
      data: {
        title?: string;
        runtimeId?: string;
        archived?: boolean;
        deleted?: boolean;
      },
    ) => {
      try {
        await updateConversation(id, data);
      } catch (err) {
        console.error("Failed to update conversation:", err);
      }
    },
    [updateConversation],
  );

  const handleCreateConversation = useCallback(
    async (data: { runtimeId?: string }) => {
      try {
        return await createConversation(data);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        throw err;
      }
    },
    [createConversation],
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        ref={sidebarRef}
        className={cn(
          "relative flex min-h-0 shrink-0 flex-col bg-card transition-[width] duration-300 ease-out",
          creationSidebarCollapsed
            ? "w-0 overflow-hidden"
            : "w-[var(--creation-sidebar-width)] overflow-visible border-r",
          isResizingSidebar ? "border-r-transparent" : "border-border",
        )}
        style={
          creationSidebarCollapsed
            ? undefined
            : ({ "--creation-sidebar-width": `${creationSidebarWidth}px` } as React.CSSProperties)
        }
      >
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <div className="flex h-10 items-center justify-between rounded-md px-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{creation()}</div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <button
                      {...props}
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:-translate-y-0"
                      onClick={() => void handleNewConversation()}
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    </button>
                  )}
                />
                <TooltipContent side="bottom">{new_conversation()}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <button
                      {...props}
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:-translate-y-0"
                      onClick={handleCollapseSidebar}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                    </button>
                  )}
                />
                <TooltipContent side="right">{collapse_sidebar()}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-0.5 p-1.5">
              {availableConversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId && !showBookmarks;

                return (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    className={cn(
                      "group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                    )}
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setShowBookmarks(false);
                      loadMessages(conversation.id);
                    }}
                    onKeyDown={(event) => handleConversationListItemKeyDown(event, conversation.id)}
                  >
                    <HugeiconsIcon icon={Chat01Icon} className="size-3.5 shrink-0 opacity-40" />
                    <button type="button" className="min-w-0 flex-1 text-left">
                      <div className="truncate text-xs leading-5">
                        {conversation.title || untitled_conversation()}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={(props) => (
                            <Button
                              {...props}
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleUpdateConversation(conversation.id, {
                                  archived: !conversation.archived,
                                });
                              }}
                              className="text-muted-foreground/55 opacity-0 transition-opacity group-hover:opacity-100 hover:text-amber-500"
                            >
                              <HugeiconsIcon icon={Archive01Icon} className="size-3.5" />
                            </Button>
                          )}
                        />
                        <TooltipContent side="bottom">{archive()}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger
                          render={(props) => (
                            <Button
                              {...props}
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                setConvToDelete(conversation.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-muted-foreground/55 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                            </Button>
                          )}
                        />
                        <TooltipContent side="bottom">{delete_message()}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}

              {isLoadingConversations && availableConversations.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="text-muted-foreground/50" />
                </div>
              ) : null}

              {availableConversations.length === 0 && !isLoadingConversations ? (
                <div className="py-6 text-center">
                  <HugeiconsIcon
                    icon={Chat01Icon}
                    className="mx-auto mb-1.5 size-5 text-muted-foreground/30"
                  />
                  <p className="text-xs text-muted-foreground">{no_conversations()}</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-2">
            <div className="flex h-10 items-center justify-center gap-1 rounded-md px-2">
              {creationFilterButtons.map((filter) => (
                <Tooltip key={filter.value}>
                  <TooltipTrigger
                    render={(props) => (
                      <button
                        {...props}
                        type="button"
                        onClick={() => setCreationArchiveFilter(filter.value)}
                        aria-pressed={creationArchiveFilter === filter.value}
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                          creationArchiveFilter === filter.value
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                      >
                        <HugeiconsIcon
                          icon={filter.icon}
                          className={cn("size-3.5", filter.iconClassName)}
                        />
                      </button>
                    )}
                  />
                  <TooltipContent side="top">{filter.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={resize_creation_sidebar()}
          onPointerDown={handleResizeStart}
          className={cn(
            "group absolute right-[-8px] top-0 z-20 h-full w-4 cursor-col-resize",
            creationSidebarCollapsed && "hidden",
            isResizingSidebar &&
              "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
              isResizingSidebar && "border-border bg-muted shadow-md",
            )}
          >
            <div
              className={cn(
                "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                isResizingSidebar && "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {creationSidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
                  onClick={handleExpandSidebar}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="right">{expand_sidebar()}</TooltipContent>
          </Tooltip>
        ) : null}
        <ChatArea
          conversation={displayConversation}
          isDraftConversation={!activeConversation}
          messages={uiMessages}
          sending={sending}
          showBookmarks={showBookmarks}
          onShowBookmarksChange={setShowBookmarks}
          runtimes={enabledRuntimes}
          customAgents={customAgents}
          selectedCustomAgentId={selectedCustomAgentId}
          onSelectCustomAgent={setSelectedCustomAgentId}
          onCreateConversation={handleCreateConversation}
          onUpdateConversation={handleUpdateConversation}
          onSendMessage={async (content, targetConversation, customAgentId) => {
            const conversation = targetConversation ?? activeConversation;
            if (!conversation) return;

            setSending(true);
            if (content) {
              setPendingUserMessage(conversation.id, content);
            }
            try {
              await api.sendConversationMessage(conversation.id, content, customAgentId);
              await loadMessages(conversation.id, { force: true });
              setPendingUserMessage(conversation.id, undefined);
              if (!conversation.title && messages.length === 0) {
                await handleUpdateConversation(conversation.id, {
                  title: content.slice(0, 60),
                });
              }
              return;
            } catch (err) {
              setPendingUserMessage(conversation.id, undefined);
              console.error("Failed to send message:", err);
              toast.error(err instanceof Error ? err.message : send_failed());
              throw err;
            } finally {
              setSending(false);
            }
          }}
          onReloadMessages={
            activeConversation ? () => loadMessages(activeConversation.id) : undefined
          }
        />
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={handleDeleteConfirmOpenChange}
        title={delete_message()}
        description={delete_conversation_confirm()}
        onConfirm={handleDeleteConversation}
        confirmLabel={delete_message()}
        variant="destructive"
      />
    </div>
  );
}

interface ChatAreaProps {
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

function Favicon({ url }: { url: string }) {
  const failedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  let domain: string | null = null;
  try {
    domain = new URL(url).hostname;
  } catch {}

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (failedRef.current || !domain) {
    return (
      <div
        ref={ref}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <HugeiconsIcon icon={PinIcon} className="size-4" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-accent">
      {visible ? (
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt=""
          className="size-full outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          onError={() => {
            failedRef.current = true;
            setVisible(false);
          }}
        />
      ) : (
        <div className="size-full" />
      )}
    </div>
  );
}

function ChatArea({
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
  const [modeIndicator, setModeIndicator] = useState({ left: 4, width: 0, ready: false });
  const [draftRuntimeId, setDraftRuntimeId] = useState<string | undefined>(undefined);
  const [bookmarks, setBookmarks] = useState<BookmarkCategory[]>([]);
  const [mode, setMode] = useState<"chat" | "search">("chat");
  const [searchEngineId, setSearchEngineId] = useState<string>(searchEngineMeta[0].id);
  const isSendShortcutPreviewing = uiPreviewTarget === "send-shortcut" && mode === "chat";
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
        { name: string; id: string; bookmarks: (typeof bookmarks)[number]["bookmarks"] }[]
      >((acc, category) => {
        const pinned = category.bookmarks.filter((b) => b.pinned);
        if (pinned.length > 0) {
          acc.push({ name: category.name, id: category.id, bookmarks: pinned });
        }
        return acc;
      }, []),
    [bookmarks],
  );

  useEffect(() => {
    api
      .listBookmarks()
      .then((data) => setBookmarks(data.filter((c) => c.bookmarks.length > 0)))
      .catch(() => {});
  }, []);

  const effectiveRuntimeId = isDraftConversation
    ? (draftRuntimeId ?? conversation.runtimeId)
    : conversation.runtimeId;

  const { isListening, transcript, isSupported, start, stop } = useSpeechRecognition();

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
  const {
    pendingConversationId,
    flowDraftByConversationId,
    pendingUserMessageByConversationId,
    setPendingUserMessage,
  } = useConversationStore();
  const pendingUserMessage =
    conversation.id === "__draft__"
      ? null
      : (pendingUserMessageByConversationId[conversation.id] ?? null);
  const flowDraft = flowDraftByConversationId[conversation.id];
  const showPendingAssistantReply =
    conversation.id !== "__draft__" && pendingConversationId === conversation.id;

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
    const activeBtn = mode === "chat" ? chatBtnRef.current : searchBtnRef.current;
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
        message.parts.some((part) => part.type === "text" && part.text === pendingUserMessage),
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
    (data: { title?: string; runtimeId?: string; archived?: boolean; deleted?: boolean }) => {
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

      await onSendMessage(content, targetConversation, selectedCustomAgentId ?? undefined);
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
    if (e.key === "Enter" && !e.shiftKey && settings?.sendShortcut !== "cmd-enter") {
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
            <p className="text-sm font-medium text-foreground/85">{creation_intro_title()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{creation_intro_desc()}</p>
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
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3 text-muted-foreground" />
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
                    ? message_runtime_placeholder({ name: selectedRuntime.name })
                    : selectedCustomAgent
                      ? message_agent_placeholder({ name: selectedCustomAgent.name })
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
                                isSendShortcutPreviewing ? "opacity-100" : "opacity-0",
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
                            <HugeiconsIcon icon={Folder01Icon} className="size-3" />
                            {group.name}
                          </span>
                          <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
                            {group.bookmarks.map((bookmark) => (
                              <button
                                key={bookmark.id}
                                type="button"
                                onClick={() => window.open(bookmark.url, "_blank")}
                                className="flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-colors hover:bg-accent/40 active:scale-[0.93]"
                              >
                                <Favicon url={bookmark.url} />
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
                          <HugeiconsIcon icon={Bookmark01Icon} className="size-3.5" />
                        </button>
                      }
                    />
                    <TooltipContent side="top">{show_bookmarks()}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex-1 space-y-4 px-4 py-4 md:px-6">
                  {allMessages.length > 0 || showPendingAssistantReply ? (
                    <>
                      {allMessages.map((message, index) => {
                        const onRetry =
                          message.role === "assistant" && allMessages[index - 1]?.role === "user"
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
                      <p className="text-sm text-muted-foreground">{no_messages_yet()}</p>
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

interface CustomAgentSelectorProps {
  agents: CustomAgent[];
  selectedAgentId: string | null;
  onSelect: (agentId: string | null) => void;
}

function CustomAgentSelector({ agents, selectedAgentId, onSelect }: CustomAgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-36 cursor-default items-center justify-between gap-1.5 rounded-full border border-input bg-transparent py-2 pe-2 ps-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden text-foreground/70">
            <ProviderIcon url={selectedAgent?.url} className="size-3 shrink-0" />
          </span>
          <span className="truncate">{selectedAgent?.name || agent()}</span>
        </span>
        <HugeiconsIcon icon={UnfoldMoreIcon} className="size-3 shrink-0 text-muted-foreground" />
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

const searchEngineIconComponent: Record<string, (props: { className?: string }) => ReactNode> = {
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

const providerIconComponent: Record<string, (props: { className?: string }) => ReactNode> = {
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

const PROVIDER_META = [
  { id: "opencode-go", urlPrefix: "https://opencode.ai/zen/go" },
  { id: "opencode-zen", urlPrefix: "https://opencode.ai/zen" },
  { id: "openai", urlPrefix: "https://api.openai.com" },
  { id: "gemini", urlPrefix: "https://generativelanguage.googleapis.com" },
  { id: "anthropic", urlPrefix: "https://api.anthropic.com" },
  { id: "openrouter", urlPrefix: "https://openrouter.ai" },
  { id: "deepseek", urlPrefix: "https://api.deepseek.com" },
];

function ProviderIcon({ url, className }: { url?: string; className?: string }) {
  const provider = PROVIDER_META.find((p) => url?.startsWith(p.urlPrefix));
  if (provider) {
    const IconComponent = providerIconComponent[provider.id];
    if (IconComponent) return IconComponent({ className });
  }
  return <HugeiconsIcon icon={Settings01Icon} className={className} />;
}

function SearchEngineIcon({ engineId, className }: { engineId: string; className?: string }) {
  const IconComponent = searchEngineIconComponent[engineId];
  if (IconComponent) {
    return IconComponent({ className });
  }

  return <HugeiconsIcon icon={GlobeIcon} className={className} />;
}

function SearchEngineSelector({ engines, selectedEngineId, onSelect }: SearchEngineSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedEngine = engines.find((e) => e.id === selectedEngineId);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-36 cursor-default items-center justify-between gap-1.5 rounded-full border border-input bg-transparent py-2 pe-2 ps-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden">
            <SearchEngineIcon engineId={selectedEngineId} className="size-3.5" />
          </span>
          <span className="truncate">{selectedEngine?.name || search_engine_google()}</span>
        </span>
        <HugeiconsIcon icon={UnfoldMoreIcon} className="size-3 shrink-0 text-muted-foreground" />
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
