import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppleSwitch } from "@/components/unlumen-ui/apple-switch";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronDown,
  ChevronRight,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { adaptive, auto_commit, auto_fix, control_panel, model_cloud, model_local, model_strategy, off, on } from "@/paraglide/messages";
import type { ControlSettings } from "@/lib/types";
import { api } from "@/lib/api";

interface ControlPanelProps {
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
}

export function ControlPanel({ settings, onSettingsChange }: ControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async (key: keyof Pick<ControlSettings, "autoCommit" | "autoFix">) => {
    if (!settings) return;
    const updated = await api.updateSettings({ [key]: !settings[key] });
    onSettingsChange(updated);
  };

  const handleStrategyChange = async (strategy: ControlSettings["modelStrategy"]) => {
    if (!settings) return;
    const updated = await api.updateSettings({ modelStrategy: strategy });
    onSettingsChange(updated);
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50"
      >
        <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
        <span className="flex-1 text-left">{control_panel()}</span>
        {expanded ? (
          <HugeiconsIcon icon={ChevronDown} className="size-3" />
        ) : (
          <HugeiconsIcon icon={ChevronRight} className="size-3" />
        )}
      </button>

      {expanded && settings && (
        <div className="space-y-3 border-t border-border px-6 py-4">
          {/* Auto Commit */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{auto_commit()}</span>
            <div className="flex items-center gap-2 text-sm">
              <AppleSwitch
                checked={settings.autoCommit}
                onCheckedChange={() => void handleToggle("autoCommit")}
                size="sm"
                aria-label={auto_commit()}
              />
              <span
                className={cn(
                  "text-xs",
                  settings.autoCommit ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {settings.autoCommit ? on() : off()}
              </span>
            </div>
          </div>

          {/* Auto Fix */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{auto_fix()}</span>
            <div className="flex items-center gap-2 text-sm">
              <AppleSwitch
                checked={settings.autoFix}
                onCheckedChange={() => void handleToggle("autoFix")}
                size="sm"
                aria-label={auto_fix()}
              />
              <span
                className={cn(
                  "text-xs",
                  settings.autoFix ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {settings.autoFix ? on() : off()}
              </span>
            </div>
          </div>

          {/* Model Strategy */}
          <div>
            <span className="mb-2 block text-sm text-foreground">{model_strategy()}</span>
            <div className="flex gap-1.5">
              {(["local-first", "cloud-first", "adaptive"] as const).map((strategy) => {
                const labelMap = {
                  "local-first": model_local(),
                  "cloud-first": model_cloud(),
                  adaptive: adaptive(),
                };
                return (
                  <button
                    key={strategy}
                    onClick={() => handleStrategyChange(strategy)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      settings.modelStrategy === strategy
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-accent",
                    )}
                  >
                    {labelMap[strategy]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
