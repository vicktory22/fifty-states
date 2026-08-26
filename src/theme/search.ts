import { parseThemeId } from "./registry";
import type { ThemeId } from "./types";

export type ThemeSearch = {
  theme?: ThemeId;
};

/** Validate/normalize `?theme=` for TanStack Router `validateSearch`. */
export function validateThemeSearch(search: { theme?: string }): ThemeSearch {
  const theme = parseThemeId(search.theme);
  return theme ? { theme } : {};
}
