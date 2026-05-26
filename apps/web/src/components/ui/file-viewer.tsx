import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  Check,
  Copy,
  FileCode,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  use,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { toast } from "@/components/ui/toast";
import {
  code,
  copy_file_content,
  file_content_copied,
  loading_code,
  preview,
  preview_markdown,
  show_markdown_source,
} from "@/paraglide/messages";
import { getSharedHighlighter } from "@/lib/shiki-singleton";

export interface ApiComponent {
  author?: string;
  name: string;
  version: string;
  files: Array<{
    path: string;
    content?: string;
  }>;
}

interface TreeViewElement {
  id: string;
  name: string;
  isSelectable?: boolean;
  children?: TreeViewElement[];
}

interface TreeContextProps {
  selectedId: string | undefined;
  expandedItems: string[] | undefined;
  handleExpand: (id: string) => void;
  selectItem: (id: string) => void;
  indicator: boolean;
  openIcon?: ReactNode;
  closeIcon?: ReactNode;
  direction: "rtl" | "ltr";
}

const TreeContext = createContext<TreeContextProps | null>(null);

function getHighlighter() {
  return getSharedHighlighter();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLanguage(lang: string) {
  if (lang === "tsx") return "typescript";
  if (lang === "ts") return "typescript";
  if (lang === "js") return "javascript";
  if (lang === "md") return "markdown";
  return lang;
}

function isMarkdownFile(filePath: string) {
  return /\.mdx?$/i.test(filePath);
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
    };
  }, []);

  return theme;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

const useTree = () => {
  const context = use(TreeContext);

  if (!context) {
    throw new Error("useTree must be used within a TreeProvider");
  }

  return context;
};

function ShikiViewer({
  code,
  lang = "tsx",
  showLineNumbers = true,
  className,
}: {
  code: string;
  lang?: string;
  showLineNumbers?: boolean;
  className?: string;
}) {
  /* eslint-disable react--no-danger */
  const [highlight, dispatch] = useReducer(
    (
      state: { html: string; isLoading: boolean },
      action:
        | { type: "SET_LOADING" }
        | { type: "SET_DATA"; payload: string }
        | { type: "SET_ERROR"; payload: string },
    ) => {
      switch (action.type) {
        case "SET_LOADING":
          return { ...state, isLoading: true };
        case "SET_DATA":
          return { html: action.payload, isLoading: false };
        case "SET_ERROR":
          return { html: action.payload, isLoading: false };
      }
    },
    { html: "", isLoading: true },
  );
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    let mounted = true;

    async function highlight() {
      try {
        dispatch({ type: "SET_LOADING" });

        const highlighter = await getHighlighter();
        const highlightedHtml = highlighter.codeToHtml(code, {
          lang: normalizeLanguage(lang),
          theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
        });

        if (mounted) {
          dispatch({ type: "SET_DATA", payload: highlightedHtml });
        }
      } catch {
        if (mounted) {
          dispatch({
            type: "SET_ERROR",
            payload: `<pre><code>${escapeHtml(code)}</code></pre>`,
          });
        }
      }
    }

    void highlight();

    return () => {
      mounted = false;
    };
  }, [code, lang, resolvedTheme]);

  const content = useMemo(() => {
    if (!showLineNumbers) {
      return highlight.html;
    }

    const lineNumbers = code
      .split("\n")
      .map((_, index) => `<span>${index + 1}</span>`)
      .join("");

    return highlight.html.replace(
      /<pre[^>]*>([\s\S]*)<\/pre>/,
      `<pre class="line-numbers"><span class="line-numbers-rows">${lineNumbers}</span>$1</pre>`,
    );
  }, [code, highlight.html, showLineNumbers]);

  return (
    <>
      <style>{`
        .shiki-viewer {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 1rem;
          background: var(--card);
        }
        .shiki-viewer pre {
          margin: 0;
          padding: 1rem;
          overflow-x: auto;
          background: transparent !important;
          font-size: 0.875rem;
          line-height: 1.55;
          white-space: pre;
        }
        .shiki-viewer code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: inherit;
          line-height: inherit;
          white-space: pre;
        }
        .shiki-viewer .line-numbers {
          display: flex;
        }
        .shiki-viewer .line-numbers .line-numbers-rows {
          display: flex;
          flex-direction: column;
          min-width: 2.75rem;
          margin-right: 0.75rem;
          padding-right: 0.75rem;
          border-right: 1px solid var(--border);
          color: var(--muted-foreground);
          text-align: right;
          user-select: none;
        }
        .shiki-viewer .line-numbers .line-numbers-rows > span {
          display: block;
        }
      `}</style>
      <div className={cn("shiki-viewer", className)}>
        {highlight.isLoading ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            {loading_code()}
          </div>
        ) : (
          /* react-doctor-disable-next-line react/no-danger */
          <div dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
    </>
  );
  /* eslint-enable react--no-danger */
}

function MarkdownPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <div className="prose prose-sm max-w-none px-5 py-4 text-foreground dark:prose-invert prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground/85 prose-li:text-foreground/85 prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.8125rem] prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/60 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown
          components={{
            a: ({ ...props }) => (
              <a
                {...props}
                className="font-medium text-primary underline-offset-4 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function FileHeader({
  file,
  onCopy,
  copied,
  canPreview,
  isPreview,
  onTogglePreview,
}: {
  file: { path: string; content?: string };
  onCopy: () => void;
  copied: boolean;
  canPreview: boolean;
  isPreview: boolean;
  onTogglePreview: () => void;
}) {
  const getFileType = (filePath: string) => {
    if (filePath.endsWith(".tsx")) return "TSX";
    if (filePath.endsWith(".ts")) return "TS";
    if (filePath.endsWith(".js")) return "JS";
    if (filePath.endsWith(".jsx")) return "JSX";
    if (filePath.endsWith(".md")) return "MD";
    if (filePath.endsWith(".css")) return "CSS";
    if (filePath.endsWith(".json")) return "JSON";
    return "TXT";
  };

  return (
    <div className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Badge variant="outline" className="text-[11px]">
          {getFileType(file.path)}
        </Badge>
        <span className="truncate text-xs text-muted-foreground">
          {file.path}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {canPreview ? (
          <Button
            variant={isPreview ? "secondary" : "outline"}
            size="sm"
            onClick={onTogglePreview}
            title={isPreview ? show_markdown_source() : preview_markdown()}
          >
            {isPreview ? code() : preview()}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCopy}
          className="cursor-pointer"
          title={copy_file_content()}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function TreeIndicator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { direction } = useTree();

  return (
    <div
      className={cn(
        "absolute top-0 h-full w-px rounded-full bg-border/80",
        direction === "rtl" ? "right-1.5" : "left-1.5",
        className,
      )}
      {...props}
    />
  );
}

function Folder({
  element,
  value,
  isSelectable = true,
  isSelect,
  children,
  className,
}: {
  element: string;
  value: string;
  isSelectable?: boolean;
  isSelect?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const {
    direction,
    handleExpand,
    expandedItems,
    indicator,
    openIcon,
    closeIcon,
  } = useTree();

  return (
    <AccordionPrimitive.Item value={value} className="relative overflow-hidden">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm transition-colors",
          isSelect && isSelectable && "bg-muted",
          !isSelectable
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-accent hover:text-accent-foreground",
          className,
        )}
        disabled={!isSelectable}
        onClick={() => handleExpand(value)}
      >
        {expandedItems?.includes(value)
          ? (openIcon ?? <FolderOpenIcon className="size-4" />)
          : (closeIcon ?? <FolderIcon className="size-4" />)}
        <span className="truncate">{element}</span>
      </AccordionPrimitive.Trigger>
      <AccordionPrimitive.Content className="relative overflow-hidden text-sm">
        {indicator ? <TreeIndicator /> : null}
        <AccordionPrimitive.Root
          type="multiple"
          className={cn(
            "flex flex-col gap-1 py-1",
            direction === "rtl" ? "mr-5" : "ml-5",
          )}
          value={expandedItems}
        >
          {children}
        </AccordionPrimitive.Root>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

function File({
  value,
  isSelectable = true,
  isSelect,
  fileIcon,
  children,
  className,
  onClick,
}: {
  value: string;
  isSelectable?: boolean;
  isSelect?: boolean;
  fileIcon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { selectedId, selectItem } = useTree();
  const isSelected = isSelect ?? selectedId === value;

  return (
    <button
      disabled={!isSelectable}
      className={cn(
        "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm transition-colors",
        isSelected && isSelectable && "bg-muted",
        !isSelectable
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      onClick={() => {
        selectItem(value);
        onClick?.();
      }}
      type="button"
    >
      {fileIcon ?? <FileIcon className="size-4" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Tree({
  selectedId,
  expandedItems,
  children,
  className,
  indicator = true,
  openIcon,
  closeIcon,
  dir = "ltr",
  onSelectItem,
  onExpand,
}: {
  selectedId?: string;
  expandedItems?: string[];
  children: ReactNode;
  className?: string;
  indicator?: boolean;
  openIcon?: ReactNode;
  closeIcon?: ReactNode;
  dir?: "rtl" | "ltr";
  onSelectItem?: (id: string) => void;
  onExpand?: (id: string) => void;
}) {
  const selectItem = useCallback(
    (id: string) => onSelectItem?.(id),
    [onSelectItem],
  );
  const handleExpand = useCallback(
    (id: string) => {
      onExpand?.(id);
    },
    [onExpand],
  );

  return (
    <TreeContext.Provider
      value={{
        selectedId,
        expandedItems,
        handleExpand,
        selectItem,
        indicator,
        openIcon,
        closeIcon,
        direction: dir,
      }}
    >
      <div className={cn("size-full", className)}>
        <div className="relative h-full px-2">
          <AccordionPrimitive.Root
            type="multiple"
            value={expandedItems}
            className="flex flex-col gap-1"
          >
            {children}
          </AccordionPrimitive.Root>
        </div>
      </div>
    </TreeContext.Provider>
  );
}

function TreeItem({
  item,
  selectedFile,
  onFileSelect,
}: {
  item: TreeViewElement;
  selectedFile?: string;
  onFileSelect: (file: string) => void;
}) {
  if (item.children?.length) {
    return (
      <Folder
        key={item.id}
        element={item.name}
        value={item.id}
        className="truncate"
      >
        {item.children.map((child) => (
          <TreeItem
            key={child.id}
            item={child}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </Folder>
    );
  }

  return (
    <File
      key={item.id}
      value={item.id}
      onClick={() => onFileSelect(item.id)}
      isSelectable={item.isSelectable ?? true}
      isSelect={selectedFile === item.id}
      className="truncate whitespace-nowrap"
    >
      {item.name}
    </File>
  );
}

function FileTree({
  tree,
  selectedFile,
  onFileSelect,
  component,
}: {
  tree: TreeViewElement[];
  selectedFile?: string;
  onFileSelect: (file: string) => void;
  component: ApiComponent;
}) {
  const allExpandableItems = useMemo(() => {
    const expandableItems: string[] = [];

    const traverse = (elements: TreeViewElement[]) => {
      elements.forEach((element) => {
        if (element.children?.length) {
          expandableItems.push(element.id);
          traverse(element.children);
        }
      });
    };

    traverse(tree);
    return expandableItems;
  }, [tree]);

  const [localExpandedItems, setLocalExpandedItems] = useState<string[] | null>(
    null,
  );
  const expandedItems = localExpandedItems ?? allExpandableItems;

  const handleExpand = useCallback(
    (id: string) => {
      setLocalExpandedItems((prev) => {
        const currentItems = prev ?? allExpandableItems;

        if (currentItems.includes(id)) {
          return currentItems.filter((item) => item !== id);
        }
        return [...currentItems, id];
      });
    },
    [allExpandableItems],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileCode className="size-4" />
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {component.name}
          </p>
        </div>
        {component.author ? (
          <Badge variant="secondary" className="shrink-0">
            {component.author}
          </Badge>
        ) : null}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          <Tree
            expandedItems={expandedItems}
            selectedId={selectedFile}
            indicator
            onSelectItem={onFileSelect}
            onExpand={handleExpand}
          >
            {tree.map((item) => (
              <TreeItem
                key={item.id}
                item={item}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
              />
            ))}
          </Tree>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function ComponentFileViewer({
  component,
}: {
  component: ApiComponent;
}) {
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [previewOverride, setPreviewOverride] = useState<boolean | null>(null);
  const isDesktop = useIsDesktop();

  const files = useMemo(
    () => component.files.filter((file) => file.content),
    [component.files],
  );

  const tree = useMemo(() => {
    type TreeNode = {
      id: string;
      name: string;
      isSelectable: boolean;
      children?: Record<string, TreeNode>;
    };

    const root: Record<string, TreeNode> = {};

    for (const file of files) {
      const parts = file.path.split("/");
      let current = root;

      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        const id = parts.slice(0, index + 1).join("/");

        if (!current[part]) {
          current[part] =
            index === parts.length - 1
              ? {
                  id: file.path,
                  name: part,
                  isSelectable: true,
                }
              : {
                  id,
                  name: part,
                  isSelectable: false,
                  children: {},
                };
        }

        current = current[part].children ?? {};
      }
    }

    const toArray = (value: Record<string, TreeNode>): TreeViewElement[] =>
      Object.values(value).map((item) =>
        item.children
          ? {
              id: item.id,
              name: item.name,
              isSelectable: item.isSelectable,
              children: toArray(item.children),
            }
          : {
              id: item.id,
              name: item.name,
              isSelectable: item.isSelectable,
            },
      );

    return toArray(root);
  }, [files]);

  const selectedPath = selectedFile ?? files[0]?.path;
  const selected = files.find((file) => file.path === selectedPath) ?? files[0];
  const canPreview = selected ? isMarkdownFile(selected.path) : false;
  const isPreview = previewOverride ?? canPreview;

  const selectFile = useCallback((file: string) => {
    setSelectedFile(file);
    setPreviewOverride(isMarkdownFile(file));
  }, []);

  const handleCopy = useCallback(() => {
    if (!selected?.content) {
      return;
    }

    void navigator.clipboard.writeText(selected.content);
    setCopied(true);
    toast.success(file_content_copied());

    window.setTimeout(() => setCopied(false), 2000);
  }, [selected]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-16 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <ResizablePanel
        defaultSize={isDesktop ? "28%" : "25%"}
        minSize={isDesktop ? "20%" : "15%"}
        maxSize="40%"
        collapsible
        collapsedSize={5}
      >
        <FileTree
          tree={tree}
          selectedFile={selectedPath}
          onFileSelect={selectFile}
          component={component}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="72%" minSize="40%">
        {selected ? (
          <div className="flex h-full flex-col">
            <FileHeader
              file={selected}
              onCopy={handleCopy}
              copied={copied}
              canPreview={canPreview}
              isPreview={isPreview}
              onTogglePreview={() =>
                setPreviewOverride((prev) => !(prev ?? canPreview))
              }
            />
            <div className="flex-1 overflow-hidden bg-background/30 p-3">
              <ScrollArea className="h-full w-full">
                {canPreview && isPreview ? (
                  <MarkdownPreview
                    content={selected.content ?? ""}
                    className="min-h-full"
                  />
                ) : (
                  <ShikiViewer
                    code={selected.content ?? ""}
                    lang={selected.path.split(".").pop() ?? "txt"}
                    className="min-h-full"
                  />
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No files available.
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
