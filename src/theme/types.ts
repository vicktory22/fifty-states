export const THEME_IDS = [
  "tokyo-night",
  "tokyo-night-storm",
  "tokyo-night-day",
  "catppuccin-latte",
  "catppuccin-frappe",
  "catppuccin-macchiato",
  "catppuccin-mocha",
  "rose-pine",
  "rose-pine-moon",
  "rose-pine-dawn",
  "nord",
  "one-dark",
  "dracula",
  "gruvbox-dark",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type EditorSeed = {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
};

export type ThemeCssTokens = {
  ink: string;
  panel: string;
  line: string;
  lineDim: string;
  paper: string;
  muted: string;
  guessed: string;
  right: string;
  wrong: string;
};

export type ThemeMapColors = {
  idle: number;
  hover: number;
  selected: number;
  guessed: number;
  right: number;
  wrong: number;
  edgeIdle: number;
  edgeSelected: number;
  edgeGuessed: number;
  edgeRight: number;
  edgeWrong: number;
};

export type ThemeMapTokens = {
  colors: ThemeMapColors;
  background: number;
  ocean: { deep: number; mid: number; fog: number };
  lights: {
    hemiSky: number;
    hemiGround: number;
    key: number;
    rim: number;
    lock: number;
  };
  decalUnscored: number;
};

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  family: string;
  threeUiMode: "dark" | "light";
  css: ThemeCssTokens;
  map: ThemeMapTokens;
};

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  family: string;
};

/** Partial overlay applied after derivation. */
export type ThemeOverride = {
  label?: string;
  family?: string;
  threeUiMode?: "dark" | "light";
  css?: Partial<ThemeCssTokens>;
  map?: {
    colors?: Partial<ThemeMapColors>;
    background?: number;
    ocean?: Partial<ThemeMapTokens["ocean"]>;
    lights?: Partial<ThemeMapTokens["lights"]>;
    decalUnscored?: number;
  };
};
