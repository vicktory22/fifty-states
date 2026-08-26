import { applyThemeToDocument } from "./apply-document";
import { getTheme } from "./registry";
import { resolveThemeId } from "./resolve";
import { readStoredThemeId, type ThemeStorage } from "./storage";
import { getThemeId, setThemeId } from "./theme-store";
import type { ThemeId } from "./types";

export type ThemeSearchWriter = {
  /** Replace current location search while preserving other keys. */
  replaceThemeSearch: (theme: ThemeId) => void;
};

/** Resolve URL → storage → default, apply document + store, fix URL if needed. */
export function hydrateThemeFromSources(
  urlTheme: string | undefined,
  writer: ThemeSearchWriter,
  storage?: ThemeStorage | null,
): ThemeId {
  const resolved = resolveThemeId({
    url: urlTheme,
    stored: readStoredThemeId(storage === undefined ? undefined : storage),
  });
  setThemeId(resolved, storage === undefined ? undefined : storage);
  applyThemeToDocument(getTheme(resolved));
  if (urlTheme !== resolved) {
    writer.replaceThemeSearch(resolved);
  }
  return resolved;
}

/** User/system theme change: store + document + URL. */
export function commitTheme(
  id: ThemeId,
  writer: ThemeSearchWriter,
  storage?: ThemeStorage | null,
): void {
  if (id === getThemeId()) {
    applyThemeToDocument(getTheme(id));
    writer.replaceThemeSearch(id);
    return;
  }
  setThemeId(id, storage === undefined ? undefined : storage);
  applyThemeToDocument(getTheme(id));
  writer.replaceThemeSearch(id);
}

/** Follow an already-valid URL theme (e.g. back/forward). */
export function followUrlTheme(id: ThemeId): void {
  if (id === getThemeId()) return;
  setThemeId(id);
  applyThemeToDocument(getTheme(id));
}
