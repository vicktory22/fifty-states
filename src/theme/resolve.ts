import { DEFAULT_THEME_ID, parseThemeId } from "./registry";
import type { ThemeId } from "./types";

export type ResolveThemeInput = {
  url?: string | null;
  stored?: string | null;
  fallback?: ThemeId;
};

/** URL wins when valid, else storage, else fallback (default tokyo-night). */
export function resolveThemeId(input: ResolveThemeInput): ThemeId {
  const fromUrl = parseThemeId(input.url);
  if (fromUrl) return fromUrl;
  const fromStored = parseThemeId(input.stored);
  if (fromStored) return fromStored;
  return input.fallback ?? DEFAULT_THEME_ID;
}
