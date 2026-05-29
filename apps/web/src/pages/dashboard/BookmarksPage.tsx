import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Add01Icon,
  AiMagicIcon,
  Bookmark01Icon,
  Briefcase01Icon,
  Cancel01Icon,
  ChartIcon,
  CloudIcon,
  CodeIcon,
  CogIcon,
  CreditCardIcon,
  CrownIcon,
  DatabaseIcon,
  Delete02Icon,
  EarthIcon,
  Edit02Icon,
  Folder01Icon,
  GameIcon,
  GiftIcon,
  GlobeIcon,
  Home01Icon,
  Idea01Icon,
  Image01Icon,
  Key01Icon,
  LaptopIcon,
  Link01Icon,
  LockIcon,
  MusicNote01Icon,
  PinIcon,
  RocketIcon,
  SchoolIcon,
  Search01Icon,
  StarIcon,
  Undo02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { api, type BookmarkCategory } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  RenameDialog,
  type IconOption,
} from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  back,
  bookmark_ai_failed,
  bookmark_ai_organize,
  bookmark_ai_organizing,
  bookmark_ai_undo,
  bookmark_count,
  bookmarks,
  bookmarks_workspace,
  bookmarks_workspace_desc,
  calendar_icon,
  cancel,
  category_name,
  collapse_sidebar,
  create,
  create_or_import,
  delete as delete_message,
  delete_bookmark,
  delete_bookmark_desc,
  delete_category,
  delete_category_desc,
  edit_bookmark,
  edit_bookmark_desc,
  edit_category,
  expand_sidebar,
  import as import_message,
  import_bookmarks_desc,
  import_from_file,
  name,
  new_bookmark,
  new_bookmark_desc,
  new_category,
  new_category_desc,
  no_bookmarks_desc,
  no_bookmarks_in_category,
  no_bookmarks_to_import,
  no_results_desc,
  no_results_found,
  pin_to_home,
  resize_bookmarks_sidebar,
  save,
  title as title_label,
  unpin,
  unsupported_bookmark_format,
  upload,
  url,
} from "@/paraglide/messages";
import { useBreakpoint } from "@/lib/hooks/use-media-query";
import { useUIStore } from "@/lib/store";
import { BookmarkFavicon } from "@/components/ui/bookmark-favicon";

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

const categoryIconOptions: IconOption[] = [
  { value: "folder", icon: Folder01Icon },
  { value: "globe", icon: GlobeIcon },
  { value: "code", icon: CodeIcon },
  { value: "star", icon: StarIcon },
  { value: "home", icon: Home01Icon },
  { value: "link", icon: Link01Icon },
  { value: "briefcase", icon: Briefcase01Icon },
  { value: "chart", icon: ChartIcon },
  { value: "cloud", icon: CloudIcon },
  { value: "cog", icon: CogIcon },
  { value: "credit-card", icon: CreditCardIcon },
  { value: "crown", icon: CrownIcon },
  { value: "database", icon: DatabaseIcon },
  { value: "earth", icon: EarthIcon },
  { value: "game", icon: GameIcon },
  { value: "gift", icon: GiftIcon },
  { value: "image", icon: Image01Icon },
  { value: "idea", icon: Idea01Icon },
  { value: "key", icon: Key01Icon },
  { value: "laptop", icon: LaptopIcon },
  { value: "lock", icon: LockIcon },
  { value: "music", icon: MusicNote01Icon },
  { value: "rocket", icon: RocketIcon },
  { value: "school", icon: SchoolIcon },
];

function getBookmarkCategoryIcon(icon: string) {
  const option = categoryIconOptions.find((o) => o.value === icon);
  if (option) return option.icon;
  return Folder01Icon;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "bookmark-category"
  );
}

