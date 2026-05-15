import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Add01Icon,
  Bookmark01Icon,
  Cancel01Icon,
  CodeIcon,
  Delete02Icon,
  Edit02Icon,
  Folder01Icon,
  GlobeIcon,
  Home01Icon,
  Link01Icon,
  PinIcon,
  Search01Icon,
  StarIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "@/components/ui/toast";

import { api, type BookmarkCategory } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { back, bookmark_count, bookmark_created, bookmark_deleted, bookmark_moved, bookmark_updated, bookmarks, bookmarks_workspace, bookmarks_workspace_desc, calendar_icon, cancel, category_deleted, category_name, category_renamed, collapse_sidebar, create, create_or_import, delete as delete_message, delete_bookmark, delete_bookmark_desc, delete_category, delete_category_desc, edit_bookmark, edit_bookmark_desc, edit_category, expand_sidebar, failed_to_create_bookmark, failed_to_create_category, failed_to_delete_bookmark, failed_to_delete_category, failed_to_import_bookmarks, failed_to_load_bookmarks, failed_to_move_bookmark, failed_to_rename_category, failed_to_reorder_bookmarks, failed_to_reorder_categories, failed_to_toggle_pin, failed_to_update_bookmark, import as import_message, import_bookmarks_desc, import_from_file, imported_bookmarks, loading as loading_label, name, new_bookmark, new_bookmark_desc, new_category, new_category_desc, no_bookmarks_desc, no_bookmarks_in_category, no_bookmarks_to_import, no_results_desc, no_results_found, pin_to_home, resize_bookmarks_sidebar, save, select_category_first, title as title_label, title_url_required, unpin, unsupported_bookmark_format, upload, url } from "@/paraglide/messages";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/bookmarks")({
  component: BookmarksPage,
});

type ImportedBookmark = {
  id: string;
  title: string;
  url: string;
  pinned: boolean;
  icon?: string;
};

type BookmarkDraft = {
  title: string;
  url: string;
  icon?: string;
};

