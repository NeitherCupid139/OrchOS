import { useCallback, useReducer } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { FolderIcon, ArrowLeft01Icon, Home01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { back, home } from "@/paraglide/messages";

interface DirectoryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  currentPath?: string;
}

interface DirEntry {
  name: string;
  path: string;
}

export function DirectoryPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentPath: initialPath,
}: DirectoryPickerDialogProps) {
  type DirectoryPickerState = {
    path: string;
    directories: DirEntry[];
    parentPath?: string;
    loading: boolean;
    selectedPath: string | null;
  };

  type DirectoryPickerAction =
    | { type: "load-start" }
    | {
        type: "load-success";
        payload: {
          path: string;
          directories: DirEntry[];
          parentPath?: string;
        };
      }
    | { type: "load-error" }
    | { type: "select-path"; payload: string };

  const [state, dispatch] = useReducer(
    (currentState: DirectoryPickerState, action: DirectoryPickerAction): DirectoryPickerState => {
      switch (action.type) {
        case "load-start":
          return {
            ...currentState,
            loading: true,
          };
        case "load-success":
          return {
            path: action.payload.path,
            directories: action.payload.directories,
            parentPath: action.payload.parentPath,
            loading: false,
            selectedPath: null,
          };
        case "load-error":
          return {
            ...currentState,
            directories: [],
            loading: false,
          };
        case "select-path":
          return {
            ...currentState,
            selectedPath: action.payload,
          };
      }
    },
    {
      path: initialPath || "~",
      directories: [],
      parentPath: undefined,
      loading: false,
      selectedPath: null,
    },
  );

  const { path, directories, parentPath, loading, selectedPath } = state;

  const loadDirectory = useCallback(async (dirPath: string) => {
    dispatch({ type: "load-start" });
    try {
      const result = await api.browseDirectory(dirPath);
      dispatch({
        type: "load-success",
        payload: {
          path: result.currentPath,
          parentPath: result.parentPath,
          directories: result.directories,
        },
      });
    } catch (err) {
      console.error("Failed to browse directory:", err);
      dispatch({ type: "load-error" });
    }
  }, []);

  const handleNavigate = (dirPath: string) => {
    loadDirectory(dirPath);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleGoHome = () => {
    loadDirectory("~");
  };

  const handleSelect = () => {
    if (selectedPath) {
      onSelect(selectedPath);
      onOpenChange(false);
    } else {
      // If nothing is selected, use the current path
      onSelect(path);
      onOpenChange(false);
    }
  };

  const handleSelectCurrent = () => {
    onSelect(path);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => {
      if (nextOpen && !open) {
        loadDirectory(initialPath || "~");
      }
      onOpenChange(nextOpen);
    }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/15 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <DialogPrimitive.Popup className="relative z-[60] w-full max-w-md rounded-lg border border-border bg-background p-0 shadow-lg ring-1 ring-background/60 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                Select Directory
              </DialogPrimitive.Title>
            </div>

            {/* Current path bar */}
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <Button {...props} size="icon-xs" variant="ghost" onClick={handleGoUp} disabled={!parentPath}>
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
                    </Button>
                  )}
                />
                <TooltipContent side="top">{back()}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <Button {...props} size="icon-xs" variant="ghost" onClick={handleGoHome}>
                      <HugeiconsIcon icon={Home01Icon} className="size-3.5" />
                    </Button>
                  )}
                />
                <TooltipContent side="top">{home()}</TooltipContent>
              </Tooltip>
              <div className="flex-1 rounded-md bg-muted px-2.5 py-1 text-xs font-mono text-foreground truncate">
                {path}
              </div>
            </div>

            {/* Directory list */}
            <div className="h-72 overflow-y-auto p-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner className="text-muted-foreground" />
                </div>
              ) : directories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <HugeiconsIcon icon={FolderIcon} className="size-6 mb-2 opacity-30" />
                  <p className="text-xs">No subdirectories found</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {directories.map((dir) => (
                    <button
                      type="button"
                      key={dir.path}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-sm text-left transition-colors",
                        selectedPath === dir.path
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                      onClick={() => dispatch({ type: "select-path", payload: dir.path })}
                      onDoubleClick={() => handleNavigate(dir.path)}
                    >
                      <HugeiconsIcon
                        icon={FolderIcon}
                        className="size-3.5 shrink-0 text-primary/70"
                      />
                      <span className="truncate">{dir.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button size="sm" variant="outline" onClick={handleSelectCurrent}>
                Use This Directory
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <DialogPrimitive.Close>Cancel</DialogPrimitive.Close>
                </Button>
                <Button size="sm" onClick={handleSelect} disabled={!selectedPath}>
                  Open
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