function createImportId(prefix: string, ...parts: string[]) {
  const slug = slugify(parts.join("-"));
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
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

function normalizeCategory(
  name: string,
  bookmarks: ImportedBookmark[],
  used: Set<string>,
) {
  const trimmedName = name.trim() || "Imported";
  return {
    id: dedupeCategoryId(
      createImportId("bookmark-category", trimmedName),
      used,
    ),
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

  const tokenPattern =
    /<DT><H3\b[^>]*>([\s\S]*?)<\/H3>|<DT><A\b[^>]*HREF\s*=\s*(["'])(.*?)\2[^>]*>([\s\S]*?)<\/A>|<DL><p>|<\/DL>/gi;

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
    const categoryName =
      folderStack.length > 0 ? folderStack[folderStack.length - 1] : "Imported";
    const bookmarks = grouped.get(categoryName) ?? [];
    bookmarks.push({
      id: createImportId(
        "bookmark",
        categoryName,
        String(bookmarkIndex),
        title,
      ),
      title,
      url,
      pinned: false,
    });
    grouped.set(categoryName, bookmarks);
    bookmarkIndex += 1;
  }

  const categories = Array.from(grouped.entries()).map(([name, bookmarks]) =>
    normalizeCategory(name, bookmarks, used),
  );

  if (categories.length > 0) {
    return categories;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const looseLinks = Array.from(doc.querySelectorAll("a[href]"));
  const bookmarks: ImportedBookmark[] = looseLinks.flatMap((link, index) => {
    const url = link.getAttribute("href")?.trim() ?? "";
    if (!url) {
      return [];
    }

    return [
      {
        id: createImportId(
          "bookmark",
          "imported",
          String(index),
          link.textContent || "bookmark",
        ),
        title: link.textContent?.trim() || url,
        url,
        pinned: false,
      },
    ];
  });

  return bookmarks.length > 0
    ? [normalizeCategory("Imported", bookmarks, used)]
    : [];
}

function parseBookmarkJson(text: string) {
  const data = JSON.parse(text) as unknown;
  const used = new Set<string>();

  if (Array.isArray(data)) {
    const bookmarks: ImportedBookmark[] = data.flatMap((item, index) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url.trim() : "";
      if (!url) {
        return [];
      }

      return [
        {
          id: createImportId(
            "bookmark",
            "imported",
            String(index),
            String(record.title || record.name || url),
          ),
          title:
            typeof record.title === "string"
              ? record.title
              : typeof record.name === "string"
                ? record.name
                : url,
          url,
          pinned: false,
        },
      ];
    });

    return bookmarks.length > 0
      ? [normalizeCategory("Imported", bookmarks, used)]
      : [];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const categories: BookmarkCategory[] = [];

  for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const bookmarks: ImportedBookmark[] = value.flatMap((item, index) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url.trim() : "";
      if (!url) {
        return [];
      }

      return [
        {
          id: createImportId(
            "bookmark",
            name,
            String(index),
            String(record.title || record.name || url),
          ),
          title:
            typeof record.title === "string"
              ? record.title
              : typeof record.name === "string"
                ? record.name
                : url,
          url,
          pinned: false,
        },
      ];
    });

    if (bookmarks.length > 0) {
      categories.push(normalizeCategory(name, bookmarks, used));
    }
  }

  return categories;
}

function parseBookmarkCsv(text: string) {
  const lines = text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    return trimmed ? [trimmed] : [];
  });

  if (lines.length === 0) {
    return [];
  }

  const rows = lines.map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
  );
  const used = new Set<string>();
  const header = rows[0].map((cell) => cell.toLowerCase());
  const categoryIndex = header.findIndex(
    (cell) => cell === "category" || cell === "folder",
  );
  const titleIndex = header.findIndex(
    (cell) => cell === "title" || cell === "name",
  );
  const urlIndex = header.findIndex(
    (cell) => cell === "url" || cell === "link",
  );
  const dataRows = urlIndex >= 0 ? rows.slice(1) : rows;
  const grouped = new Map<string, ImportedBookmark[]>();

  dataRows.forEach((row, index) => {
    const fallbackUrlIndex = urlIndex >= 0 ? urlIndex : row.length > 1 ? 1 : 0;
    const url = row[fallbackUrlIndex]?.trim() ?? "";
    if (!url || !/^https?:\/\//i.test(url)) {
      return;
    }

    const category =
      categoryIndex >= 0
        ? row[categoryIndex]?.trim() || "Imported"
        : "Imported";
    const title =
      titleIndex >= 0 ? row[titleIndex]?.trim() || url : row[0]?.trim() || url;
    const existing = grouped.get(category) ?? [];
    existing.push({
      id: createImportId("bookmark", category, String(index), title),
      title,
      url,
      pinned: false,
    });
    grouped.set(category, existing);
  });

  return Array.from(grouped.entries()).map(([name, bookmarks]) =>
    normalizeCategory(name, bookmarks, used),
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
            <img
              src={value}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <HugeiconsIcon
              icon={Upload01Icon}
              className="size-5 text-muted-foreground"
            />
          )}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            {upload()}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
            >
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

            void readBookmarkIcon(file)
              .then((nextIcon) => {
                onChange(nextIcon);
              })
              .catch((error) => {
                console.error(error);
              })
              .finally(() => {
                event.target.value = "";
              });
          }}
        />
      </div>
    </div>
  );
}

