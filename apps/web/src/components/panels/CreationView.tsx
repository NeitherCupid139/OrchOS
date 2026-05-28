import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Archive01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Chat01Icon,
  Clock01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  api,
  type Conversation,
  type ConversationMessage,
  type CustomAgent,
} from "@/lib/api";
import type { ControlSettings, RuntimeProfile } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { useUIStore } from "@/lib/store";
import { useAssistantMessageNotification } from "@/lib/hooks";
import {
  all,
  archive,
  collapse_sidebar,
  creation,
  creation_active,
  creation_archived,
  delete as delete_message,
  delete_conversation_confirm,
  expand_sidebar,
  new_conversation,
  no_conversations,
  resize_creation_sidebar,
  send_failed,
  untitled_conversation,
} from "@/paraglide/messages";
import { toast } from "@/components/ui/toast";
import { mapConversationMessagesToUiMessages } from "@/components/chat/ConversationFlow";
import { ChatArea } from "@/components/panels/ChatArea";

/* ── Types ── */

interface CreationViewProps {
  runtimes: RuntimeProfile[];
  settings: ControlSettings | null;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];

/* ── Component ── */

export function CreationView(props?: CreationViewProps | null) {
  const { runtimes = [], settings = null } = props ?? {};
  const creationFilterButtons = [
    {
      value: "all",
      label: all(),
      icon: Chat01Icon,
      iconClassName: "text-muted-foreground/80",
    },
    {
      value: "active",
      label: creation_active(),
      icon: Clock01Icon,
      iconClassName: "text-sky-500",
    },
    {
      value: "archived",
      label: creation_archived(),
      icon: Archive01Icon,
      iconClassName: "text-amber-500",
    },
  ] as const;

  const creationArchiveFilter = useUIStore((s) => s.creationArchiveFilter);
  const setCreationArchiveFilter = useUIStore(
    (s) => s.setCreationArchiveFilter,
  );
  const creationSidebarCollapsed = useUIStore(
    (s) => s.creationSidebarCollapsed,
  );
  const setCreationSidebarCollapsed = useUIStore(
    (s) => s.setCreationSidebarCollapsed,
  );
  const creationSidebarWidth = useUIStore((s) => s.creationSidebarWidth);
  const setCreationSidebarWidth = useUIStore((s) => s.setCreationSidebarWidth);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(
    !creationSidebarCollapsed,
  );
  const [showBookmarks, setShowBookmarks] = useState(true);
  const collapseTimerRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [selectedCustomAgentId, setSelectedCustomAgentId] = useState<
    string | null
  >(null);
  const customAgentsLoadedRef = useRef(false);

  const loadCustomAgents = useCallback(async () => {
    if (customAgentsLoadedRef.current) return;
    customAgentsLoadedRef.current = true;
    try {
      const [agents, defaultAgentId] = await Promise.all([
        api.listCustomAgents(),
        api.getDefaultCustomAgentId(),
      ]);
      setCustomAgents(agents);
      if (defaultAgentId) setSelectedCustomAgentId(defaultAgentId);
    } catch {}
  }, []);

  const conversations = useConversationStore((s) => s.conversations);
  const activeConversationId = useConversationStore(
    (s) => s.activeConversationId,
  );
  const messagesByConversationId = useConversationStore(
    (s) => s.messagesByConversationId,
  );
  const hasLoadedConversations = useConversationStore(
    (s) => s.hasLoadedConversations,
  );
  const isLoadingConversations = useConversationStore(
    (s) => s.isLoadingConversations,
  );
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const setActiveConversationId = useConversationStore(
    (s) => s.setActiveConversationId,
  );
  const loadMessages = useConversationStore((s) => s.loadMessages);
  const createConversation = useConversationStore((s) => s.createConversation);
  const updateConversation = useConversationStore((s) => s.updateConversation);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);
  const setPendingUserMessage = useConversationStore(
    (s) => s.setPendingUserMessage,
  );

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
    ? (messagesByConversationId[activeConversationId] ??
      EMPTY_CONVERSATION_MESSAGES)
    : EMPTY_CONVERSATION_MESSAGES;
  const uiMessages = useMemo(
    () => mapConversationMessagesToUiMessages(messages),
    [messages],
  );

  const [sending, setSending] = useState(false);

  // Browser notification when assistant responds while user is on another tab
  useAssistantMessageNotification(
    messages,
    settings?.notifications?.system ?? false,
  );
  const enabledRuntimes = useMemo(
    () => runtimes.filter((r) => r.enabled),
    [runtimes],
  );
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
      return conversations.filter(
        (conversation) => conversation.archived && !conversation.deleted,
      );
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
      const runtimeId =
        settings?.defaultRuntimeId || enabledRuntimes[0]?.id || undefined;
      await createConversation({ runtimeId });
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [
    activeConversation,
    createConversation,
    messages.length,
    setActiveConversationId,
    settings?.defaultRuntimeId,
    enabledRuntimes,
  ]);

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
      sidebarEl.style.transition = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(
          Math.max(moveEvent.clientX - sidebarLeft, 200),
          420,
        );
        sidebarEl.style.setProperty(
          "--creation-sidebar-width",
          `${nextWidth}px`,
        );
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        sidebarEl.style.transition = "";
        const finalWidth = sidebarEl.style.getPropertyValue(
          "--creation-sidebar-width",
        );
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
        const runtimeId =
          data.runtimeId || enabledRuntimes[0]?.id || undefined;
        return await createConversation({ ...data, runtimeId });
      } catch (err) {
        console.error("Failed to create conversation:", err);
        throw err;
      }
    },
    [createConversation, enabledRuntimes],
  );

  /* ── Render ── */

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── Sidebar: Conversation List ── */}
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
            : ({
                "--creation-sidebar-width": `${creationSidebarWidth}px`,
              } as React.CSSProperties)
        }
      >
        {/* Header */}
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent
              ? "opacity-100 blur-0"
              : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <div className="flex h-10 items-center justify-between rounded-md px-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {creation()}
              </div>
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
                <TooltipContent side="bottom">
                  {new_conversation()}
                </TooltipContent>
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
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        className="size-4"
                      />
                    </button>
                  )}
                />
                <TooltipContent side="right">
                  {collapse_sidebar()}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent
              ? "opacity-100 blur-0"
              : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-0.5 p-1.5">
              {availableConversations.map((conversation) => {
                const isActive =
                  conversation.id === activeConversationId && !showBookmarks;

                return (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    className={cn(
                      "group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors outline-none",
                      isActive
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                    )}
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setShowBookmarks(false);
                      loadMessages(conversation.id);
                    }}
                    onKeyDown={(event) =>
                      handleConversationListItemKeyDown(event, conversation.id)
                    }
                  >
                    <HugeiconsIcon
                      icon={Chat01Icon}
                      className="size-3.5 shrink-0 opacity-40"
                    />
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
                              tabIndex={-1}
                            >
                              <HugeiconsIcon
                                icon={Archive01Icon}
                                className="size-3.5"
                              />
                            </Button>
                          )}
                        />
                        <TooltipContent side="bottom">
                          {archive()}
                        </TooltipContent>
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
                              tabIndex={-1}
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-3.5"
                              />
                            </Button>
                          )}
                        />
                        <TooltipContent side="bottom">
                          {delete_message()}
                        </TooltipContent>
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

              {availableConversations.length === 0 &&
              !isLoadingConversations ? (
                <div className="py-6 text-center">
                  <HugeiconsIcon
                    icon={Chat01Icon}
                    className="mx-auto mb-1.5 size-5 text-muted-foreground/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    {no_conversations()}
                  </p>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {/* Filter Buttons */}
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

        {/* Resize Handle */}
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

      {/* ── Main: Chat Area ── */}
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
          onLoadCustomAgents={loadCustomAgents}
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
              await api.sendConversationMessage(
                conversation.id,
                content,
                customAgentId,
              );
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
            activeConversation
              ? () => loadMessages(activeConversation.id)
              : undefined
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
