import { parseThemeId } from "./registry";
import type { ThemeId } from "./types";

export const THEME_STORAGE_KEY = "fifty-states.theme";

export type ThemeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultStorage(): ThemeStorage | null {
  try {
    const storage = globalThis.localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

export function readStoredThemeId(storage: ThemeStorage | null = defaultStorage()): ThemeId | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return parseThemeId(raw);
  } catch {
    return null;
  }
}

export function writeStoredThemeId(
  id: ThemeId,
  storage: ThemeStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearStoredThemeId(storage: ThemeStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** In-memory Storage stand-in for tests / SSR. */
export function createMemoryThemeStorage(initial?: Partial<Record<string, string>>): ThemeStorage {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(initial ?? {})) {
    if (value !== undefined) map.set(key, value);
  }
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
