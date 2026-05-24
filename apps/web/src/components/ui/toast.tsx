import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button-1";
import { Button as BaseButton } from "@/components/ui/button";
import { dismiss } from "@/paraglide/messages";
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  Undo2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "message" | "success" | "warning" | "error";

type Toast = {
  id: number;
  text: string | ReactNode;
  type: ToastType;
  preserve?: boolean;
  exiting?: boolean;
  action?: string;
  onAction?: () => void;
  onUndoAction?: () => void;
  timeout?: ReturnType<typeof setTimeout>;
  remaining?: number;
  start?: number;
  /** Progress bar animation key: changes on pause/resume to restart animation with correct duration */
  progressKey?: number;
  pause?: () => void;
  resume?: () => void;
};

let root: ReturnType<typeof createRoot> | null = null;
let toastId = 0;
let progressKeyCounter = 0;

const toastStore = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),

  add(
    text: string | ReactNode,
    type: ToastType,
    preserve?: boolean,
    action?: string,
    onAction?: () => void,
    onUndoAction?: () => void,
  ) {
    const id = toastId++;
    const toast: Toast = {
      id,
      text,
      type,
      preserve,
      action,
      onAction,
      onUndoAction,
      progressKey: progressKeyCounter++,
    };

    if (!preserve) {
      toast.remaining = 3000;
      toast.start = Date.now();
      const close = () => this.remove(id);
      toast.timeout = setTimeout(close, toast.remaining);

      toast.pause = () => {
        if (!toast.timeout) return;
        clearTimeout(toast.timeout);
        toast.timeout = undefined;
        toast.remaining! -= Date.now() - toast.start!;
      };

      toast.resume = () => {
        if (toast.timeout) return;
        toast.start = Date.now();
        toast.progressKey = progressKeyCounter++;
        toast.timeout = setTimeout(() => this.remove(id), toast.remaining);
      };
    }

    this.toasts.push(toast);
    this.notify();
  },

  remove(id: number) {
    const toast = this.toasts.find((t) => t.id === id);
    if (!toast) return;
    if (toast.timeout) {
      clearTimeout(toast.timeout);
      toast.timeout = undefined;
    }
    // Trigger exit animation then remove from store
    toast.exiting = true;
    this.notify();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.notify();
    }, 250);
  },

  removeImmediate(id: number) {
    const toast = this.toasts.find((t) => t.id === id);
    if (toast?.timeout) {
      clearTimeout(toast.timeout);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  },

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },

  notify() {
    this.listeners.forEach((fn) => fn());
  },
};

const iconConfig: Record<
  ToastType,
  { Icon: typeof CheckCircleIcon; color: string; progressColor: string }
