import { deriveTheme } from "./derive";
import { mergeTheme } from "./merge";
import {
  THEME_IDS,
  type EditorSeed,
  type ThemeDefinition,
  type ThemeId,
  type ThemeMeta,
  type ThemeOverride,
} from "./types";

type RegistryEntry = {
  meta: ThemeMeta;
  seed: EditorSeed;
};

/**
 * Semantic seeds from public editor-theme palettes (not full VS Code JSON).
 * Slice 1 ships derivation only; hero overrides land in later slices.
 */
const ENTRIES = {
  "tokyo-night": {
    meta: { id: "tokyo-night", label: "Tokyo Night", family: "Tokyo Night" },
    seed: {
      bg: "#1a1b26",
      fg: "#c0caf5",
      accent: "#7aa2f7",
      muted: "#565f89",
      success: "#9ece6a",
      warning: "#e0af68",
      error: "#f7768e",
    },
  },
  "tokyo-night-storm": {
    meta: { id: "tokyo-night-storm", label: "Tokyo Night Storm", family: "Tokyo Night" },
    seed: {
      bg: "#24283b",
      fg: "#c0caf5",
      accent: "#7aa2f7",
      muted: "#565f89",
      success: "#9ece6a",
      warning: "#e0af68",
      error: "#f7768e",
    },
  },
  "tokyo-night-day": {
    meta: { id: "tokyo-night-day", label: "Tokyo Night Day", family: "Tokyo Night" },
    seed: {
      bg: "#e1e2e7",
      fg: "#3760bf",
      accent: "#2e7de9",
      muted: "#848cb5",
      success: "#587539",
      warning: "#8c6c3e",
      error: "#f52a65",
    },
  },
  "catppuccin-latte": {
    meta: { id: "catppuccin-latte", label: "Latte", family: "Catppuccin" },
    seed: {
      bg: "#eff1f5",
      fg: "#4c4f69",
      accent: "#1e66f5",
      muted: "#8c8fa1",
      success: "#40a02b",
      warning: "#df8e1d",
      error: "#d20f39",
    },
  },
  "catppuccin-frappe": {
    meta: { id: "catppuccin-frappe", label: "Frappé", family: "Catppuccin" },
    seed: {
      bg: "#303446",
      fg: "#c6d0f5",
      accent: "#8caaee",
      muted: "#838ba7",
      success: "#a6d189",
      warning: "#e5c890",
      error: "#e78284",
    },
  },
  "catppuccin-macchiato": {
    meta: { id: "catppuccin-macchiato", label: "Macchiato", family: "Catppuccin" },
    seed: {
      bg: "#24273a",
      fg: "#cad3f5",
      accent: "#8aadf4",
      muted: "#8087a2",
      success: "#a6da95",
      warning: "#eed49f",
      error: "#ed8796",
    },
  },
  "catppuccin-mocha": {
    meta: { id: "catppuccin-mocha", label: "Mocha", family: "Catppuccin" },
    seed: {
      bg: "#1e1e2e",
      fg: "#cdd6f4",
      accent: "#89b4fa",
      muted: "#6c7086",
      success: "#a6e3a1",
      warning: "#f9e2af",
      error: "#f38ba8",
    },
  },
  "rose-pine": {
    meta: { id: "rose-pine", label: "Rosé Pine", family: "Rosé Pine" },
    seed: {
      bg: "#191724",
      fg: "#e0def4",
      accent: "#c4a7e7",
      muted: "#6e6a86",
      success: "#31748f",
      warning: "#f6c177",
      error: "#eb6f92",
    },
  },
  "rose-pine-moon": {
    meta: { id: "rose-pine-moon", label: "Moon", family: "Rosé Pine" },
    seed: {
      bg: "#232136",
      fg: "#e0def4",
      accent: "#c4a7e7",
      muted: "#6e6a86",
      success: "#3e8fb0",
      warning: "#f6c177",
      error: "#eb6f92",
    },
  },
  "rose-pine-dawn": {
    meta: { id: "rose-pine-dawn", label: "Dawn", family: "Rosé Pine" },
    seed: {
      bg: "#faf4ed",
      fg: "#575279",
      accent: "#907aa9",
      muted: "#9893a5",
      success: "#56949f",
      warning: "#ea9d34",
      error: "#b4637a",
    },
  },
  nord: {
    meta: { id: "nord", label: "Nord", family: "Nord" },
    seed: {
      bg: "#2e3440",
      fg: "#eceff4",
      accent: "#88c0d0",
      muted: "#4c566a",
      success: "#a3be8c",
      warning: "#ebcb8b",
      error: "#bf616a",
    },
  },
  "one-dark": {
    meta: { id: "one-dark", label: "One Dark", family: "One Dark" },
    seed: {
      bg: "#282c34",
      fg: "#abb2bf",
      accent: "#61afef",
      muted: "#5c6370",
      success: "#98c379",
      warning: "#e5c07b",
      error: "#e06c75",
    },
  },
  dracula: {
    meta: { id: "dracula", label: "Dracula", family: "Dracula" },
    seed: {
      bg: "#282a36",
      fg: "#f8f8f2",
      accent: "#bd93f9",
      muted: "#6272a4",
      success: "#50fa7b",
      warning: "#f1fa8c",
      error: "#ff5555",
    },
  },
  "gruvbox-dark": {
    meta: { id: "gruvbox-dark", label: "Gruvbox Dark", family: "Gruvbox" },
    seed: {
      bg: "#282828",
      fg: "#ebdbb2",
      accent: "#83a598",
      muted: "#928374",
      success: "#b8bb26",
      warning: "#fabd2f",
      error: "#fb4934",
    },
  },
} satisfies Record<ThemeId, RegistryEntry>;

