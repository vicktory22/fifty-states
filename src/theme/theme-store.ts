import { createStore } from "@tanstack/react-store";
import { DEFAULT_THEME_ID, getTheme } from "./registry";
import { readStoredThemeId, writeStoredThemeId, type ThemeStorage } from "./storage";
import type { ThemeDefinition, ThemeId } from "./types";

export type ThemeState = {
  id: ThemeId;
};

function initialId(storage?: ThemeStorage | null): ThemeId {
  return readStoredThemeId(storage === undefined ? undefined : storage) ?? DEFAULT_THEME_ID;
}

export const themeStore = createStore<ThemeState>({
  id: initialId(),
});

/** Set active theme id and persist (no router coupling in Slice 1). */
export function setThemeId(id: ThemeId, storage?: ThemeStorage | null): void {
  themeStore.setState(() => ({ id }));
  writeStoredThemeId(id, storage === undefined ? undefined : storage);
}

export function getThemeId(): ThemeId {
  return themeStore.state.id;
}

export function getActiveTheme(): ThemeDefinition {
  return getTheme(themeStore.state.id);
}

/** Test helper: reset store (+ optional storage) to default. */
export function resetThemeStore(storage?: ThemeStorage | null): void {
  const id = DEFAULT_THEME_ID;
  themeStore.setState(() => ({ id }));
  if (storage) {
    writeStoredThemeId(id, storage);
  }
}