const BookmarkCard = memo(
  function BookmarkCard({
    bookmark,
    categoryId,
    pinPending,
    onTogglePin,
    onEdit,
    onDelete,
    onDragStart,
    onDragEnd,
    onDropReorder,
  }: {
    bookmark: BookmarkCategory["bookmarks"][number];
    categoryId: string;
    pinPending: boolean;
    onTogglePin: (
      categoryId: string,
      bookmarkId: string,
      currentPinned: boolean,
    ) => void;
    onEdit: (
      bookmarkId: string,
      title: string,
      url: string,
      icon?: string,
    ) => void;
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
          "group h-[108px] rounded-2xl bg-card p-4 transition-[background-color,scale,box-shadow] duration-200 ease-out hover:bg-accent/30 active:scale-[0.96] [contain-intrinsic-size:108px] [content-visibility:auto]",
          !bookmark.pinned &&
            "ring-1 ring-black/[0.06] hover:ring-black/[0.08] dark:ring-white/[0.08] dark:hover:ring-white/[0.13]",
          bookmark.pinned && "border border-primary/30 bg-primary/[0.02]",
        )}
      >
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          className="flex h-full min-w-0 items-start gap-2"
        >
          <BookmarkFavicon
            url={bookmark.url}
            pinned={bookmark.pinned}
            icon={bookmark.icon}
            bookmarkId={bookmark.id}
            categoryId={categoryId}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top section: title row + inline action buttons */}
            <div className="flex min-w-0 items-start gap-1">
              <h2 className="min-w-0 flex-1 line-clamp-2 break-all text-sm font-medium text-foreground">
                {bookmark.title}
              </h2>
              <div
                className={cn(
                  "hidden shrink-0 items-center gap-0.5 rounded-lg bg-card/95 p-0.5 shadow-sm",
                  "group-hover:inline-flex",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  disabled={pinPending}
                  onClick={(e) => {
                    e.preventDefault();
                    onTogglePin(categoryId, bookmark.id, bookmark.pinned);
                  }}
                  className={cn(
                    bookmark.pinned && "text-primary",
                    pinPending && "opacity-70",
                  )}
                  title={bookmark.pinned ? unpin() : pin_to_home()}
                >
                  <HugeiconsIcon
                    icon={PinIcon}
                    className={cn(
                      "size-3.5",
                      bookmark.pinned && "fill-primary",
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(
                      bookmark.id,
                      bookmark.title,
                      bookmark.url,
                      bookmark.icon,
                    );
                  }}
                  title={edit_bookmark()}
                >
                  <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(bookmark.id);
                  }}
                  className="hover:text-destructive"
                  title={delete_bookmark()}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                </Button>
              </div>
            </div>
            {/* Bottom section: URL — completely independent of hover */}
            <p className="mt-0.5 line-clamp-2 break-all text-xs leading-5 text-muted-foreground">
              {bookmark.url}
            </p>
          </div>
        </a>
      </div>
    );
  },
  (prev, next) =>
    prev.categoryId === next.categoryId &&
    prev.bookmark.id === next.bookmark.id &&
    prev.bookmark.title === next.bookmark.title &&
    prev.bookmark.url === next.bookmark.url &&
    prev.bookmark.pinned === next.bookmark.pinned &&
    prev.bookmark.icon === next.bookmark.icon &&
    prev.pinPending === next.pinPending,
);

function updateBookmarkPinnedState(
  categories: BookmarkCategory[],
  categoryId: string,
  bookmarkId: string,
  pinned: boolean,
) {
  return categories.map((category) =>
    category.id === categoryId
      ? {
          ...category,
          bookmarks: category.bookmarks.map((bookmark) =>
            bookmark.id === bookmarkId ? { ...bookmark, pinned } : bookmark,
          ),
        }
      : category,
  );
}

function cloneBookmarkCategories(categories: BookmarkCategory[]) {
  return categories.map((category) => ({
    ...category,
    bookmarks: category.bookmarks.map((bookmark) => ({ ...bookmark })),
  }));
}

