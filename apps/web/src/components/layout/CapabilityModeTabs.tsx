import { FolderLibraryIcon, Store04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { getCapabilityPath, type CapabilityView, type CapabilityViewMode } from "@/lib/capability-routing";
import { cn } from "@/lib/utils";
import { market, mine } from "@/paraglide/messages";

interface CapabilityModeTabsProps {
  view: CapabilityView;
  mode: CapabilityViewMode;
  onModeChange?: (mode: CapabilityViewMode) => void;
}

export function CapabilityModeTabs({ view, mode, onModeChange }: CapabilityModeTabsProps) {
  const capabilityModeItems: Array<{
    key: CapabilityViewMode;
    label: string;
    icon: typeof FolderLibraryIcon;
    iconClassName: string;
  }> = [
    { key: "mine", label: mine(), icon: FolderLibraryIcon, iconClassName: "text-emerald-500" },
    { key: "market", label: market(), icon: Store04Icon, iconClassName: "text-sky-500" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {capabilityModeItems.map((item) => (
        <button
          key={item.key}
          type="button"
          data-path={getCapabilityPath(view, item.key)}
          onClick={() => onModeChange?.(item.key)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-2.5",
            mode === item.key
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <HugeiconsIcon icon={item.icon} className={cn("size-3", item.iconClassName)} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
