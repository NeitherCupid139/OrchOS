import { describe, expect, it } from "vitest";
import { migrateUIStore } from "@/lib/ui-store-migrations";
import { parsePersistedThemeMode, resolveThemeMode } from "@/lib/theme";

describe("theme persistence", () => {
  it("falls back to system mode when no explicit theme preference was stored", () => {
    expect(parsePersistedThemeMode(null)).toBe("auto");
    expect(parsePersistedThemeMode(JSON.stringify({ state: { theme: "dark" } }))).toBe("auto");
  });

  it("respects an explicitly saved theme preference", () => {
    expect(
      parsePersistedThemeMode(JSON.stringify({ state: { theme: "dark", themePreferenceSet: true } })),
    ).toBe("dark");
    expect(
      parsePersistedThemeMode(JSON.stringify({ state: { theme: "auto", themePreferenceSet: true } })),
    ).toBe("auto");
  });

  it("resolves auto mode against the current system preference", () => {
    expect(resolveThemeMode("auto", true)).toBe("dark");
    expect(resolveThemeMode("auto", false)).toBe("light");
  });
});

describe("ui store migration", () => {
  it("resets legacy persisted themes back to follow-system", () => {
    expect(migrateUIStore({ theme: "dark" }, 2)).toMatchObject({
      theme: "auto",
      themePreferenceSet: false,
    });
  });

  it("keeps explicit theme preferences saved by the current schema", () => {
    expect(
      migrateUIStore({ theme: "dark", themePreferenceSet: true }, 3),
    ).toMatchObject({
      theme: "dark",
      themePreferenceSet: true,
    });
  });
});
