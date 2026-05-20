import { AsciiLoading } from "@/components/ui/ascii-loading";

export function RoutePending() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background">
      <AsciiLoading label="Loading..." />
    </div>
  );
}
