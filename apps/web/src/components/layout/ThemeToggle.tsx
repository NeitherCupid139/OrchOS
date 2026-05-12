import { startTransition, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { theme_dark, theme_light, theme_switch_mode, theme_system } from "@/paraglide/messages";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIStore } from "@/lib/store";

type ThemeMode = "light" | "dark" | "auto";

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);

  if (mode === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
  }

  document.documentElement.style.colorScheme = resolved;
}

function applyThemeModeWithoutTransitions(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  applyThemeMode(mode);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
    });
  });
}

export default function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    applyThemeMode(theme as ThemeMode);
  }, [theme]);

  useEffect(() => {
    if (theme !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function handleThemeChange(nextTheme: string) {
    const mode = nextTheme as ThemeMode;
    applyThemeModeWithoutTransitions(mode);
    startTransition(() => {
      setTheme(mode);
    });
  }

  return (
    <Tabs value={theme} onValueChange={handleThemeChange}>
      <TabsList>
        <TabsTrigger value="light" aria-label={theme_switch_mode({ label: theme_light() })}>
          <Sun className="size-4" />
        </TabsTrigger>
        <TabsTrigger value="dark" aria-label={theme_switch_mode({ label: theme_dark() })}>
          <Moon className="size-4" />
        </TabsTrigger>
        <TabsTrigger value="auto" aria-label={theme_switch_mode({ label: theme_system() })}>
          <Monitor className="size-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
