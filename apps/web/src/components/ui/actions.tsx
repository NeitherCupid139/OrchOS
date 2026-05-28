"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
};

export function Action({
  tooltip,
  children,
  label,
  className,
  onClick,
}: ActionProps) {
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
              onClick={onClick}
            />
          }
        >
          {children}
          <span className="sr-only">{label || tooltip}</span>
        </TooltipTrigger>
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
      onClick={onClick}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );
}
