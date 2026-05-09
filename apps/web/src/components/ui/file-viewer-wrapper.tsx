import ComponentFileViewer, { type ApiComponent } from "@/components/ui/file-viewer";

export type { ApiComponent };

export function ComponentFileViewerWrapper({ component }: { component: ApiComponent }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <ComponentFileViewer component={component} />
    </div>
  );
}