export function BookmarksPage() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const selectedCategoryId = useUIStore((s) => s.selectedBookmarkCategoryId);
  const setSelectedCategoryId = useUIStore(
    (s) => s.setSelectedBookmarkCategoryId,
  );
  const [renameCategoryId, setRenameCategoryId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
    null,
  );
  const [draggedBookmark, setDraggedBookmark] = useState<{
    bookmarkId: string;
    sourceCategoryId: string;
  } | null>(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null,
  );
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<string | null>(
    null,
  );
  const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft>({
    title: "",
    url: "",
    icon: undefined,
  });
  const [, setLoading] = useState(true);
  const [pendingPinBookmarkIds, setPendingPinBookmarkIds] = useState<string[]>(
    [],
  );
  const [aiOrganizing, setAiOrganizing] = useState(false);
  const [aiOrganizeUndo, setAiOrganizeUndo] = useState<{
    categories: BookmarkCategory[];
    selectedCategoryId: string | null;
  } | null>(null);
  const [aiOrganizeError, setAiOrganizeError] = useState(false);
  const [isCreateBookmarkDialogOpen, setIsCreateBookmarkDialogOpen] =
    useState(false);
  const [isCreateOrImportDialogOpen, setIsCreateOrImportDialogOpen] =
    useState(false);
  const [createOrImportStep, setCreateOrImportStep] = useState<
    "choose" | "create" | "import"
  >("choose");
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

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;

      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(
          Math.max(moveEvent.clientX - sidebarLeft, 200),
          420,
        );
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
    },
    [],
  );

  function handleImportBookmarksClick() {
    fileInputRef.current?.click();
  }

  async function loadBookmarks() {
    setLoading(true);
    try {
      const nextCategories = await api.listBookmarks();
      setCategories(nextCategories);
      setSelectedCategoryId(
        (current) =>
          nextCategories.some((category) => category.id === current)
            ? current
            : (nextCategories[0]?.id ?? null),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function persistCategories(
    nextCategories: BookmarkCategory[],
    nextSelectedCategoryId?: string | null,
  ) {
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
    const name =
      createCategoryName.trim() || `${new_category()} ${categories.length + 1}`;
    const newCategory: BookmarkCategory = {
      id: `custom-${Date.now()}`,
      name,
      icon: "folder",
      bookmarks: [],
    };

    const nextCategories = [...categories, newCategory];
    void persistCategories(nextCategories, newCategory.id).catch((error) => {
      console.error(error);
    });
    setIsCreateOrImportDialogOpen(false);
  }

  function moveCategory(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    const sourceIndex = categories.findIndex(
      (category) => category.id === sourceId,
    );
    const targetIndex = categories.findIndex(
      (category) => category.id === targetId,
    );
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const next = [...categories];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persistCategories(next, selectedCategoryId).catch((error) => {
      console.error(error);
    });
  }

  function reorderBookmarkWithinCategory(
    bookmarkId: string,
    targetBookmarkId: string,
  ) {
    if (!selectedCategory || bookmarkId === targetBookmarkId) {
      return;
    }

    const sourceIndex = selectedCategory.bookmarks.findIndex(
      (bookmark) => bookmark.id === bookmarkId,
    );
    const targetIndex = selectedCategory.bookmarks.findIndex(
      (bookmark) => bookmark.id === targetBookmarkId,
    );
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextBookmarks = [...selectedCategory.bookmarks];
    const [moved] = nextBookmarks.splice(sourceIndex, 1);
    nextBookmarks.splice(targetIndex, 0, moved);
    const nextCategories = categories.map((category) =>
      category.id === selectedCategory.id
        ? { ...category, bookmarks: nextBookmarks }
        : category,
    );

    void persistCategories(nextCategories, selectedCategory.id).catch(
      (error) => {
        console.error(error);
      },
    );
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

      setIsCreateOrImportDialogOpen(false);
    } catch (error) {
      console.error(error);
    }

    event.target.value = "";
  }

  const handleTogglePin = useCallback(
    async (categoryId: string, bookmarkId: string, currentPinned: boolean) => {
      let previousCategories: BookmarkCategory[] | null = null;

      setPendingPinBookmarkIds((current) =>
        current.includes(bookmarkId) ? current : [...current, bookmarkId],
      );
      setCategories((current) => {
        previousCategories = current;
        return updateBookmarkPinnedState(
          current,
          categoryId,
          bookmarkId,
          !currentPinned,
        );
      });

      try {
        const saved = await api.updateBookmarkItem(categoryId, bookmarkId, {
          pinned: !currentPinned,
        });
        setCategories(saved);
      } catch (error) {
        if (previousCategories) {
          setCategories(previousCategories);
        }
        console.error("Failed to toggle pin:", error);
        console.error(error);
      } finally {
        setPendingPinBookmarkIds((current) =>
          current.filter((id) => id !== bookmarkId),
        );
      }
    },
    [],
  );

  async function handleAiOrganizeBookmarks() {
    const bookmarkTotal = categories.reduce(
      (total, category) => total + category.bookmarks.length,
      0,
    );

    if (aiOrganizing || bookmarkTotal === 0) {
      return;
    }

    const snapshot = {
      categories: cloneBookmarkCategories(categories),
      selectedCategoryId,
    };

    setAiOrganizing(true);
    setAiOrganizeError(false);

    try {
      const organized = await api.organizeBookmarksWithAi();
      setAiOrganizeUndo(snapshot);
      setCategories(organized);
      setSelectedCategoryId(organized[0]?.id ?? null);
    } catch (error) {
      console.error("Failed to organize bookmarks with AI:", error);
      setAiOrganizeError(true);
    } finally {
      setAiOrganizing(false);
    }
  }

  async function handleUndoAiOrganizeBookmarks() {
    if (!aiOrganizeUndo || aiOrganizing) {
      return;
    }

    setAiOrganizing(true);
    setAiOrganizeError(false);

    try {
      await persistCategories(
        aiOrganizeUndo.categories,
        aiOrganizeUndo.selectedCategoryId,
      );
      setAiOrganizeUndo(null);
    } catch (error) {
      console.error("Failed to restore bookmarks:", error);
      setAiOrganizeError(true);
    } finally {
      setAiOrganizing(false);
    }
  }

  const totalBookmarkCount = categories.reduce(
    (total, category) => total + category.bookmarks.length,
    0,
  );
  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ??
    categories[0] ??
    null;
  const editingBookmark =
    selectedCategory?.bookmarks.find(
      (bookmark) => bookmark.id === editingBookmarkId,
    ) ?? null;
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredBookmarks = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    let list = selectedCategory.bookmarks;
    if (normalizedSearchQuery) {
      list = list.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(normalizedSearchQuery) ||
          bookmark.url.toLowerCase().includes(normalizedSearchQuery),
      );
    }

    return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [normalizedSearchQuery, selectedCategory]);

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const columns =
    breakpoint === "desktop" ? 4 : breakpoint === "tablet" ? 3 : 2;

  const rowCount = useMemo(
    () => Math.ceil(filteredBookmarks.length / columns),
    [filteredBookmarks.length],
  );

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 124,
    overscan: 1,
  });

  const handleEditBookmark = useCallback(
    (bookmarkId: string, title: string, url: string, icon?: string) => {
      setEditingBookmarkId(bookmarkId);
      setBookmarkDraft({ title, url, icon });
    },
    [],
  );

  const handleDeleteBookmark = useCallback((bookmarkId: string) => {
    setDeletingBookmarkId(bookmarkId);
  }, []);

  const handleBookmarkDragStart = useCallback(
    (bookmarkId: string, sourceCategoryId: string) => {
      setDraggedBookmark({ bookmarkId, sourceCategoryId });
    },
    [],
  );

  const handleBookmarkDragEnd = useCallback(() => {
    setDraggedBookmark(null);
  }, []);

  const handleBookmarkDropReorder = useCallback(
    (targetBookmarkId: string) => {
      if (!draggedBookmark || !selectedCategory) {
        return;
      }

      if (draggedBookmark.sourceCategoryId !== selectedCategory.id) {
        return;
      }

      reorderBookmarkWithinCategory(
        draggedBookmark.bookmarkId,
        targetBookmarkId,
      );
      setDraggedBookmark(null);
    },
    [draggedBookmark, selectedCategory],
  );

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
          sidebarCollapsed
            ? "w-0 overflow-hidden"
            : "w-[var(--bookmarks-sidebar-width)] overflow-visible border-r",
          isResizingSidebar ? "border-r-transparent" : "border-border",
        )}
        style={
          sidebarCollapsed
            ? undefined
            : ({
                "--bookmarks-sidebar-width": `${Math.min(sidebarWidth, 380)}px`,
              } as CSSProperties)
        }
      >
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent
              ? "opacity-100 blur-0"
              : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <div className="flex h-10 items-center justify-between rounded-md px-2">
            <div className="text-sm font-semibold text-foreground">
              {bookmarks()}
            </div>
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
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        className="size-4"
                      />
                    </Button>
                  )}
                />
                <TooltipContent side="bottom">
                  {collapse_sidebar()}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent
              ? "opacity-100 blur-0"
              : "pointer-events-none opacity-0 blur-[6px]",
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
                          if (
                            draggedBookmark &&
                            draggedBookmark.sourceCategoryId !== category.id
                          ) {
                            void api
                              .moveBookmarkItem(
                                draggedBookmark.bookmarkId,
                                draggedBookmark.sourceCategoryId,
                                category.id,
                              )
                              .then((saved) => {
                                setCategories(saved);
                                setSelectedCategoryId(category.id);
                                setDraggedBookmark(null);
  
                              })
                              .catch((error) => {
                                console.error(error);
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
                          <HugeiconsIcon
                            icon={CategoryIcon}
                            className="size-3.5 shrink-0"
                            color={category.color}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {category.name}
                          </span>
                        </button>
                        <div className="relative ml-auto flex h-6 shrink-0 items-center">
                          <div className="absolute inset-y-0 right-0 z-10 flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <Tooltip>
                              <TooltipTrigger
                                render={(props) => (
                                  <Button
                                    {...props}
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    tabIndex={-1}
                                    onClick={() =>
                                      setRenameCategoryId(category.id)
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={Edit02Icon}
                                      className="size-3.5"
                                    />
                                  </Button>
                                )}
                              />
                              <TooltipContent side="top">
                                {edit_category()}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={(props) => (
                                  <Button
                                    {...props}
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    tabIndex={-1}
                                    onClick={() =>
                                      setDeleteCategoryId(category.id)
                                    }
                                    className="hover:text-destructive"
                                  >
                                    <HugeiconsIcon
                                      icon={Delete02Icon}
                                      className="size-3.5"
                                    />
                                  </Button>
                                )}
                              />
                              <TooltipContent side="top">
                                {delete_category()}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums transition-opacity group-hover:opacity-0">
                            {category.bookmarks.length}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    className="mx-auto mb-1.5 size-5 text-muted-foreground/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    {new_category_desc()}
                  </p>
                </div>
              )}
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
            isResizingSidebar &&
              "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
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

        <ScrollAreaPrimitive.Root className="relative h-full">
          <ScrollAreaPrimitive.Viewport
            ref={viewportRef}
            className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2 focus-visible:outline-1"
          >
            <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 p-4 lg:gap-6 lg:p-6">
              {selectedCategory ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h1 className="flex items-center gap-2 truncate text-xl font-semibold text-foreground lg:text-2xl">
                        <HugeiconsIcon
                          icon={getBookmarkCategoryIcon(selectedCategory.icon)}
                          className="size-5 shrink-0"
                          color={selectedCategory.color}
                        />
                        <span className="truncate">
                          {selectedCategory.name}
                        </span>
                      </h1>
                      <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                        {bookmark_count({
                          count: selectedCategory.bookmarks.length,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {aiOrganizeUndo ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={aiOrganizing}
                          onClick={() => void handleUndoAiOrganizeBookmarks()}
                        >
                          <HugeiconsIcon
                            icon={Undo02Icon}
                            className="size-4"
                          />
                          {bookmark_ai_undo()}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={aiOrganizing || totalBookmarkCount === 0}
                        onClick={() => void handleAiOrganizeBookmarks()}
                      >
                        {aiOrganizing ? (
                          <Spinner size="sm" />
                        ) : (
                          <HugeiconsIcon
                            icon={AiMagicIcon}
                            className="size-4"
                          />
                        )}
                        {aiOrganizing
                          ? bookmark_ai_organizing()
                          : bookmark_ai_organize()}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setBookmarkDraft({
                            title: "",
                            url: "",
                            icon: undefined,
                          });
                          setIsCreateBookmarkDialogOpen(true);
                        }}
                      >
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                        {new_bookmark()}
                      </Button>
                    </div>
                  </div>

                  {aiOrganizeError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {bookmark_ai_failed()}
                    </div>
                  ) : null}

                  {/* Mobile category picker */}
                  {categories.length > 1 && (
                    <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {categories.map((category) => {
                        const CatIcon = getBookmarkCategoryIcon(category.icon);
                        const isActive = category.id === selectedCategory?.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            <HugeiconsIcon
                              icon={CatIcon}
                              className="size-3"
                              color={isActive ? undefined : category.color}
                            />
                            {category.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredBookmarks.length > 0 ? (
                    <div ref={contentContainerRef} className="min-h-0 flex-1">
                      <div
                        style={{
                          height: virtualizer.getTotalSize(),
                          position: "relative",
                          width: "100%",
                        }}
                      >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                          const startIndex = virtualRow.index * columns;
                          const rowBookmarks = filteredBookmarks.slice(
                            startIndex,
                            startIndex + columns,
                          );

                          return (
                            <div
                              key={virtualRow.key}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              <div
                                className="grid gap-4"
                                style={{
                                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                }}
                              >
                                {rowBookmarks.map((bookmark) => (
                                  <BookmarkCard
                                    key={bookmark.id}
                                    bookmark={bookmark}
                                    categoryId={selectedCategory.id}
                                    pinPending={pendingPinBookmarkIds.includes(
                                      bookmark.id,
                                    )}
                                    onTogglePin={handleTogglePin}
                                    onEdit={handleEditBookmark}
                                    onDelete={handleDeleteBookmark}
                                    onDragStart={handleBookmarkDragStart}
                                    onDragEnd={handleBookmarkDragEnd}
                                    onDropReorder={handleBookmarkDropReorder}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <EmptyState
                        variant="subtle"
                        size="lg"
                        title={
                          searchQuery.trim()
                            ? no_results_found()
                            : no_bookmarks_in_category()
                        }
                        description={
                          searchQuery.trim()
                            ? no_results_desc()
                            : no_bookmarks_desc()
                        }
                        icons={[
                          <HugeiconsIcon
                            key="s1"
                            icon={Search01Icon}
                            className="size-6"
                          />,
                          <HugeiconsIcon
                            key="s2"
                            icon={Bookmark01Icon}
                            className="size-6"
                          />,
                          <HugeiconsIcon
                            key="s3"
                            icon={Folder01Icon}
                            className="size-6"
                          />,
                        ]}
                        action={
                          searchQuery.trim()
                            ? undefined
                            : {
                                label: new_bookmark(),
                                icon: (
                                  <HugeiconsIcon
                                    icon={Add01Icon}
                                    className="size-4"
                                  />
                                ),
                                onClick: () => {
                                  setBookmarkDraft({
                                    title: "",
                                    url: "",
                                    icon: undefined,
                                  });
                                  setIsCreateBookmarkDialogOpen(true);
                                },
                              }
                        }
                        className="w-full max-w-lg"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyState
                    variant="subtle"
                    size="lg"
                    title={bookmarks_workspace()}
                    description={bookmarks_workspace_desc()}
                    icons={[
                      <HugeiconsIcon
                        key="b1"
                        icon={Bookmark01Icon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="b2"
                        icon={Folder01Icon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="b3"
                        icon={Upload01Icon}
                        className="size-6"
                      />,
                    ]}
                    action={{
                      label: create_or_import(),
                      icon: (
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      ),
                      onClick: handleCreateCategory,
                    }}
                    className="w-full max-w-lg"
                  />
                </div>
              )}
            </div>
          </ScrollAreaPrimitive.Viewport>
          <ScrollBar />
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
      </div>

      <RenameDialog
        open={renameCategoryId !== null}
        title={edit_category()}
        initialValue={
          categories.find((category) => category.id === renameCategoryId)
            ?.name ?? ""
        }
        placeholder={category_name()}
        iconValue={
          categories.find((category) => category.id === renameCategoryId)?.icon
        }
        availableIcons={categoryIconOptions}
        colorValue={
          categories.find((category) => category.id === renameCategoryId)?.color
        }
        onClose={() => setRenameCategoryId(null)}
        onSubmit={(name, icon, color) => {
          const category = categories.find(
            (item) => item.id === renameCategoryId,
          );
          if (!category) {
            return;
          }

          void api
            .updateBookmarkCategory(category.id, { name, icon, color })
            .then((saved) => {
              setCategories(saved);
              setSelectedCategoryId(
                (current) => current ?? saved[0]?.id ?? null,
              );
              setRenameCategoryId(null);

            })
            .catch((error) => {
              console.error(error);
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateBookmarkDialogOpen(false)}
            >
              {cancel()}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedCategoryId) {
                  return;
                }

                if (!bookmarkDraft.title.trim() || !bookmarkDraft.url.trim()) {
                  return;
                }

                void api
                  .createBookmarkItem(selectedCategoryId, {
                    title: bookmarkDraft.title.trim(),
                    url: bookmarkDraft.url.trim(),
                    icon: bookmarkDraft.icon,
                  })
                  .then((saved) => {
                    setCategories(saved);
                    setSelectedCategoryId(selectedCategoryId);
                    setBookmarkDraft({ title: "", url: "", icon: undefined });
                    setIsCreateBookmarkDialogOpen(false);

                  })
                  .catch((error) => {
                    console.error(error);
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
            onChange={(icon) =>
              setBookmarkDraft((current) => ({ ...current, icon }))
            }
          />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{title_label()}</span>
            <input
              value={bookmarkDraft.title}
              onChange={(event) =>
                setBookmarkDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{url()}</span>
            <input
              value={bookmarkDraft.url}
              onChange={(event) =>
                setBookmarkDraft((current) => ({
                  ...current,
                  url: event.target.value,
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
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

          void api
            .deleteBookmarkItem(selectedCategoryId, deletingBookmarkId)
            .then((saved) => {
              setCategories(saved);
              setSelectedCategoryId(
                (current) => current ?? saved[0]?.id ?? null,
              );
              setDeletingBookmarkId(null);

            })
            .catch((error) => {
              console.error(error);
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingBookmarkId(null)}
            >
              {cancel()}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editingBookmarkId || !selectedCategoryId) {
                  return;
                }

                if (!bookmarkDraft.title.trim() || !bookmarkDraft.url.trim()) {
                  return;
                }

                void api
                  .updateBookmarkItem(selectedCategoryId, editingBookmarkId, {
                    title: bookmarkDraft.title.trim(),
                    url: bookmarkDraft.url.trim(),
                    icon: bookmarkDraft.icon ?? null,
                  })
                  .then((saved) => {
                    setCategories(saved);
                    setSelectedCategoryId(
                      (current) => current ?? saved[0]?.id ?? null,
                    );
                    setEditingBookmarkId(null);

                  })
                  .catch((error) => {
                    console.error(error);
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
            onChange={(icon) =>
              setBookmarkDraft((current) => ({ ...current, icon }))
            }
          />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{title_label()}</span>
            <input
              value={bookmarkDraft.title}
              onChange={(event) =>
                setBookmarkDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{url()}</span>
            <input
              value={bookmarkDraft.url}
              onChange={(event) =>
                setBookmarkDraft((current) => ({
                  ...current,
                  url: event.target.value,
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
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

          void api
            .deleteBookmarkCategory(deleteCategoryId)
            .then((saved) => {
              setCategories(saved);
              if (selectedCategoryId === deleteCategoryId) {
                setSelectedCategoryId(saved[0]?.id ?? null);
              }
              setDeleteCategoryId(null);

            })
            .catch((error) => {
              console.error(error);
            });
        }}
      />

      <AppDialog
        open={isCreateOrImportDialogOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOrImportStep("choose");
          setIsCreateOrImportDialogOpen(open);
        }}
        title={
          createOrImportStep === "choose"
            ? create_or_import()
            : createOrImportStep === "create"
              ? new_category()
              : import_from_file()
        }
        size="sm"
        bodyClassName={
          createOrImportStep === "choose" ? "flex items-center" : undefined
        }
        footer={
          createOrImportStep === "choose" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOrImportDialogOpen(false)}
            >
              {cancel()}
            </Button>
          ) : createOrImportStep === "create" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOrImportStep("choose")}
              >
                {back()}
              </Button>
              <Button type="button" onClick={handleCreateCategorySubmit}>
                {create()}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOrImportStep("choose")}
              >
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
                <div className="text-sm font-medium text-foreground">
                  {new_category()}
                </div>
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
                <div className="text-sm font-medium text-foreground">
                  {import_from_file()}
                </div>
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
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
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