/** Hand overrides on top of derivation (hero polish). */
export function themeOverride(id: ThemeId): ThemeOverride | undefined {
  switch (id) {
    case "tokyo-night":
      return {
        map: {
          colors: {
            idle: 0x24283b,
            hover: 0x414868,
            selected: 0x7aa2f7,
            edgeIdle: 0x565f89,
            edgeSelected: 0xc0caf5,
          },
          background: 0x1a1b26,
          ocean: { deep: 0x16161e, mid: 0x1f2335, fog: 0x1a1b26 },
          lights: {
            hemiSky: 0xc0caf5,
            hemiGround: 0x1a1b26,
            key: 0xfff1c1,
            rim: 0x7aa2f7,
            lock: 0x9ece6a,
          },
          decalUnscored: 0xc0caf5,
        },
      };
    case "catppuccin-mocha":
      return {
        map: {
          colors: {
            idle: 0x313244,
            hover: 0x45475a,
            selected: 0x89b4fa,
            edgeIdle: 0x6c7086,
            edgeSelected: 0xcdd6f4,
          },
          ocean: { deep: 0x181825, mid: 0x1e1e2e, fog: 0x1e1e2e },
          lights: {
            hemiSky: 0xcdd6f4,
            hemiGround: 0x11111b,
            key: 0xf5e0dc,
            rim: 0xcba6f7,
            lock: 0xa6e3a1,
          },
          decalUnscored: 0xcdd6f4,
        },
      };
    case "rose-pine-dawn":
      return {
        threeUiMode: "light",
        map: {
          colors: {
            idle: 0xf2e9e1,
            hover: 0xdfdad9,
            selected: 0x907aa9,
            edgeIdle: 0x9893a5,
            edgeSelected: 0x575279,
          },
          background: 0xfaf4ed,
          ocean: { deep: 0xf2e9e1, mid: 0xfffaf3, fog: 0xfaf4ed },
          lights: {
            hemiSky: 0xfffaf3,
            hemiGround: 0xf2e9e1,
            key: 0xfffaf3,
            rim: 0x907aa9,
            lock: 0x56949f,
          },
          decalUnscored: 0x575279,
        },
      };
    default:
      return undefined;
  }
}

function buildTheme(id: ThemeId): ThemeDefinition {
  const entry = ENTRIES[id];
  return mergeTheme(deriveTheme(entry.seed, entry.meta), themeOverride(id));
}

export const THEMES = {
  "tokyo-night": buildTheme("tokyo-night"),
  "tokyo-night-storm": buildTheme("tokyo-night-storm"),
  "tokyo-night-day": buildTheme("tokyo-night-day"),
  "catppuccin-latte": buildTheme("catppuccin-latte"),
  "catppuccin-frappe": buildTheme("catppuccin-frappe"),
  "catppuccin-macchiato": buildTheme("catppuccin-macchiato"),
  "catppuccin-mocha": buildTheme("catppuccin-mocha"),
  "rose-pine": buildTheme("rose-pine"),
  "rose-pine-moon": buildTheme("rose-pine-moon"),
  "rose-pine-dawn": buildTheme("rose-pine-dawn"),
  nord: buildTheme("nord"),
  "one-dark": buildTheme("one-dark"),
  dracula: buildTheme("dracula"),
  "gruvbox-dark": buildTheme("gruvbox-dark"),
} satisfies Record<ThemeId, ThemeDefinition>;

export const DEFAULT_THEME_ID: ThemeId = "tokyo-night";

const THEME_ID_SET = new Set<string>(THEME_IDS);

export function isThemeId(id: string): id is ThemeId {
  return THEME_ID_SET.has(id);
}

/** Parse untrusted theme id strings from URL/storage. */
export function parseThemeId(raw: string | null | undefined): ThemeId | null {
  if (raw == null || raw === "") return null;
  return isThemeId(raw) ? raw : null;
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES[id];
}

export type ThemeFamilyGroup = {
  family: string;
  themes: ThemeDefinition[];
};

/** Themes in registry order, grouped by family for the settings picker. */
export function listThemesByFamily(): ThemeFamilyGroup[] {
  const groups: ThemeFamilyGroup[] = [];
  const indexByFamily = new Map<string, number>();
  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    const existing = indexByFamily.get(theme.family);
    if (existing === undefined) {
      indexByFamily.set(theme.family, groups.length);
      groups.push({ family: theme.family, themes: [theme] });
    } else {
      groups[existing]!.themes.push(theme);
    }
  }
  return groups;
}
