import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark01Icon, PinIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const FAVICON_CACHE_KEY = "favicon_cache_v1";

function getLocalFavicon(domain: string): string | null {
  try {
    const cache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || "{}");
    return typeof cache[domain] === "string" ? cache[domain] : null;
  } catch {
    return null;
  }
}

function setLocalFavicon(domain: string, dataUrl: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || "{}");
    cache[domain] = dataUrl;
    localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

interface BookmarkFaviconProps {
  url: string;
  pinned?: boolean;
  icon?: string;
  bookmarkId?: string;
  categoryId?: string;
}

export function BookmarkFavicon({ url, pinned, icon, bookmarkId, categoryId }: BookmarkFaviconProps) {
  const failedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(() => {
    // Initialize: prop icon > localStorage cache > null
    if (icon) return icon;
    let domain: string | null = null;
    try {
      domain = new URL(url).hostname;
    } catch {
      // invalid URL
    }
    return domain ? getLocalFavicon(domain) : null;
  });
  const ref = useRef<HTMLDivElement>(null);
  let domain: string | null = null;
  try {
    domain = new URL(url).hostname;
  } catch {
    // invalid URL
  }

  // Sync DB icon to state when the prop changes
  useEffect(() => {
    if (icon) {
      setSrc(icon);
      if (domain) setLocalFavicon(domain, icon);
    }
  }, [icon, domain]);

  // If we have a cached or DB icon, render it directly
  if (src) {
    return (
      <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-accent">
        <img
          src={src}
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

  const handleImageLoad = useCallback(() => {
    if (!bookmarkId || !categoryId || domain === null) return;
    void (async () => {
      try {
        const result = await api.cacheBookmarkFavicon(bookmarkId, categoryId, url);
        if (!domain) return;
        const category = result.find((c: { id: string }) => c.id === categoryId);
        const updated = category?.bookmarks.find((b: { id: string }) => b.id === bookmarkId);
        if (updated?.icon) {
          setLocalFavicon(domain, updated.icon);
          setSrc(updated.icon); // triggers re-render with cached icon
        }
      } catch {
        // Silently fail — DuckDuckGo icon still works
      }
    })();
  }, [bookmarkId, categoryId, url, domain]);

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
      <div
        ref={ref}
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
          pinned ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary",
        )}
      >
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
          onLoad={handleImageLoad}
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
