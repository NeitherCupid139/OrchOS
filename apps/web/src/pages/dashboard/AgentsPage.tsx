import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Add01Icon,
  AiBrain01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Edit02Icon,
  InformationCircleIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useUIStore } from "@/lib/store";
import { AppDialog } from "@/components/ui/app-dialog";
import { LocalDevicesView } from "@/components/panels/LocalDevicesView";
import { ObservabilityView } from "@/components/panels/ObservabilityView";
import { api, type CustomAgent } from "@/lib/api";
import { getBuiltInAgent } from "@/lib/built-in-agent";
import { isProEnabled } from "@/lib/pro-loader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Claude,
  DeepSeek,
  Gemini,
  OpenAI,
  OpenCode,
  OpenRouter,
} from "@lobehub/icons";
import {
  add,
  agent_provider_placeholder,
  agent_url_help,
  agents,
  agents_pro_required_cta,
  agents_pro_required_title,
  api_key,
  api_key_placeholder,
  cancel,
  collapse_sidebar,
  custom_agent_name_placeholder,
  custom_agent_url_placeholder,
  custom_configuration,
  default_agent,
  delete as delete_message,
  edit,
  edit_agent,
  expand_sidebar,
  loading as loading_label,
  model,
  model_placeholder,
  name,
  no_agents_available,
  provider as providerLabel,
  resize_agents_sidebar,
  save,
  url,
} from "@/paraglide/messages";

const PROVIDERS = [
  {
    id: "opencode-go",
    name: "OpenCode Go",
    url: "https://opencode.ai/zen/go/v1",
    icon: OpenCode,
  },
  {
    id: "opencode-zen",
    name: "OpenCode Zen",
    url: "https://opencode.ai/zen/v1",
    icon: OpenCode,
  },
  {
    id: "openai",
    name: "OpenAI",
    url: "https://api.openai.com/v1",
    icon: OpenAI,
  },
  {
    id: "gemini",
    name: "Google (Gemini)",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/",
    icon: Gemini.Color,
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    url: "https://api.anthropic.com/v1",
    icon: Claude.Color,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    icon: OpenRouter,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: "https://api.deepseek.com/v1",
    icon: DeepSeek.Color,
  },
];

function ProviderIcon({ url, className }: { url: string; className?: string }) {
  const provider = PROVIDERS.find((p) =>
    url.startsWith(p.url.replace(/\/+$/, "")),
  );
  if (provider) {
    const Icon = provider.icon;
    return <Icon className={cn(className, "opacity-70")} />;
  }
  return (
    <HugeiconsIcon
      icon={Settings01Icon}
      className={cn(className, "opacity-40")}
    />
  );
}

