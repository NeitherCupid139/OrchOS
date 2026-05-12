import { getLocale, setLocale } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

export { getLocale, setLocale, m };
export type { Locale };

export const AVAILABLE_LOCALES = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
] as const;

export function changeLocale(locale: Locale) {
  setLocale(locale, { reload: false });
}
