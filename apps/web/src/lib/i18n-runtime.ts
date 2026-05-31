import {
  baseLocale,
  getLocale as getParaglideLocale,
  overwriteGetLocale,
  setLocale as setParaglideLocale,
} from "@/paraglide/runtime";
import { locales } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";

const UI_STORAGE_KEY = "orchos-ui";
const LEGACY_LOCALE_STORAGE_KEY = "orchos-locale";

let activeLocale: Locale = baseLocale;
let clientLocaleInitialized = false;

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: { settings?: { locale?: string } };
      };
      const storedLocale = parsed.state?.settings?.locale;
      if (typeof storedLocale === "string" && isLocale(storedLocale)) {
        return storedLocale;
      }
    }

    const legacyLocale = window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
    if (legacyLocale && isLocale(legacyLocale)) {
      writeStoredLocale(legacyLocale);
      window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
      return legacyLocale;
    }

    return null;
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as {
          state?: { settings?: Record<string, unknown> };
          version?: number;
        })
      : {};

    const next = {
      ...parsed,
      state: {
        ...parsed.state,
        settings: {
          ...parsed.state?.settings,
          locale,
        },
      },
    };

    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
  } catch {}
}

function initializeClientLocale() {
  if (typeof document === "undefined" || clientLocaleInitialized) {
    return;
  }

  activeLocale =
    readStoredLocale() ||
    (isLocale(document.documentElement.lang) ? document.documentElement.lang : null) ||
    getParaglideLocale() ||
    baseLocale;
  overwriteGetLocale(() => activeLocale);
  clientLocaleInitialized = true;
}

export function getInitialLocale() {
  // Keep the first client render aligned with SSR to avoid hydration mismatches.
  return getParaglideLocale();
}

export function getHydratedClientLocale() {
  if (typeof window === "undefined") {
    return getParaglideLocale();
  }

  initializeClientLocale();
  return activeLocale;
}

export function syncActiveLocale(locale: Locale) {
  activeLocale = locale;
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  setParaglideLocale(locale, { reload: false });
}

export function syncRuntimeLocale(locale: Locale) {
  syncActiveLocale(locale);
  writeStoredLocale(locale);
}
