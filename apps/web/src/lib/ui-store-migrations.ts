import { isThemeMode } from "@/lib/theme";

type PersistedUIState = Record<string, unknown>;

export function migrateUIStore(persisted: unknown, version: number) {
  const state = persisted && typeof persisted === "object"
    ? persisted as PersistedUIState
    : {} as PersistedUIState;

  if (version < 2 && state.creationSidebarWidth === undefined) {
    state.creationSidebarWidth = 280;
  }

  if (version < 3) {
    state.themePreferenceSet = false;
  }

  const themePreferenceSet = state.themePreferenceSet === true;
  const theme = isThemeMode(state.theme) ? state.theme : "auto";

  state.themePreferenceSet = themePreferenceSet;
  state.theme = themePreferenceSet ? theme : "auto";

  return state;
}
