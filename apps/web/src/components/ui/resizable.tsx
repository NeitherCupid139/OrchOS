import type { ComponentProps } from "react";
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  direction,
  orientation,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Group> & {
  direction?: ComponentProps<typeof ResizablePrimitive.Group>["orientation"];
}) {
  return (
    <ResizablePrimitive.Group
      className={cn("flex h-full w-full", className)}
      orientation={orientation ?? direction}
      {...props}
    />
  );
}

const ResizablePanel = ResizablePrimitive.Panel;

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      className={cn(
        "relative flex w-px cursor-col-resize items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 cursor-col-resize items-center justify-center rounded-sm border border-border bg-background text-muted-foreground aria-[orientation=horizontal]:cursor-row-resize">
          <GripVertical className="size-2.5" />
        </div>
      ) : null}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
