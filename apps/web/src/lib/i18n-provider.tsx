import { Fragment, useState, useCallback, useEffect, createContext, use, type ReactNode } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import { useUIStore } from "@/lib/store";
import { getHydratedClientLocale, getInitialLocale, syncRuntimeLocale } from "@/lib/i18n-runtime";
import type { Locale } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocaleWithSync: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocaleWithSync: () => {},
});

const persistLocaleSetting = createClientOnlyFn(async (locale: Locale) => {
  const { api } = await import("./api.client");
  return api.updateSettings({ locale });
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  const [locale, setLocaleState] = useState(() => getInitialLocale());

  syncRuntimeLocale(locale);

  // Apply any persisted client locale after hydration.
  useEffect(() => {
    const hydratedLocale = getHydratedClientLocale();
    if (hydratedLocale && hydratedLocale !== locale) {
      setLocaleState(hydratedLocale);
    }
  }, []);

  // If settings change (e.g. from server fetch), sync to locale state
  useEffect(() => {
    if (settings?.locale && settings.locale !== locale) {
      setLocaleState(settings.locale);
    }
  }, [settings?.locale]);

  const setLocaleWithSync = useCallback(
    async (newLocale: Locale) => {
      setLocaleState(newLocale);
      syncRuntimeLocale(newLocale);
      try {
        const updated = await persistLocaleSetting(newLocale);
        if (updated) {
          setSettings(updated);
        }
      } catch {
        // Server sync is optional — locale already updated locally
      }
    },
    [setSettings],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocaleWithSync }}>
      <Fragment key={locale}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export function useLocale() {
  return use(I18nContext);
}