> = {
  success: {
    Icon: CheckCircleIcon,
    color: "text-emerald-500",
    progressColor: "bg-emerald-500/40",
  },
  error: {
    Icon: XCircleIcon,
    color: "text-destructive",
    progressColor: "bg-destructive/40",
  },
  warning: {
    Icon: AlertTriangleIcon,
    color: "text-amber-500",
    progressColor: "bg-amber-500/40",
  },
  message: {
    Icon: InfoIcon,
    color: "text-blue-500",
    progressColor: "bg-blue-500/40",
  },
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToasts([...toastStore.toasts]);
    return toastStore.subscribe(() => {
      setToasts([...toastStore.toasts]);
    });
  }, []);

  const visibleToasts = toasts.slice(-5);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
      {visibleToasts.map((toast, i) => {
        const isTop = i === visibleToasts.length - 1;
        const offset = visibleToasts.length - 1 - i;
        const { Icon, color, progressColor } = iconConfig[toast.type];

        return (
          <div
            key={toast.id}
            className={cn(
              "absolute right-0 bottom-0 pointer-events-auto",
              "rounded-xl bg-card ring-1 ring-foreground/10",
              "transition-all duration-200 ease-out",
              isTop ? "shadow-lg" : "shadow-sm",
              toast.exiting
                ? "translate-x-4 opacity-0 scale-95"
                : "translate-x-0 opacity-100",
            )}
            style={{
              width: 380,
              zIndex: 9999 - offset,
              transform: isTop
                ? "none"
                : `translateY(${-offset * 14}px) scale(${1 - offset * 0.03})`,
              filter: isTop ? "none" : `brightness(${1 - offset * 0.04})`,
              transition:
                "transform .35s ease, opacity .2s ease, filter .35s ease, box-shadow .35s ease",
            }}
            onMouseEnter={() => {
              toastStore.toasts.forEach((t) => {
                if (!t.exiting) t.pause?.();
              });
            }}
            onMouseLeave={() => {
              toastStore.toasts.forEach((t) => {
                if (!t.exiting) t.resume?.();
              });
            }}
          >
            {/* Progress bar */}
            {!toast.preserve && !toast.exiting && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl overflow-hidden">
                <div
                  key={toast.progressKey}
                  className={cn("h-full rounded-full", progressColor)}
                  style={{
                    animation: `toast-progress ${toast.remaining ?? 3000}ms linear forwards`,
                  }}
                />
              </div>
            )}

            <div className="relative px-4 py-3">
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    "size-5 shrink-0 mt-0.5",
                    color,
                    toast.exiting && "opacity-0 transition-opacity duration-150",
                  )}
                />
                <p className="flex-1 text-sm leading-snug text-foreground min-w-0 break-words pt-px">
                  {toast.text}
                </p>
                <BaseButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toastStore.remove(toast.id)}
                  className="shrink-0 -mr-1.5 -mt-1.5 text-muted-foreground/60 hover:text-foreground after:absolute after:inset-0"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </BaseButton>
              </div>

              {/* Action buttons row */}
              {(toast.action || toast.onUndoAction) && (
                <div className="flex items-center justify-end gap-2 mt-2.5 pt-2.5 border-t border-border/50">
                  {toast.onUndoAction && (
                    <Button
                      type="tertiary"
                      size="small"
                      onClick={() => {
                        toast.onUndoAction?.();
                        toastStore.removeImmediate(toast.id);
                      }}
                    >
                      <Undo2Icon className="size-4" />
                      <span className="ml-1.5">Undo</span>
                    </Button>
                  )}
                  <Button
                    type="tertiary"
                    size="small"
                    onClick={() => toastStore.remove(toast.id)}
                  >
                    {dismiss()}
                  </Button>
                  {toast.onAction && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        toast.onAction?.();
                        toastStore.remove(toast.id);
                      }}
                    >
                      {toast.action}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const mountContainer = () => {
  if (root) return;
  const el = document.createElement("div");
  el.id = "toast-container-root";
  document.body.appendChild(el);
  root = createRoot(el);
  root.render(<ToastContainer />);
};

interface Message {
  text: string | ReactNode;
  preserve?: boolean;
  action?: string;
  onAction?: () => void;
  onUndoAction?: () => void;
}

export const useToasts = () => {
  return {
    message: useCallback(({ text, preserve, action, onAction, onUndoAction }: Message) => {
      mountContainer();
      toastStore.add(text, "message", preserve, action, onAction, onUndoAction);
    }, []),
    success: useCallback((text: string) => {
      mountContainer();
      toastStore.add(text, "success");
    }, []),
    warning: useCallback((text: string) => {
      mountContainer();
      toastStore.add(text, "warning");
    }, []),
    error: useCallback((text: string) => {
      mountContainer();
      toastStore.add(text, "error");
    }, []),
  };
};

export const toast = {
  message(text: string | ReactNode, _options?: { closeButton?: boolean }) {
    mountContainer();
    toastStore.add(text, "message");
  },
  success(text: string, _options?: { closeButton?: boolean }) {
    mountContainer();
    toastStore.add(text, "success");
  },
  warning(text: string, _options?: { closeButton?: boolean }) {
    mountContainer();
    toastStore.add(text, "warning");
  },
  error(text: string, _options?: { closeButton?: boolean }) {
    mountContainer();
    toastStore.add(text, "error");
  },
};