export function AgentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const agentsView =
    new URLSearchParams(location.search).get("view") === "observability"
      ? "observability"
      : "config";

  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState<"free" | "pro">(
    "free",
  );
  const builtInAgent = useMemo(() => getBuiltInAgent(), []);
  const [defaultCustomAgentId, setDefaultCustomAgentId] = useState<
    string | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<
    { kind: "custom"; id: string } | { kind: "builtin" } | null
  >(null);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [agentForm, setAgentForm] = useState({
    name: "",
    url: "",
    apiKey: "",
    model: "",
  });
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<"provider" | "url">(
    "provider",
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const proFeaturesEnabled = isProEnabled();
  const canCreateCustomAgents =
    !proFeaturesEnabled || subscriptionPlan === "pro";

  useEffect(() => {
    let cancelled = false;

    void loadCustomAgents();
    if (proFeaturesEnabled) {
      void api
        .getSubscription()
        .then((subscription) => {
          const plan = (subscription as { plan?: string } | null)?.plan;
          if (!cancelled) setSubscriptionPlan(plan === "pro" ? "pro" : "free");
        })
        .catch(() => {});
    }
    void api
      .getDefaultCustomAgentId()
      .then((id) => {
        if (!cancelled) setDefaultCustomAgentId(id);
      })
      .catch(() => {});

    // Select the built-in agent by default
    if (!cancelled) {
      setSelectedItem({ kind: "builtin" });
    }

    return () => {
      cancelled = true;
    };
  }, [proFeaturesEnabled]);

  async function loadCustomAgents() {
    try {
      const agents = await api.listCustomAgents();
      setCustomAgents(agents);
      setSelectedItem((current) => {
        if (!current || current.kind !== "custom") return current;
        return agents.some((agent) => agent.id === current.id) ? current : null;
      });
    } catch {}
  }
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const selectedAgent = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.kind === "builtin") {
      return { kind: "builtin" as const, agent: builtInAgent };
    }
    const agent = customAgents.find((item) => item.id === selectedItem.id);
    return agent ? { kind: "custom" as const, agent } : null;
  }, [customAgents, selectedItem, builtInAgent]);

  useEffect(() => {
    const timer = collapseTimerRef;
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [sidebarCollapsed]);

  function handleOpenConnect() {
    if (!canCreateCustomAgents) {
      void navigate({ to: "/pricing" });
      return;
    }

    setEditingAgentId(null);
    setAgentForm({ name: "", url: "", apiKey: "", model: "" });
    setAvailableModels([]);
    setLoadingModels(false);
    setConnectionMode("provider");
    setIsConnectDialogOpen(true);
  }

  async function handleSaveCustomAgent() {
    const { name, url, apiKey, model } = agentForm;
    if (!name.trim() || !url.trim() || !apiKey.trim() || !model.trim()) {
      return;
    }
    if (!editingAgentId && !canCreateCustomAgents) {
      void navigate({ to: "/pricing" });
      return;
    }

    try {
      const agents = editingAgentId
        ? await api.updateCustomAgent(editingAgentId, {
            name: name.trim(),
            url: url.trim(),
            apiKey: apiKey.trim(),
            model: model.trim(),
          })
        : await api.createCustomAgent({
            name: name.trim(),
            url: url.trim(),
            apiKey: apiKey.trim(),
            model: model.trim(),
          });
      setCustomAgents(agents);
      const selectedId = editingAgentId ?? agents[agents.length - 1]?.id;
      if (selectedId) {
        setSelectedItem({ kind: "custom", id: selectedId });
      }
      setEditingAgentId(null);
      setIsConnectDialogOpen(false);

    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Custom agents require Pro")
      ) {
        void navigate({ to: "/pricing" });
      }
      console.error(error);
    }
  }

  async function handleSetDefaultCustomAgent(agentId: string | null) {
    try {
      const nextId = await api.setDefaultCustomAgentId(agentId);
      setDefaultCustomAgentId(nextId);

    } catch (error) {
      console.error(error);
    }
  }

  async function handleUpdateCustomAgent(
    id: string,
    data: { url?: string; apiKey?: string; model?: string },
  ) {
    const agents = await api.updateCustomAgent(id, data);
    setCustomAgents(agents);
  }

  async function loadCustomAgentModels(
    url: string,
    apiKey: string,
    currentModel: string,
  ) {
    if (!url.trim() || !apiKey.trim()) {
      setAvailableModels([]);
      setLoadingModels(false);
      return;
    }

    setLoadingModels(true);
    try {
      const result = await api.listCustomAgentModels({
        url: url.trim(),
        apiKey: apiKey.trim(),
      });

      setAvailableModels(result.models);
      setAgentForm((prev) => {
        if (currentModel && result.models.includes(currentModel)) {
          return prev.model === currentModel
            ? prev
            : { ...prev, model: currentModel };
        }

        if (!prev.model.trim() && result.models[0]) {
          return { ...prev, model: result.models[0] };
        }

        return prev;
      });
    } catch (error) {
      setAvailableModels([]);
      console.error(error);
    } finally {
      setLoadingModels(false);
    }
  }
  const agentModelRef = useRef(agentForm.model);
  agentModelRef.current = agentForm.model;

  useEffect(() => {
    if (!isConnectDialogOpen) return;

    const url = agentForm.url.trim();
    const apiKey = agentForm.apiKey.trim();
    if (!url || !apiKey) {
      setAvailableModels([]);
      setLoadingModels(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadCustomAgentModels(url, apiKey, agentModelRef.current.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [agentForm.apiKey, agentForm.url, isConnectDialogOpen, loadCustomAgentModels]);

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
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
        setSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        sidebarEl.style.transition = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <div
        ref={sidebarRef}
        className={cn(
          "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r bg-card transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed
            ? "w-0 border-r-transparent"
            : "w-[var(--agents-sidebar-width)]",
          sidebarCollapsed
            ? ""
            : isResizingSidebar
              ? "border-r-transparent"
              : "border-border",
        )}
        style={
          sidebarCollapsed
            ? undefined
            : ({
                "--agents-sidebar-width": `${Math.min(sidebarWidth, 380)}px`,
              } as CSSProperties)
        }
      >
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
                {agents()}{" "}
                <span className="ml-1 text-xs font-normal text-muted-foreground tabular-nums">
                  {customAgents.length}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="active:-translate-y-0"
                      onClick={handleOpenConnect}
                      aria-label={
                        canCreateCustomAgents ? add() : agents_pro_required_cta()
                      }
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  {canCreateCustomAgents ? add() : agents_pro_required_title()}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="active:-translate-y-0"
                      onClick={handleCollapseSidebar}
                    >
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        className="size-4"
                      />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  {collapse_sidebar()}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

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
              {/* Built-in agent — always shown first */}
              <button
                type="button"
                onClick={() => setSelectedItem({ kind: "builtin" })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedItem({ kind: "builtin" });
                  }
                }}
                className={cn(
                  "group flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                  selectedItem?.kind === "builtin"
                    ? "bg-accent text-foreground"
                    : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  className="size-3.5 shrink-0 text-primary"
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs leading-5">
                    {builtInAgent.name}
                  </div>
                  <div className="truncate text-[11px] leading-4 text-muted-foreground">
                    {builtInAgent.model}
                  </div>
                </div>
                <span className="inline-flex items-center whitespace-nowrap rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary shrink-0">
                  {defaultCustomAgentId === null
                    ? default_agent()
                    : builtInAgent.badge}
                </span>
              </button>

              {customAgents.map((agent) => (
                /* oxlint-disable-next-line react-doctor/prefer-tag-over-role -- nested Button inside, invalid to nest <button> */
                <div
                  role="button"
                  tabIndex={0}
                  key={agent.id}
                  onClick={() =>
                    setSelectedItem({ kind: "custom", id: agent.id })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedItem({ kind: "custom", id: agent.id });
                    }
                  }}
                  className={cn(
                    "group flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    selectedItem?.kind === "custom" &&
                      selectedItem.id === agent.id
                      ? "bg-accent text-foreground"
                      : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <ProviderIcon url={agent.url} className="size-3.5 shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs leading-5">
                      {agent.name}
                    </div>
                    <div className="truncate text-[11px] leading-4 text-muted-foreground">
                      {agent.model}
                    </div>
                  </div>
                  <div className="relative h-5 shrink-0">
                    {defaultCustomAgentId === agent.id ? (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary transition-opacity group-hover:opacity-0">
                        {default_agent()}
                      </span>
                    ) : null}
                    <div className="absolute inset-y-0 right-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        tabIndex={-1}
                        aria-label={edit()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingAgentId(agent.id);
                          setAgentForm({
                            name: agent.name,
                            url: agent.url,
                            apiKey: agent.apiKey,
                            model: agent.model,
                          });
                          setAvailableModels([]);
                          setLoadingModels(false);
                          const matchedProvider = PROVIDERS.find(
                            (p) => p.url === agent.url,
                          );
                          setConnectionMode(
                            matchedProvider ? "provider" : "url",
                          );
                          setIsConnectDialogOpen(true);
                        }}
                        className="text-muted-foreground/60 hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        tabIndex={-1}
                        aria-label={delete_message()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const agents = await api.deleteCustomAgent(
                              agent.id,
                            );
                            setCustomAgents(agents);
                            if (defaultCustomAgentId === agent.id) {
                              setDefaultCustomAgentId(null);
                            }
                            setSelectedItem((current) =>
                              current?.kind === "custom" &&
                              current.id === agent.id
                                ? null
                                : current,
                            );

                          } catch (error) {
                            console.error(error);
                          }
                        }}
                        className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          className="size-3.5"
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {customAgents.length === 0 && (
                <div className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                  {no_agents_available()}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* oxlint-disable-next-line react-doctor/prefer-tag-over-role -- resize handle needs child elements, hr is void */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={resize_agents_sidebar()}
          className={cn(
            "pointer-events-none group absolute right-[-8px] top-0 z-30 h-full w-4",
            !showExpandedContent && "hidden",
            isResizingSidebar &&
              "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
          )}
        >
          <div
            onPointerDown={handleResizeStart}
            className={cn(
              "absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm pointer-events-auto cursor-col-resize transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
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
        {sidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <Button
                  {...props}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
                  onClick={handleExpandSidebar}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </Button>
              )}
            />
            <TooltipContent side="right">{expand_sidebar()}</TooltipContent>
          </Tooltip>
        ) : null}
        {agentsView === "observability" ? (
          <ObservabilityView />
        ) : (
          <LocalDevicesView
            onConnectClick={handleOpenConnect}
            selectedAgent={selectedAgent}
            defaultCustomAgentId={defaultCustomAgentId}
            onSetDefaultCustomAgent={handleSetDefaultCustomAgent}
            onUpdateCustomAgent={handleUpdateCustomAgent}
            canCreateCustomAgents={canCreateCustomAgents}
            onUpgradeClick={() => {
              void navigate({ to: "/pricing" });
            }}
          />
        )}
      </div>

      <AppDialog
        open={isConnectDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAvailableModels([]);
            setLoadingModels(false);
          }
          setIsConnectDialogOpen(open);
        }}
        title={editingAgentId ? edit_agent() : custom_configuration()}
        size="sm"
        h="h-[480px]"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConnectDialogOpen(false)}
            >
              {cancel()}
            </Button>
            <Button type="button" onClick={handleSaveCustomAgent}>
              {save()}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{name()}</span>
            <input
              value={agentForm.name}
              onChange={(e) =>
                setAgentForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={custom_agent_name_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>
          <div className="grid gap-2 text-sm">
            <Tabs
              value={connectionMode}
              onValueChange={(v) => setConnectionMode(v as "provider" | "url")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="provider" className="flex-1">
                  {providerLabel()}
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1">
                  {url()}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="provider">
                <Select
                  value={
                    PROVIDERS.find((p) => p.url === agentForm.url)?.id ||
                    undefined
                  }
                  onValueChange={(value) => {
                    const provider = PROVIDERS.find((p) => p.id === value);
                    if (provider) {
                      setAgentForm((prev) => ({ ...prev, url: provider.url }));
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-md bg-background px-3 text-sm">
                    <span className="flex items-center gap-2">
                      {(() => {
                        const selected = PROVIDERS.find(
                          (p) => p.url === agentForm.url,
                        );
                        if (selected) {
                          const Icon = selected.icon;
                          return (
                            <>
                              <Icon className="size-4 shrink-0" />
                              {selected.name}
                            </>
                          );
                        }
                        return (
                          <span className="text-muted-foreground">
                            {agent_provider_placeholder()}
                          </span>
                        );
                      })()}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PROVIDERS.map((p) => {
                        const Icon = p.icon;
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              <Icon className="size-4 shrink-0" />
                              {p.name}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="url">
                <div className="relative">
                  <input
                    value={agentForm.url}
                    onChange={(e) =>
                      setAgentForm((prev) => ({ ...prev, url: e.target.value }))
                    }
                    placeholder={custom_agent_url_placeholder()}
                    aria-label={custom_agent_url_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <HugeiconsIcon
                              icon={InformationCircleIcon}
                              className="size-4"
                            />
                          </Button>
                        }
                      />
                      <TooltipContent side="top" className="max-w-64">
                        {agent_url_help()}{" "}
                        <code className="text-[10px] opacity-70">
                          https://api.example.com/v1
                        </code>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{api_key()}</span>
            <input
              value={agentForm.apiKey}
              onChange={(e) =>
                setAgentForm((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              placeholder={api_key_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{model()}</span>
            <Select
              value={agentForm.model || undefined}
              onValueChange={(value) => {
                if (!value) return;
                setAgentForm((prev) => ({ ...prev, model: value }));
              }}
              disabled={loadingModels || availableModels.length === 0}
            >
              <SelectTrigger className="h-10 w-full rounded-md bg-background px-3 text-sm">
                <SelectValue
                  placeholder={
                    loadingModels ? loading_label() : model_placeholder()
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>
      </AppDialog>
    </div>
  );
}
