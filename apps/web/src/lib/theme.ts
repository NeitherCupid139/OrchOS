export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "orchos-ui";

type PersistedThemeSnapshot = {
  state?: {
    theme?: unknown;
    themePreferenceSet?: unknown;
  };
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return prefersDark ? "dark" : "light";
}

export function parsePersistedThemeMode(raw: string | null): ThemeMode {
  if (!raw) return "auto";

  try {
    const parsed = JSON.parse(raw) as PersistedThemeSnapshot;
    const theme = parsed?.state?.theme;
    const themePreferenceSet = parsed?.state?.themePreferenceSet === true;

    if (!themePreferenceSet || !isThemeMode(theme)) {
      return "auto";
    }

    return theme;
  } catch {
    return "auto";
  }
}

function getSystemThemeMode(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeMode(mode: ThemeMode) {
  const resolved = resolveThemeMode(mode, getSystemThemeMode() === "dark");
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);

  if (mode === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }

  root.style.colorScheme = resolved;
}

export const THEME_INIT_SCRIPT = `(function(){try{var raw=window.localStorage.getItem('${THEME_STORAGE_KEY}');var mode='auto';if(raw){var parsed=JSON.parse(raw);var state=parsed&&typeof parsed==='object'?parsed.state:null;var theme=state&&state.theme;var explicit=state&&state.themePreferenceSet===true;if(explicit&&(theme==='light'||theme==='dark'||theme==='auto')){mode=theme}}var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='dark'||(mode==='auto'&&prefersDark)?'dark':'light';var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;
