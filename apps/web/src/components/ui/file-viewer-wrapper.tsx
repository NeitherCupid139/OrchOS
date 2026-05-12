import { createClientOnlyFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";

import type { ApiComponent } from "@/components/ui/file-viewer";

export type { ApiComponent };

const loadComponentFileViewer = createClientOnlyFn(async () => {
  const mod = await import("@/components/ui/file-viewer");
  return mod.default;
});

export function ComponentFileViewerWrapper({ component }: { component: ApiComponent }) {
  const [Viewer, setViewer] = useState<ComponentType<{ component: ApiComponent }> | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadComponentFileViewer().then((loaded) => {
      if (mounted) {
        setViewer(() => loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {Viewer ? <Viewer component={component} /> : null}
    </div>
  );
}
