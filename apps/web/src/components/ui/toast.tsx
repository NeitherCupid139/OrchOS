import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button-1";
import { dismiss } from "@/paraglide/messages";
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";

const CloseIcon = ({ className }: { className: string }) => (
  <svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.47 13.53L13 14.06L14.06 13L13.53 12.47L9.06 8L13.53 3.53L14.06 3L13 1.94L12.47 2.47L8 6.94L3.53 2.47L3 1.94L1.94 3L2.47 3.53L6.94 8L2.47 12.47L1.94 13L3 14.06L3.53 13.53L8 9.06L12.47 13.53Z"
    />
  </svg>
);

const UndoIcon = () => (
  <svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16" className="fill-gray-1000">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.5 8C13.5 4.97 11.03 2.5 7.96 2.5C5.43 2.5 3.29 4.19 2.64 6.5H6V8H0.75C0.34 8 0 7.66 0 7.25V2H1.5V5.23C2.58 2.74 5.07 1 7.96 1C11.85 1 15 4.13 15 8C15 11.87 11.85 15 7.96 15C5.62 15 3.55 13.86 2.27 12.11L1.83 11.51L3.04 10.62L3.48 11.23C4.49 12.61 6.12 13.5 7.96 13.5C11.03 13.5 13.5 11.03 13.5 8Z"
    />
  </svg>
);

type Toast = {
  id: number;
  text: string | ReactNode;
  measuredHeight?: number;
  timeout?: NodeJS.Timeout;
  remaining?: number;
  start?: number;
  pause?: () => void;
  resume?: () => void;
  preserve?: boolean;
  action?: string;
  onAction?: () => void;
  onUndoAction?: () => void;
  type: "message" | "success" | "warning" | "error";
};

let root: ReturnType<typeof createRoot> | null = null;
let toastId = 0;

const toastStore = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),

  add(
    text: string | ReactNode,
    type: "message" | "success" | "warning" | "error",
    preserve?: boolean,
    action?: string,
    onAction?: () => void,
    onUndoAction?: () => void,
  ) {
    const id = toastId++;

    const toast: Toast = {
      id,
      text,
      preserve,
      action,
      onAction,
      onUndoAction,
      type,
    };

    if (!toast.preserve) {
      toast.remaining = 3000;
      toast.start = Date.now();

      const close = () => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.notify();
      };

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
        toast.timeout = setTimeout(close, toast.remaining);
      };
    }

    this.toasts.push(toast);
    this.notify();
  },

  remove(id: number) {
    toastStore.toasts = toastStore.toasts.filter((t) => t.id !== id);
    toastStore.notify();
  },

  subscribe(listener: () => void) {
    toastStore.listeners.add(listener);
    return () => {
      toastStore.listeners.delete(listener);
    };
  },

  notify() {
    toastStore.listeners.forEach((fn) => fn());
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

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
      {visibleToasts.map((toast, i) => {
        const isTop = i === visibleToasts.length - 1;
        const offset = visibleToasts.length - 1 - i;

        return (
          <div
            key={toast.id}
            className="absolute right-0 bottom-0 pointer-events-auto animate-in fade-in slide-in-from-right-5 rounded-xl bg-background/80 backdrop-blur-md border border-border shadow-lg text-foreground p-4"
            style={{
              width: 420,
              zIndex: 9999 - offset,
              transform: isTop
                ? "none"
                : `translateY(${-offset * 16}px) scale(${1 - offset * 0.03})`,
              transition: "transform .35s ease, opacity .35s ease",
            }}
            onMouseEnter={() => toastStore.toasts.forEach((t) => t.pause?.())}
            onMouseLeave={() => toastStore.toasts.forEach((t) => t.resume?.())}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                {toast.type === "success" && (
                  <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                )}
                {toast.type === "error" && (
                  <XCircleIcon className="size-4 shrink-0 text-red-500" />
                )}
                {toast.type === "warning" && (
                  <AlertTriangleIcon className="size-4 shrink-0 text-amber-500" />
                )}
                {toast.type === "message" && (
                  <InfoIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-sm">{toast.text}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                {toast.onUndoAction && (
                  <Button
                    type="tertiary"
                    svgOnly
                    size="small"
                    onClick={() => {
                      toast.onUndoAction?.();
                      toastStore.remove(toast.id);
                    }}
                  >
                    <UndoIcon />
                  </Button>
                )}
                <Button
                  type="tertiary"
                  svgOnly
                  size="small"
                  onClick={() => toastStore.remove(toast.id)}
                >
                  <CloseIcon className="fill-foreground/60" />
                </Button>
              </div>
            </div>
            {toast.action && (
              <div className="flex items-center justify-end gap-2 mt-2">
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
        );
      })}
    </div>
  );
};

const mountContainer = () => {
  if (root) return;
  const el = document.createElement("div");
  el.className = "fixed bottom-4 right-4 z-[9999]";
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
