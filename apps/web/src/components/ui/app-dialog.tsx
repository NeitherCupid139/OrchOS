import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type AppDialogSize = "sm" | "md" | "lg" | "xl";

const dialogSizeClasses: Record<AppDialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: AppDialogSize;
  nested?: boolean;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
  h?: string;
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  nested = false,
  className,
  bodyClassName,
  footerClassName,
  hideCloseButton = false,
  h,
}: AppDialogProps) {
  const zIndexClass = nested ? "z-[60]" : "z-50";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            zIndexClass,
          )}
        />
        <div className={cn("fixed inset-0 flex items-center justify-center p-4", zIndexClass)}>
          <DialogPrimitive.Popup
            className={cn(
              "relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl ring-1 ring-background/60 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              h ?? "max-h-[min(90vh,720px)]",
              dialogSizeClasses[size],
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
              {!hideCloseButton ? (
                <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground/60 hover:text-foreground" />}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </DialogPrimitive.Close>
              ) : null}
            </div>

            <div className={cn("min-h-0 flex-1 overflow-y-auto p-6", bodyClassName)}>
              {children}
            </div>

            {footer ? (
              <div
                className={cn(
                  "flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4",
                  footerClassName,
                )}
              >
                {footer}
              </div>
            ) : null}
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
