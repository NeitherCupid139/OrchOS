import { AVAILABLE_LOCALES } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { m } from "@/paraglide/messages";
import { Languages } from "lucide-react";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ko: "한국어",
  ja: "日本語",
};

export default function LocaleToggle() {
  const { locale: currentLocale, setLocaleWithSync } = useLocale();

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger
          render={(props) => (
            <DropdownMenuTrigger
              render={
                <Button {...props} variant="ghost" size="icon" className="size-9" aria-label={m.switch_language()}>
                  <Languages className="size-4" />
                </Button>
              }
            />
          )}
        />
        <DropdownMenuContent align="end">
          {AVAILABLE_LOCALES.map((locale) => (
            <DropdownMenuItem key={locale.value} onClick={() => setLocaleWithSync(locale.value)}>
              {LOCALE_LABELS[locale.value]}
              {currentLocale === locale.value && (
                <span className="ms-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side="bottom">{m.switch_language()}</TooltipContent>
    </Tooltip>
  );
}
