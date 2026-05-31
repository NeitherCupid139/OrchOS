"use client";

import { type ReactNode, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

export type ActionsProps = {
  className?: string;
  children: ReactNode;
};

export function Actions({ className, children }: ActionsProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {children}
    </div>
  );
}

export type ActionProps = {
  tooltip?: string;
  label?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Click feedback animation style */
  animation?: "checkmark" | "spin";
};

const CHECKMARK_DURATION = 1600;
const SPIN_DURATION = 900;

function ActionIcon({
  clicked,
  children,
  animation,
}: {
  clicked: boolean;
  children: ReactNode;
  animation?: ActionProps["animation"];
}) {
  // ── Spin animation ────────────────────────────────────────────────
  if (animation === "spin") {
    return (
      <span
        className={cn(
          "inline-flex size-4 items-center justify-center",
          clicked && "animate-[action-spin_0.8s_ease-in-out]",
        )}
      >
        {children}
      </span>
    );
  }

  // ── Checkmark animation ───────────────────────────────────────────
  if (animation === "checkmark") {
    return (
      <span className="relative inline-flex size-4 items-center justify-center">
        {/* Original icon — fades out on click */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-200",
            clicked
              ? "opacity-0 scale-75"
              : "opacity-100 scale-100 delay-100",
          )}
        >
          {children}
        </span>
        {/* Checkmark — fades in on click */}
        <CheckIcon
          className={cn(
            "absolute size-4 transition-all duration-200",
            clicked
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75",
          )}
        />
      </span>
    );
  }

  // ── No animation ──────────────────────────────────────────────────
  return <>{children}</>;
}

export function Action({
  tooltip,
  children,
  label,
  className,
  onClick,
  animation,
}: ActionProps) {
  const [clicked, setClicked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const triggerAction = useCallback(() => {
    if (clicked) return;
    onClick?.();
    if (!animation) return;
    setClicked(true);
    clearTimeout(timeoutRef.current);
    const duration =
      animation === "spin" ? SPIN_DURATION : CHECKMARK_DURATION;
    timeoutRef.current = setTimeout(() => setClicked(false), duration);
  }, [clicked, onClick, animation]);

  const icon = animation ? (
    <ActionIcon clicked={clicked} animation={animation}>
      {children}
    </ActionIcon>
  ) : (
    children
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className={cn(
                "size-7 text-muted-foreground hover:text-foreground",
                className,
              )}
              size="icon-xs"
              variant="ghost"
              onClick={triggerAction}
            >
              {icon}
              <span className="sr-only">{label || tooltip}</span>
            </Button>
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      className={cn(
        "size-7 text-muted-foreground hover:text-foreground",
        className,
      )}
      size="icon-xs"
      variant="ghost"
      onClick={triggerAction}
    >
      {icon}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );
}
