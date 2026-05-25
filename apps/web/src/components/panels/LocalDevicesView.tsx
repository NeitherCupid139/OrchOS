import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  CheckmarkBadge01Icon,
  ComputerIcon,
  LinkSquare02Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/ui/interactive-empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomAgent, LocalAgentProfile } from "@/lib/api";
import type { BuiltInAgent } from "@/lib/built-in-agent";
import { api_key, app_version, connect_agent, connect_local_device, created, default_agent, device_id, endpoint, last_seen, loading_devices, model, no_runtimes_reported, offline, online, pair_any_machine_desc, registered, runtimes, set_as_default, unknown, unknown_platform, unset_default } from "@/paraglide/messages";

type SelectedAgent =
  | { kind: "custom"; agent: CustomAgent }
  | { kind: "local"; agent: LocalAgentProfile }
  | { kind: "builtin"; agent: BuiltInAgent }
  | null;

interface LocalDevicesViewProps {
  loading: boolean;
  onConnectClick: () => void;
  selectedAgent: SelectedAgent;
  defaultCustomAgentId?: string | null;
  onSetDefaultCustomAgent?: (agentId: string | null) => void | Promise<void>;
}

export function LocalDevicesView({
  loading,
  onConnectClick,
  selectedAgent,
  defaultCustomAgentId = null,
  onSetDefaultCustomAgent,
}: LocalDevicesViewProps) {
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">{loading_devices()}</div>
      </div>
    );
  }

  if (selectedAgent?.kind === "builtin") {
    const { agent } = selectedAgent;

    return (
      <div className="flex min-h-0 flex-1 bg-background p-6">
        <section className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={ComputerIcon} className="size-5" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  {agent.badge}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">{agent.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pre-configured agent. Available to all users. Usage limits apply based on your plan.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailCard label="Endpoint" value={agent.url} mono />
            <DetailCard label="Model" value={agent.model} mono />
          </div>
        </section>
      </div>
    );
  }

  if (selectedAgent?.kind === "custom") {
    const { agent } = selectedAgent;
    const isDefault = defaultCustomAgentId === agent.id;

    return (
      <div className="flex min-h-0 flex-1 bg-background p-6">
        <section className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Settings01Icon} className="size-5" />
                </div>
                {isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-3.5" />
                    {default_agent()}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">{agent.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{agent.model}</p>
            </div>
            <Button
              type="button"
              variant={isDefault ? "outline" : "default"}
              onClick={() => onSetDefaultCustomAgent?.(isDefault ? null : agent.id)}
            >
              {isDefault ? unset_default() : set_as_default()}
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailCard label={endpoint()} value={agent.url} mono />
            <DetailCard label={model()} value={agent.model} mono />
            <DetailCard label={api_key()} value={maskApiKey(agent.apiKey)} mono />
            <DetailCard label={created()} value={formatDateTime(agent.createdAt)} />
          </div>
        </section>
      </div>
    );
  }

  if (selectedAgent?.kind === "local") {
    const { agent } = selectedAgent;

    return (
      <div className="flex min-h-0 flex-1 bg-background p-6">
        <section className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={ComputerIcon} className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{agent.name}</h2>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium",
                    agent.status === "online"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {agent.status === "online" ? online() : offline()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {agent.platform || unknown_platform()}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailCard label={device_id()} value={agent.deviceId} mono />
            <DetailCard label={app_version()} value={agent.appVersion || unknown()} />
            <DetailCard label={registered()} value={formatDateTime(agent.registeredAt)} />
            <DetailCard label={last_seen()} value={formatDateTime(agent.lastSeenAt)} />
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-foreground">{runtimes()}</div>
            {agent.runtimes.length > 0 ? (
              <div className="grid gap-2">
                {agent.runtimes.map((runtime) => (
                  <div
                    key={`${runtime.name}-${runtime.path ?? runtime.command}`}
                    className="rounded-xl border border-border/70 bg-background px-3 py-2"
                  >
                    <div className="text-sm font-medium text-foreground">{runtime.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {runtime.version || runtime.path || runtime.command}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-background px-3 py-4 text-sm text-muted-foreground">
                {no_runtimes_reported()}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
      <EmptyState
        variant="subtle"
        size="lg"
        title={connect_local_device()}
        description={pair_any_machine_desc()}
        icons={[
          <HugeiconsIcon key="d1" icon={ComputerIcon} className="size-6" />,
          <HugeiconsIcon key="d2" icon={LinkSquare02Icon} className="size-6" />,
          <HugeiconsIcon key="d3" icon={Add01Icon} className="size-6" />,
        ]}
        action={{
          label: connect_agent(),
          icon: <HugeiconsIcon icon={Add01Icon} className="size-4" />,
          onClick: onConnectClick,
        }}
        className="w-full max-w-lg"
      />
    </div>
  );
}

function DetailCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <div className={cn("mt-1 break-all text-sm text-foreground", mono && "font-mono text-[13px]")}>
        {value}
      </div>
    </div>
  );
}

function maskApiKey(value: string) {
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
