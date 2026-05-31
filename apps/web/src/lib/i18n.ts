import type { Locale } from "@/paraglide/runtime";

export { syncActiveLocale, syncRuntimeLocale } from "@/lib/i18n-runtime";
export type { Locale };

export const AVAILABLE_LOCALES = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
] as const;