function getBookmarkCategoryIcon(icon: string) {
  switch (icon) {
    case "globe":
      return GlobeIcon;
    case "code":
      return CodeIcon;
    case "star":
      return StarIcon;
    case "home":
      return Home01Icon;
    case "link":
      return Link01Icon;
    default:
      return Folder01Icon;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "bookmark-category";
}

function createImportId(prefix: string, ...parts: string[]) {
  const slug = slugify(parts.join("-"));
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${slug}-${suffix}`;
}

function dedupeCategoryId(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let index = 2;
  while (used.has(`${base}-${index}`)) {
    index += 1;
  }

  const next = `${base}-${index}`;
  used.add(next);
  return next;
}

function normalizeCategory(name: string, bookmarks: ImportedBookmark[], used: Set<string>) {
  const trimmedName = name.trim() || "Imported";
  return {
    id: dedupeCategoryId(createImportId("bookmark-category", trimmedName), used),
    name: trimmedName,
    icon: "folder",
    bookmarks,
  } satisfies BookmarkCategory;
}

function decodeHtmlText(value: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  return doc.documentElement.textContent?.trim() || "";
}

function parseBookmarkHtml(text: string) {
  const grouped = new Map<string, ImportedBookmark[]>();
  const used = new Set<string>();
  const folderStack: string[] = [];
  let pendingFolder: string | null = null;
  let bookmarkIndex = 0;

  const tokenPattern = /<DT><H3\b[^>]*>([\s\S]*?)<\/H3>|<DT><A\b[^>]*HREF\s*=\s*(["'])(.*?)\2[^>]*>([\s\S]*?)<\/A>|<DL><p>|<\/DL>/gi;

  for (const match of text.matchAll(tokenPattern)) {
    const [token, folderName, , urlValue, titleValue] = match;

    if (/^<DT><H3/i.test(token)) {
      pendingFolder = decodeHtmlText(folderName || "") || "Imported";
      continue;
    }

    if (/^<DL><p>$/i.test(token)) {
      if (pendingFolder) {
        folderStack.push(pendingFolder);
        pendingFolder = null;
      }
      continue;
    }

    if (/^<\/DL>$/i.test(token)) {
      pendingFolder = null;
      if (folderStack.length > 0) {
        folderStack.pop();
      }
      continue;
    }

    const url = decodeHtmlText(urlValue || "").trim();
    if (!url) {
      continue;
    }

    const title = decodeHtmlText(titleValue || "") || url;
    const categoryName = folderStack.length > 0 ? folderStack[folderStack.length - 1] : "Imported";
    const bookmarks = grouped.get(categoryName) ?? [];
    bookmarks.push({
      id: createImportId("bookmark", categoryName, String(bookmarkIndex), title),
      title,
      url,
      pinned: false,
    });
    grouped.set(categoryName, bookmarks);
    bookmarkIndex += 1;
  }

  const categories = Array.from(grouped.entries()).map(([name, bookmarks]) => normalizeCategory(name, bookmarks, used));

  if (categories.length > 0) {
    return categories;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const looseLinks = Array.from(doc.querySelectorAll("a[href]"));
  const bookmarks: ImportedBookmark[] = looseLinks
    .flatMap((link, index) => {
      const url = link.getAttribute("href")?.trim() ?? "";
      if (!url) {
        return [];
      }

        return [{
          id: createImportId("bookmark", "imported", String(index), link.textContent || "bookmark"),
          title: link.textContent?.trim() || url,
          url,
          pinned: false,
        }];
    });

  return bookmarks.length > 0 ? [normalizeCategory("Imported", bookmarks, used)] : [];
}

function parseBookmarkJson(text: string) {
  const data = JSON.parse(text) as unknown;
  const used = new Set<string>();

  if (Array.isArray(data)) {
    const bookmarks: ImportedBookmark[] = data
      .flatMap((item, index) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const record = item as Record<string, unknown>;
        const url = typeof record.url === "string" ? record.url.trim() : "";
        if (!url) {
          return [];
        }

        return [{
          id: createImportId("bookmark", "imported", String(index), String(record.title || record.name || url)),
          title: typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : url,
          url,
          pinned: false,
        }];
      });

    return bookmarks.length > 0 ? [normalizeCategory("Imported", bookmarks, used)] : [];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const categories: BookmarkCategory[] = [];

  for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const bookmarks: ImportedBookmark[] = value
      .flatMap((item, index) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const record = item as Record<string, unknown>;
        const url = typeof record.url === "string" ? record.url.trim() : "";
        if (!url) {
          return [];
        }

        return [{
          id: createImportId("bookmark", name, String(index), String(record.title || record.name || url)),
          title: typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : url,
          url,
          pinned: false,
        }];
      });

    if (bookmarks.length > 0) {
      categories.push(normalizeCategory(name, bookmarks, used));
    }
  }

  return categories;
}

function parseBookmarkCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .flatMap((line) => { const trimmed = line.trim(); return trimmed ? [trimmed] : []; });

  if (lines.length === 0) {
    return [];
  }

  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const used = new Set<string>();
  const header = rows[0].map((cell) => cell.toLowerCase());
  const categoryIndex = header.findIndex((cell) => cell === "category" || cell === "folder");
  const titleIndex = header.findIndex((cell) => cell === "title" || cell === "name");
  const urlIndex = header.findIndex((cell) => cell === "url" || cell === "link");
  const dataRows = urlIndex >= 0 ? rows.slice(1) : rows;
  const grouped = new Map<string, ImportedBookmark[]>();

  dataRows.forEach((row, index) => {
    const fallbackUrlIndex = urlIndex >= 0 ? urlIndex : row.length > 1 ? 1 : 0;
    const url = row[fallbackUrlIndex]?.trim() ?? "";
    if (!url || !/^https?:\/\//i.test(url)) {
      return;
    }

    const category = categoryIndex >= 0 ? row[categoryIndex]?.trim() || "Imported" : "Imported";
    const title = titleIndex >= 0 ? row[titleIndex]?.trim() || url : row[0]?.trim() || url;
    const existing = grouped.get(category) ?? [];
    existing.push({
      id: createImportId("bookmark", category, String(index), title),
      title,
      url,
      pinned: false,
    });
    grouped.set(category, existing);
  });

  return Array.from(grouped.entries()).map(([name, bookmarks]) => normalizeCategory(name, bookmarks, used));
}

function Favicon({ url, pinned, icon }: { url: string; pinned: boolean; icon?: string }) {
  const failedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  let domain: string | null = null;
  try { domain = new URL(url).hostname; } catch {}

  if (icon) {
    return (
      <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-accent">
        <img
          src={icon}
          alt=""
          className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        />
        {pinned && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <HugeiconsIcon icon={PinIcon} className="size-2.5" />
          </span>
        )}
      </div>
    );
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (failedRef.current || !domain) {
    return (
      <div ref={ref} className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
        pinned ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary",
      )}>
        <HugeiconsIcon icon={Bookmark01Icon} className="size-4" />
        {pinned && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <HugeiconsIcon icon={PinIcon} className="size-2.5" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-accent">
      {visible ? (
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt=""
          className="size-full outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          onError={() => {
            failedRef.current = true;
            setVisible(false);
          }}
        />
      ) : (
        <div className="size-full" />
      )}
      {pinned && (
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <HugeiconsIcon icon={PinIcon} className="size-2.5" />
        </span>
      )}
    </div>
  );
}

async function readBookmarkIcon(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Icon must be smaller than 2MB.");
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read icon."));
    };
    reader.onerror = () => reject(new Error("Failed to read icon."));
    reader.readAsDataURL(file);
  });
}

function BookmarkIconField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium text-foreground">{calendar_icon()}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 transition-colors hover:bg-muted"
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <HugeiconsIcon icon={Upload01Icon} className="size-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            {upload()}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              {delete_message()}
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            void readBookmarkIcon(file).then((nextIcon) => {
              onChange(nextIcon);
            }).catch((error) => {
              toast.error(error instanceof Error ? error.message : upload());
            }).finally(() => {
              event.target.value = "";
            });
          }}
        />
      </div>
    </div>
  );
}

const BookmarkCard = memo(function BookmarkCard({
  bookmark,
  categoryId,
  onTogglePin,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDropReorder,
}: {
  bookmark: BookmarkCategory["bookmarks"][number];
  categoryId: string;
  onTogglePin: (categoryId: string, bookmarkId: string, currentPinned: boolean) => void;
  onEdit: (bookmarkId: string, title: string, url: string, icon?: string) => void;
  onDelete: (bookmarkId: string) => void;
  onDragStart: (bookmarkId: string, sourceCategoryId: string) => void;
  onDragEnd: () => void;
  onDropReorder: (targetBookmarkId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(bookmark.id, categoryId)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropReorder(bookmark.id)}
      className={cn(
        "group h-[108px] rounded-2xl bg-card p-5 transition-[background-color,scale,box-shadow] duration-200 ease-out hover:bg-accent/30 active:scale-[0.96] [contain-intrinsic-size:108px] [content-visibility:auto]",
        !bookmark.pinned && "ring-1 ring-black/[0.06] shadow-sm hover:ring-black/[0.08] dark:ring-white/[0.08] dark:hover:ring-white/[0.13]",
        bookmark.pinned && "border border-primary/30 bg-primary/[0.02] shadow-sm",
      )}
    >
      <div className="relative flex items-start gap-3">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "flex min-w-0 flex-1 items-start gap-3",
            !bookmark.pinned && "group-hover:pr-[86px]",
          )}
        >
          <Favicon url={bookmark.url} pinned={bookmark.pinned} icon={bookmark.icon} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-medium text-foreground">{bookmark.title}</h2>
            <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-muted-foreground">
              {bookmark.url}
            </p>
          </div>
        </a>
        <div className={cn(
          "flex items-center gap-1 transition-opacity",
          bookmark.pinned
            ? "shrink-0 opacity-100"
            : "absolute right-0 top-0 opacity-0 group-hover:opacity-100",
        )}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onTogglePin(categoryId, bookmark.id, bookmark.pinned)}
            className={cn(bookmark.pinned && "text-primary")}
            title={bookmark.pinned ? unpin() : pin_to_home()}
          >
            <HugeiconsIcon icon={PinIcon} className={cn("size-3.5", bookmark.pinned && "fill-primary")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(bookmark.id, bookmark.title, bookmark.url, bookmark.icon)}
            title={edit_bookmark()}
          >
            <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(bookmark.id)}
            className="hover:text-destructive"
            title={delete_bookmark()}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.categoryId === next.categoryId
  && prev.bookmark.id === next.bookmark.id
  && prev.bookmark.title === next.bookmark.title
  && prev.bookmark.url === next.bookmark.url
  && prev.bookmark.pinned === next.bookmark.pinned
  && prev.bookmark.icon === next.bookmark.icon,
);

function BookmarksPage() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [renameCategoryId, setRenameCategoryId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [draggedBookmark, setDraggedBookmark] = useState<{ bookmarkId: string; sourceCategoryId: string } | null>(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<string | null>(null);
  const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft>({ title: "", url: "", icon: undefined });
  const [loading, setLoading] = useState(true);
  const [isCreateBookmarkDialogOpen, setIsCreateBookmarkDialogOpen] = useState(false);
  const [isCreateOrImportDialogOpen, setIsCreateOrImportDialogOpen] = useState(false);
  const [createOrImportStep, setCreateOrImportStep] = useState<"choose" | "create" | "import">("choose");
  const [createCategoryName, setCreateCategoryName] = useState("");
  const { searchQuery } = useDashboard();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    void loadBookmarks();
  }, []);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [sidebarCollapsed]);

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
  }, []);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 420);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, []);


  function handleImportBookmarksClick() {
    fileInputRef.current?.click();
  }

  async function loadBookmarks() {
    setLoading(true);
    try {
      const nextCategories = await api.listBookmarks();
      setCategories(nextCategories);
      setSelectedCategoryId((current) => current ?? nextCategories[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failed_to_load_bookmarks());
    } finally {
      setLoading(false);
    }
  }

  async function persistCategories(nextCategories: BookmarkCategory[], nextSelectedCategoryId?: string | null) {
    const saved = await api.replaceBookmarks(nextCategories);
    setCategories(saved);
    setSelectedCategoryId(nextSelectedCategoryId ?? saved[0]?.id ?? null);
    return saved;
  }

  function handleCreateCategory() {
    setCreateCategoryName("");
    setCreateOrImportStep("choose");
    setIsCreateOrImportDialogOpen(true);
  }

  function handleSelectCategoryCreate() {
    setCreateOrImportStep("create");
  }

  function handleSelectImport() {
    setCreateOrImportStep("import");
  }

  function handleCreateCategorySubmit() {
    const name = createCategoryName.trim() || `${new_category()} ${categories.length + 1}`;
    const newCategory: BookmarkCategory = {
      id: `custom-${Date.now()}`,
      name,
      icon: "folder",
      bookmarks: [],
    };

    const nextCategories = [...categories, newCategory];
    void persistCategories(nextCategories, newCategory.id).catch((error) => {
      toast.error(error instanceof Error ? error.message : failed_to_create_category());
    });
    setIsCreateOrImportDialogOpen(false);
  }

  function moveCategory(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    const sourceIndex = categories.findIndex((category) => category.id === sourceId);
    const targetIndex = categories.findIndex((category) => category.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const next = [...categories];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persistCategories(next, selectedCategoryId).catch((error) => {
      toast.error(error instanceof Error ? error.message : failed_to_reorder_categories());
    });
  }

  function reorderBookmarkWithinCategory(bookmarkId: string, targetBookmarkId: string) {
    if (!selectedCategory || bookmarkId === targetBookmarkId) {
      return;
    }

    const sourceIndex = selectedCategory.bookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);
    const targetIndex = selectedCategory.bookmarks.findIndex((bookmark) => bookmark.id === targetBookmarkId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextBookmarks = [...selectedCategory.bookmarks];
    const [moved] = nextBookmarks.splice(sourceIndex, 1);
    nextBookmarks.splice(targetIndex, 0, moved);
    const nextCategories = categories.map((category) =>
      category.id === selectedCategory.id ? { ...category, bookmarks: nextBookmarks } : category,
    );

    void persistCategories(nextCategories, selectedCategory.id).catch((error) => {
      toast.error(error instanceof Error ? error.message : failed_to_reorder_bookmarks());
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      let parsed: BookmarkCategory[] = [];

      if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
        parsed = parseBookmarkHtml(text);
      } else if (lowerName.endsWith(".json")) {
        parsed = parseBookmarkJson(text);
      } else if (lowerName.endsWith(".csv")) {
        parsed = parseBookmarkCsv(text);
      } else {
        throw new Error(unsupported_bookmark_format());
      }

      if (parsed.length === 0) {
        throw new Error(no_bookmarks_to_import());
      }

      await persistCategories(parsed, parsed[0]?.id ?? null);
      toast.success(imported_bookmarks({
        count: parsed.reduce((count, category) => count + category.bookmarks.length, 0),
      }));
      setIsCreateOrImportDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failed_to_import_bookmarks());
    }

    event.target.value = "";
  }

  const handleTogglePin = useCallback(async (categoryId: string, bookmarkId: string, currentPinned: boolean) => {
    try {
      const saved = await api.updateBookmarkItem(categoryId, bookmarkId, { pinned: !currentPinned });
      setCategories(saved);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error(error instanceof Error ? error.message : failed_to_toggle_pin());
    }
  }, []);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null;
  const editingBookmark = selectedCategory?.bookmarks.find((bookmark) => bookmark.id === editingBookmarkId) ?? null;
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredBookmarks = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    if (!normalizedSearchQuery) {
      return selectedCategory.bookmarks;
    }

    return selectedCategory.bookmarks.filter((bookmark) =>
      bookmark.title.toLowerCase().includes(normalizedSearchQuery)
      || bookmark.url.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [normalizedSearchQuery, selectedCategory]);

  const handleEditBookmark = useCallback((bookmarkId: string, title: string, url: string, icon?: string) => {
    setEditingBookmarkId(bookmarkId);
    setBookmarkDraft({ title, url, icon });
  }, []);

  const handleDeleteBookmark = useCallback((bookmarkId: string) => {
    setDeletingBookmarkId(bookmarkId);
  }, []);

  const handleBookmarkDragStart = useCallback((bookmarkId: string, sourceCategoryId: string) => {
    setDraggedBookmark({ bookmarkId, sourceCategoryId });
  }, []);

  const handleBookmarkDragEnd = useCallback(() => {
    setDraggedBookmark(null);
  }, []);

  const handleBookmarkDropReorder = useCallback((targetBookmarkId: string) => {
    if (!draggedBookmark || !selectedCategory) {
      return;
    }

    if (draggedBookmark.sourceCategoryId !== selectedCategory.id) {
      return;
    }

    reorderBookmarkWithinCategory(draggedBookmark.bookmarkId, targetBookmarkId);
    setDraggedBookmark(null);
  }, [draggedBookmark, selectedCategory]);

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.json,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        ref={sidebarRef}
        className={cn(
          "relative hidden min-h-0 shrink-0 flex-col bg-card transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-[var(--bookmarks-sidebar-width)] overflow-visible border-r",
          isResizingSidebar ? "border-r-transparent" : "border-border",
        )}
        style={
          sidebarCollapsed
            ? undefined
            : ({ "--bookmarks-sidebar-width": `${Math.min(sidebarWidth, 380)}px` } as CSSProperties)
        }
      >
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <div className="flex h-10 items-center justify-between rounded-md px-2">
            <div className="text-sm font-semibold text-foreground">{bookmarks()}</div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <Button
                      {...props}
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleCreateCategory}
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    </Button>
                  )}
                />
                <TooltipContent side="bottom">{new_category()}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <Button
                      {...props}
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="active:-translate-y-0"
                      onClick={handleCollapseSidebar}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                    </Button>
                  )}
                />
                <TooltipContent side="bottom">{collapse_sidebar()}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-3">
              {categories.length > 0 ? (
                <div className="space-y-1">
                    {categories.map((category) => {
                      const isActive = category.id === selectedCategory?.id;
                      const CategoryIcon = getBookmarkCategoryIcon(category.icon);

                      return (
                        <div
                          key={category.id}
                          draggable
                          onDragStart={() => setDraggedCategoryId(category.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedCategoryId) {
                              moveCategory(draggedCategoryId, category.id);
                              setDraggedCategoryId(null);
                              return;
                            }
                            if (draggedBookmark && draggedBookmark.sourceCategoryId !== category.id) {
                              void api.moveBookmarkItem(
                                draggedBookmark.bookmarkId,
                                draggedBookmark.sourceCategoryId,
                                category.id,
                              ).then((saved) => {
                                setCategories(saved);
                                setSelectedCategoryId(category.id);
                                setDraggedBookmark(null);
                                toast.success(bookmark_moved());
                              }).catch((error) => {
                                toast.error(error instanceof Error ? error.message : failed_to_move_bookmark());
                              });
                            }
                          }}
                          onDragEnd={() => setDraggedCategoryId(null)}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                            isActive ? "bg-accent" : "hover:bg-accent/40",
                            draggedCategoryId === category.id && "opacity-60",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryId(category.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <HugeiconsIcon icon={CategoryIcon} className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{category.name}</span>
                          </button>
                          <div className="relative ml-auto h-6 w-[76px] shrink-0">
                            <div className="absolute inset-0 flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Tooltip>
                                <TooltipTrigger
                                  render={(props) => (
                                    <Button
                                      {...props}
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => setRenameCategoryId(category.id)}
                                    >
                                      <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                                    </Button>
                                  )}
                                />
                                <TooltipContent side="top">{edit_category()}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger
                                  render={(props) => (
                                    <Button
                                      {...props}
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => setDeleteCategoryId(category.id)}
                                      className="hover:text-destructive"
                                    >
                                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                                    </Button>
                                  )}
                                />
                                <TooltipContent side="top">{delete_category()}</TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="absolute inset-y-0 right-0 flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground transition-opacity group-hover:opacity-0">
                              {category.bookmarks.length}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
            </div>
          </ScrollArea>

        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={resize_bookmarks_sidebar()}
          onPointerDown={handleResizeStart}
          className={cn(
            "group absolute right-[-8px] top-0 z-20 h-full w-4 cursor-col-resize",
            sidebarCollapsed && "hidden",
            isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
              isResizingSidebar && "border-border bg-muted shadow-md",
            )}
          >
            <div
              className={cn(
                "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                isResizingSidebar && "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {sidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <Button
                  {...props}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
                  onClick={handleExpandSidebar}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </Button>
              )}
            />
            <TooltipContent side="right">{expand_sidebar()}</TooltipContent>
          </Tooltip>
        ) : null}

        <ScrollArea className="h-full">
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <AsciiLoading label={loading_label()} />
              </div>
            ) : selectedCategory ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="flex items-center gap-2 truncate text-2xl font-semibold text-foreground">
                      <HugeiconsIcon
                        icon={getBookmarkCategoryIcon(selectedCategory.icon)}
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{selectedCategory.name}</span>
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                      {bookmark_count({ count: selectedCategory.bookmarks.length })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setBookmarkDraft({ title: "", url: "", icon: undefined });
                        setIsCreateBookmarkDialogOpen(true);
                      }}
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      {new_bookmark()}
                    </Button>

                  </div>
                </div>

                <section className={cn("flex-1", filteredBookmarks.length > 0 ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex items-center justify-center")}>
                  {filteredBookmarks.length > 0 ? (
                    filteredBookmarks.map((bookmark) => (
                      <BookmarkCard
                        key={bookmark.id}
                        bookmark={bookmark}
                        categoryId={selectedCategory.id}
                        onTogglePin={handleTogglePin}
                        onEdit={handleEditBookmark}
                        onDelete={handleDeleteBookmark}
                        onDragStart={handleBookmarkDragStart}
                        onDragEnd={handleBookmarkDragEnd}
                        onDropReorder={handleBookmarkDropReorder}
                      />
                    ))
                  ) : (
                    <div className="flex justify-center md:col-span-2 xl:col-span-3">
                      <EmptyState
                        variant="subtle"
                        size="lg"
                        title={searchQuery.trim() ? no_results_found() : no_bookmarks_in_category()}
                        description={searchQuery.trim() ? no_results_desc() : no_bookmarks_desc()}
                        icons={[
                          <HugeiconsIcon key="s1" icon={Search01Icon} className="size-6" />,
                          <HugeiconsIcon key="s2" icon={Bookmark01Icon} className="size-6" />,
                          <HugeiconsIcon key="s3" icon={Folder01Icon} className="size-6" />,
                        ]}
                        action={searchQuery.trim() ? undefined : {
                          label: new_bookmark(),
                          icon: <HugeiconsIcon icon={Add01Icon} className="size-4" />,
                          onClick: () => {
                            setBookmarkDraft({ title: "", url: "", icon: undefined });
                            setIsCreateBookmarkDialogOpen(true);
                          },
                        }}
                        className="w-full max-w-lg"
                      />
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  variant="subtle"
                  size="lg"
                  title={bookmarks_workspace()}
                  description={bookmarks_workspace_desc()}
                  icons={[
                    <HugeiconsIcon key="b1" icon={Bookmark01Icon} className="size-6" />,
                    <HugeiconsIcon key="b2" icon={Folder01Icon} className="size-6" />,
                    <HugeiconsIcon key="b3" icon={Upload01Icon} className="size-6" />,
                  ]}
                  action={{
                    label: import_from_file(),
                    icon: <HugeiconsIcon icon={Upload01Icon} className="size-4" />,
                    onClick: handleCreateCategory,
                  }}
                  className="w-full max-w-lg"
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <RenameDialog
        open={renameCategoryId !== null}
        title={edit_category()}
        initialValue={categories.find((category) => category.id === renameCategoryId)?.name ?? ""}
        placeholder={category_name()}
        onClose={() => setRenameCategoryId(null)}
        onSubmit={(name) => {
          const category = categories.find((item) => item.id === renameCategoryId);
          if (!category) {
            return;
          }

          void api.updateBookmarkCategory(category.id, { name }).then((saved) => {
            setCategories(saved);
            setSelectedCategoryId((current) => current ?? saved[0]?.id ?? null);
            setRenameCategoryId(null);
            toast.success(category_renamed());
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : failed_to_rename_category());
          });
        }}
      />

      <AppDialog
        open={isCreateBookmarkDialogOpen}
        onOpenChange={setIsCreateBookmarkDialogOpen}
        title={new_bookmark()}
        description={new_bookmark_desc()}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsCreateBookmarkDialogOpen(false)}>
              {cancel()}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedCategoryId) {
                  toast.error(select_category_first());
                  return;
                }

                if (!bookmarkDraft.title.trim() || !bookmarkDraft.url.trim()) {
                  toast.error(title_url_required());
                  return;
                }

                void api.createBookmarkItem(selectedCategoryId, {
                  title: bookmarkDraft.title.trim(),
                  url: bookmarkDraft.url.trim(),
                  icon: bookmarkDraft.icon,
                }).then((saved) => {
                  setCategories(saved);
                  setSelectedCategoryId(selectedCategoryId);
                  setBookmarkDraft({ title: "", url: "", icon: undefined });
                  setIsCreateBookmarkDialogOpen(false);
                  toast.success(bookmark_created());
                }).catch((error) => {
                  toast.error(error instanceof Error ? error.message : failed_to_create_bookmark());
                });
              }}
            >
              {create()}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <BookmarkIconField
            value={bookmarkDraft.icon}
            onChange={(icon) => setBookmarkDraft((current) => ({ ...current, icon }))}
          />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{title_label()}</span>
            <input
              value={bookmarkDraft.title}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{url()}</span>
            <input
              value={bookmarkDraft.url}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, url: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deletingBookmarkId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingBookmarkId(null);
          }
        }}
        title={delete_bookmark()}
        description={delete_bookmark_desc()}
        confirmLabel={delete_message()}
        variant="destructive"
        onConfirm={() => {
          if (!selectedCategoryId || !deletingBookmarkId) {
            return;
          }

          void api.deleteBookmarkItem(selectedCategoryId, deletingBookmarkId).then((saved) => {
            setCategories(saved);
            setSelectedCategoryId((current) => current ?? saved[0]?.id ?? null);
            setDeletingBookmarkId(null);
            toast.success(bookmark_deleted());
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : failed_to_delete_bookmark());
          });
        }}
      />

      <AppDialog
        open={editingBookmarkId !== null && editingBookmark !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBookmarkId(null);
          }
        }}
        title={edit_bookmark()}
        description={edit_bookmark_desc()}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditingBookmarkId(null)}>
              {cancel()}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editingBookmarkId || !selectedCategoryId) {
                  return;
                }

                if (!bookmarkDraft.title.trim() || !bookmarkDraft.url.trim()) {
                  toast.error(title_url_required());
                  return;
                }

                void api.updateBookmarkItem(selectedCategoryId, editingBookmarkId, {
                  title: bookmarkDraft.title.trim(),
                  url: bookmarkDraft.url.trim(),
                  icon: bookmarkDraft.icon ?? null,
                }).then((saved) => {
                  setCategories(saved);
                  setSelectedCategoryId((current) => current ?? saved[0]?.id ?? null);
                  setEditingBookmarkId(null);
                  toast.success(bookmark_updated());
                }).catch((error) => {
                  toast.error(error instanceof Error ? error.message : failed_to_update_bookmark());
                });
              }}
            >
              {save()}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <BookmarkIconField
            value={bookmarkDraft.icon}
            onChange={(icon) => setBookmarkDraft((current) => ({ ...current, icon }))}
          />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{title_label()}</span>
            <input
              value={bookmarkDraft.title}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{url()}</span>
            <input
              value={bookmarkDraft.url}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, url: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deleteCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCategoryId(null);
          }
        }}
        title={delete_category()}
        description={delete_category_desc()}
        confirmLabel={delete_message()}
        variant="destructive"
        onConfirm={() => {
          if (!deleteCategoryId) {
            return;
          }

          void api.deleteBookmarkCategory(deleteCategoryId).then((saved) => {
            setCategories(saved);
            if (selectedCategoryId === deleteCategoryId) {
              setSelectedCategoryId(saved[0]?.id ?? null);
            }
            setDeleteCategoryId(null);
            toast.success(category_deleted());
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : failed_to_delete_category());
          });
        }}
      />

      <AppDialog
        open={isCreateOrImportDialogOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOrImportStep("choose");
          setIsCreateOrImportDialogOpen(open);
        }}
        title={createOrImportStep === "choose" ? create_or_import() : createOrImportStep === "create" ? new_category() : import_from_file()}
        size="sm"
        bodyClassName={createOrImportStep === "choose" ? "flex items-center" : undefined}
        footer={
          createOrImportStep === "choose" ? (
            <Button type="button" variant="outline" onClick={() => setIsCreateOrImportDialogOpen(false)}>
              {cancel()}
            </Button>
          ) : createOrImportStep === "create" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setCreateOrImportStep("choose")}>
                {back()}
              </Button>
              <Button type="button" onClick={handleCreateCategorySubmit}>
                {create()}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setCreateOrImportStep("choose")}>
                {back()}
              </Button>
              <Button type="button" onClick={handleImportBookmarksClick}>
                {import_message()}
              </Button>
            </>
          )
        }
      >
        {createOrImportStep === "choose" ? (
          <div className="grid w-full gap-3">
            <button
              type="button"
              onClick={handleSelectCategoryCreate}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Folder01Icon} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{new_category()}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {new_category_desc()}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={handleSelectImport}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Upload01Icon} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{import_from_file()}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {import_bookmarks_desc()}
                </div>
              </div>
            </button>
          </div>
        ) : createOrImportStep === "create" ? (
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{name()}</span>
            <input
              value={createCategoryName}
              onChange={(event) => setCreateCategoryName(event.target.value)}
              placeholder={category_name()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCategorySubmit();
                }
              }}

            />
          </label>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={Upload01Icon} className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {import_bookmarks_desc()}
            </p>
          </div>
        )}
      </AppDialog>
    </div>
  );
}
