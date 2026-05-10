import { useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { m } from "@/paraglide/messages";
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

  return (
    <Tabs value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
      <TabsList>
        <TabsTrigger value="light" aria-label={m.theme_switch_mode({ label: m.theme_light() })}>
          <Sun className="size-4" />
        </TabsTrigger>
        <TabsTrigger value="dark" aria-label={m.theme_switch_mode({ label: m.theme_dark() })}>
          <Moon className="size-4" />
        </TabsTrigger>
        <TabsTrigger value="auto" aria-label={m.theme_switch_mode({ label: m.theme_system() })}>
          <Monitor className="size-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
