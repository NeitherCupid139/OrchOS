import {
  useRef,
  useCallback,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  TextBoldIcon,
  TextItalicIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type FormatCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "createLink"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight";

interface ToolbarButton {
  command: FormatCommand;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    command: "bold",
    icon: ({ className }) => (
      <HugeiconsIcon icon={TextBoldIcon} className={className ?? "size-4"} />
    ),
    label: "Bold",
    shortcut: "Ctrl+B",
  },
  {
    command: "italic",
    icon: ({ className }) => (
      <HugeiconsIcon icon={TextItalicIcon} className={className ?? "size-4"} />
    ),
    label: "Italic",
    shortcut: "Ctrl+I",
  },
  // Underline uses a custom SVG since hugeicons doesn't have a dedicated underline icon
  {
    command: "underline",
    icon: ({ className }) => (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={className ?? "size-4"}
      >
        <path
          d="M4 1.5V7C4 9.21 5.79 11 8 11c2.21 0 4-1.79 4-4V1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M3 13.5H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    label: "Underline",
    shortcut: "Ctrl+U",
  },
  {
    command: "insertUnorderedList",
    icon: ({ className }) => (
      <HugeiconsIcon
        icon={LeftToRightListBulletIcon}
        className={className ?? "size-4"}
      />
    ),
    label: "Bullet list",
  },
  {
    command: "insertOrderedList",
    icon: ({ className }) => (
      <HugeiconsIcon
        icon={LeftToRightListNumberIcon}
        className={className ?? "size-4"}
      />
    ),
    label: "Numbered list",
  },
  {
    command: "createLink",
    icon: ({ className }) => (
      <HugeiconsIcon icon={Link01Icon} className={className ?? "size-4"} />
    ),
    label: "Link",
    shortcut: "Ctrl+K",
  },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  maxHeight?: string;
}

/**
 * Lightweight rich text editor for email compose.
 * Uses contentEditable with execCommand for formatting.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message...",
  className,
  disabled = false,
  minHeight = "160px",
  maxHeight = "400px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Sync external value changes (but avoid resetting cursor during editing)
  const isInternalChange = useRef(false);

  // Initialize content from value prop on first render
  const [initialized, setInitialized] = useState(false);
  const editorCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !initialized) {
        if (value) {
          node.innerHTML = value;
        }
        setInitialized(true);
      }
      (editorRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [value, initialized],
  );

  const handleEditorChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    isInternalChange.current = true;
    onChange(editor.innerHTML);
    // Reset after microtask
    setTimeout(() => {
      isInternalChange.current = false;
    }, 0);
  }, [onChange]);

  const exec = useCallback(
    (command: FormatCommand, value?: string) => {
      const editor = editorRef.current;
      if (!editor || disabled) return;
      editor.focus();

      if (command === "createLink") {
        if (showLinkInput) {
          // Apply the link
          const url = linkInputRef.current?.value.trim();
          if (url) {
            document.execCommand("createLink", false, url);
          }
          setShowLinkInput(false);
        } else {
          // If text is selected, show link prompt
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed) {
            setShowLinkInput(true);
            setTimeout(() => linkInputRef.current?.focus(), 0);
          }
        }
        return;
      }

      document.execCommand(command, false, value);
      editor.focus();
    },
    [disabled, showLinkInput],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "b") {
        e.preventDefault();
        exec("bold");
      } else if (mod && e.key === "i") {
        e.preventDefault();
        exec("italic");
      } else if (mod && e.key === "u") {
        e.preventDefault();
        exec("underline");
      } else if (mod && e.key === "k") {
        e.preventDefault();
        exec("createLink");
      }
    },
    [exec],
  );

  const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    // Paste as plain text to avoid bringing in rich formatting from external sources
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const getActiveFormats = useCallback((): Set<string> => {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("insertUnorderedList"))
      formats.add("insertUnorderedList");
    if (document.queryCommandState("insertOrderedList"))
      formats.add("insertOrderedList");
    return formats;
  }, []);

  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const updateFormats = useCallback(() => {
    setActiveFormats(getActiveFormats());
  }, [getActiveFormats]);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col rounded-md border transition-colors",
        isFocused ? "border-blue-400 ring-1 ring-blue-400/20" : "border-border",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/30 px-1.5 py-1">
        {TOOLBAR_BUTTONS.map((btn) => {
          const isActive = activeFormats.has(btn.command);
          return (
            <Tooltip key={btn.command}>
              <TooltipTrigger
                render={(props) => (
                  <Button
                    {...props}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      exec(btn.command);
                      // Update active states after command
                      setTimeout(updateFormats, 10);
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
                    disabled={disabled}
                    aria-label={
                      btn.shortcut
                        ? `${btn.label} (${btn.shortcut})`
                        : btn.label
                    }
                    className={cn(
                      "active:translate-y-0",
                      isActive && "bg-accent text-foreground",
                    )}
                  >
                    <btn.icon />
                  </Button>
                )}
              />
              <TooltipContent side="bottom">
                {btn.label}
                {btn.shortcut && (
                  <kbd data-slot="kbd" className="ml-1.5 text-[10px]">
                    {btn.shortcut}
                  </kbd>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {showLinkInput && (
          <div className="ml-1 flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
            <input
              ref={linkInputRef}
              type="url"
              placeholder="https://..."
              aria-label="Link URL"
              className="w-40 border-0 bg-transparent text-xs outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  exec("createLink");
                } else if (e.key === "Escape") {
                  setShowLinkInput(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => exec("createLink")}
              className="text-xs font-medium text-blue-500 hover:text-blue-600"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setShowLinkInput(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div
        ref={editorCallbackRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        tabIndex={0}
        onInput={handleEditorChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => {
          setIsFocused(true);
          updateFormats();
        }}
        onBlur={() => setIsFocused(false)}
        onKeyUp={updateFormats}
        onMouseUp={updateFormats}
        data-placeholder={placeholder}
        className={cn(
          "prose prose-sm max-w-none flex-1 overflow-y-auto px-4 py-3 text-[14px] leading-7 text-foreground outline-none",
          "empty:before:pointer-events-none empty:before:text-muted-foreground/60 empty:before:content-[attr(data-placeholder)]",
        )}
        style={{ minHeight, maxHeight }}
        // oxlint-disable-next-line react-doctor/prefer-tag-over-role -- contentEditable div, <input> cannot support rich text
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
      />
    </div>
  );
}

/**
 * Convert HTML content to plain text for email sending.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";

  // Simple conversion: replace common block elements with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Decode HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean up excessive newlines
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
