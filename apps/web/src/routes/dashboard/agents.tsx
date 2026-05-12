import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, Delete02Icon, Edit02Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "@/components/ui/toast";
import { useUIStore } from "@/lib/store";
import { AppDialog } from "@/components/ui/app-dialog";
import { LocalDevicesView } from "@/components/panels/LocalDevicesView";
import { api, type CustomAgent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/dashboard-context";
import { add, agent_removed, agents, all_fields_required, api_key, api_key_placeholder, cancel, collapse_sidebar, custom_agent_created, custom_agent_name_placeholder, custom_agent_updated, custom_agent_url_placeholder, custom_configuration, default_agent, default_agent_cleared, default_agent_updated, delete as delete_message, edit, edit_agent, expand_sidebar, failed_remove_agent, failed_save_custom_agent, failed_update_default_agent, loading as loading_label, model, model_placeholder, name, no_agents_available, resize_agents_sidebar, save, url } from "@/paraglide/messages";

export const Route = createFileRoute("/dashboard/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  const { loading } = useDashboard();

  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [defaultCustomAgentId, setDefaultCustomAgentId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<
    | { kind: "custom"; id: string }
    | null
  >(null);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", url: "", apiKey: "", model: "" });
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    void loadCustomAgents();
    void api.getDefaultCustomAgentId().then(setDefaultCustomAgentId).catch(() => {});
  }, []);

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
    const agent = customAgents.find((item) => item.id === selectedItem.id);
    return agent ? { kind: "custom" as const, agent } : null;
  }, [customAgents, selectedItem]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
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
    setEditingAgentId(null);
    setAgentForm({ name: "", url: "", apiKey: "", model: "" });
    setAvailableModels([]);
    setLoadingModels(false);
    setIsConnectDialogOpen(true);
  }

  async function handleSaveCustomAgent() {
    const { name, url, apiKey, model } = agentForm;
    if (!name.trim() || !url.trim() || !apiKey.trim() || !model.trim()) {
      toast.error(all_fields_required());
      return;
    }
    try {
      const agents = editingAgentId
        ? await api.updateCustomAgent(editingAgentId, { name: name.trim(), url: url.trim(), apiKey: apiKey.trim(), model: model.trim() })
        : await api.createCustomAgent({ name: name.trim(), url: url.trim(), apiKey: apiKey.trim(), model: model.trim() });
      setCustomAgents(agents);
      const selectedId = editingAgentId ?? agents[agents.length - 1]?.id;
      if (selectedId) {
        setSelectedItem({ kind: "custom", id: selectedId });
      }
      setEditingAgentId(null);
      setIsConnectDialogOpen(false);
      toast.success(editingAgentId ? custom_agent_updated() : custom_agent_created());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failed_save_custom_agent());
    }
  }

  async function handleSetDefaultCustomAgent(agentId: string | null) {
    try {
      const nextId = await api.setDefaultCustomAgentId(agentId);
      setDefaultCustomAgentId(nextId);
      toast.success(nextId ? default_agent_updated() : default_agent_cleared());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failed_update_default_agent());
    }
  }

  async function loadCustomAgentModels(url: string, apiKey: string, currentModel: string) {
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
          return prev.model === currentModel ? prev : { ...prev, model: currentModel };
        }

        if (!prev.model.trim() && result.models[0]) {
          return { ...prev, model: result.models[0] };
        }

        return prev;
      });
    } catch (error) {
      setAvailableModels([]);
      toast.error(error instanceof Error ? error.message : failed_save_custom_agent());
    } finally {
      setLoadingModels(false);
    }
  }

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
      void loadCustomAgentModels(url, apiKey, agentForm.model.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [agentForm.apiKey, agentForm.url, isConnectDialogOpen]);

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

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sidebarEl = sidebarRef.current;
    if (!sidebarEl) return;
    const sidebarLeft = sidebarEl.getBoundingClientRect().left;

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    sidebarEl.style.transition = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 420);
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
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <div
        ref={sidebarRef}
        className={cn(
          "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r bg-card transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-0 border-r-transparent" : "w-[var(--agents-sidebar-width)]",
          isResizingSidebar ? "border-r-transparent" : "border-border",
        )}
        style={
          sidebarCollapsed
            ? undefined
            : ({ "--agents-sidebar-width": `${Math.min(sidebarWidth, 380)}px` } as CSSProperties)
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
              <div className="text-sm font-semibold text-foreground">{agents()} <span className="ml-1 text-xs font-normal text-muted-foreground tabular-nums">{customAgents.length}</span></div>
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
                      aria-label={add()}
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">{add()}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={<Button
                    variant="ghost"
                    size="icon-sm"
                    className="active:-translate-y-0"
                    onClick={handleCollapseSidebar}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                  </Button>}
                />
                <TooltipContent side="bottom">{collapse_sidebar()}</TooltipContent>
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
              {customAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedItem({ kind: "custom", id: agent.id })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedItem({ kind: "custom", id: agent.id });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    selectedItem?.kind === "custom" && selectedItem.id === agent.id
                      ? "bg-accent text-foreground"
                      : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={Settings01Icon} className="size-3.5 shrink-0 opacity-40" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs leading-5">{agent.name}</div>
                    <div className="truncate text-[11px] leading-4 text-muted-foreground">{agent.model}</div>
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
                        aria-label={edit()}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingAgentId(agent.id);
                          setAgentForm({ name: agent.name, url: agent.url, apiKey: agent.apiKey, model: agent.model });
                          setAvailableModels([]);
                          setLoadingModels(false);
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
                        aria-label={delete_message()}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const agents = await api.deleteCustomAgent(agent.id);
                            setCustomAgents(agents);
                            if (defaultCustomAgentId === agent.id) {
                              setDefaultCustomAgentId(null);
                            }
                            setSelectedItem((current) =>
                              current?.kind === "custom" && current.id === agent.id ? null : current,
                            );
                            toast.success(agent_removed());
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : failed_remove_agent());
                          }
                        }}
                        className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
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

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={resize_agents_sidebar()}
          onPointerDown={handleResizeStart}
          className={cn(
            "group absolute right-[-8px] top-0 z-20 h-full w-4 cursor-col-resize",
            sidebarCollapsed && "hidden",
            isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
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
        <LocalDevicesView
          loading={loading}
          onConnectClick={handleOpenConnect}
          selectedAgent={selectedAgent}
          defaultCustomAgentId={defaultCustomAgentId}
          onSetDefaultCustomAgent={handleSetDefaultCustomAgent}
        />
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
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
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
              onChange={(e) => setAgentForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={custom_agent_name_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{url()}</span>
            <input
              value={agentForm.url}
              onChange={(e) => setAgentForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder={custom_agent_url_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{api_key()}</span>
            <input
              value={agentForm.apiKey}
              onChange={(e) => setAgentForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={api_key_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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
                <SelectValue placeholder={loadingModels ? loading_label() : model_placeholder()} />
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
