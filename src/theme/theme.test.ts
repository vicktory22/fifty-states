import { beforeEach, describe, expect, it } from "vitest";
import { contrastRatio, deriveTheme, luminance } from "./derive";
import { commitTheme, hydrateThemeFromSources } from "./commit";
import { mergeTheme } from "./merge";
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  listThemesByFamily,
  parseThemeId,
  themeOverride,
  THEMES,
} from "./registry";
import { resolveThemeId } from "./resolve";
import { validateThemeSearch } from "./search";
import {
  createMemoryThemeStorage,
  readStoredThemeId,
  THEME_STORAGE_KEY,
  writeStoredThemeId,
} from "./storage";
import { THEME_IDS } from "./types";
import {
  getActiveTheme,
  getThemeId,
  resetThemeStore,
  setThemeId,
  themeStore,
} from "./theme-store";

const tokyoSeed = {
  bg: "#1a1b26",
  fg: "#c0caf5",
  accent: "#7aa2f7",
  muted: "#565f89",
  success: "#9ece6a",
  warning: "#e0af68",
  error: "#f7768e",
};

describe("deriveTheme", () => {
  it("maps seed into css + map tokens with dark mode for tokyo-like bg", () => {
    const theme = deriveTheme(tokyoSeed, {
      id: "tokyo-night",
      label: "Tokyo Night",
      family: "Tokyo Night",
    });

    expect(theme.threeUiMode).toBe("dark");
    expect(theme.css.ink).toBe("#1a1b26");
    expect(theme.css.paper).toBe("#c0caf5");
    expect(theme.css.line).toBe("#7aa2f7");
    expect(theme.css.right).toBe("#9ece6a");
    expect(theme.css.wrong).toBe("#f7768e");
    expect(theme.css.guessed).toBe("#e0af68");
    expect(theme.map.background).toBe(0x1a1b26);
    expect(theme.map.colors.selected).toBe(0x7aa2f7);
    expect(theme.map.colors.idle).not.toBe(theme.map.background);
    expect(theme.map.colors.right).not.toBe(theme.map.colors.wrong);
  });

  it("picks light threeUiMode for light backgrounds", () => {
    const theme = deriveTheme(
      {
        bg: "#eff1f5",
        fg: "#4c4f69",
        accent: "#1e66f5",
        muted: "#8c8fa1",
        success: "#40a02b",
        warning: "#df8e1d",
        error: "#d20f39",
      },
      { id: "catppuccin-latte", label: "Latte", family: "Catppuccin" },
    );
    expect(luminance("#eff1f5")).toBeGreaterThan(0.45);
    expect(theme.threeUiMode).toBe("light");
  });
});

describe("mergeTheme", () => {
  it("overrides nested css and map fields without dropping siblings", () => {
    const base = deriveTheme(tokyoSeed, {
      id: "tokyo-night",
      label: "Tokyo Night",
      family: "Tokyo Night",
    });
    const merged = mergeTheme(base, {
      css: { line: "#ffffff" },
      map: {
        colors: { idle: 0x112233 },
        background: 0x000001,
      },
    });

    expect(merged.css.line).toBe("#ffffff");
    expect(merged.css.ink).toBe(base.css.ink);
    expect(merged.map.colors.idle).toBe(0x112233);
    expect(merged.map.colors.hover).toBe(base.map.colors.hover);
    expect(merged.map.background).toBe(0x000001);
    expect(merged.map.ocean).toEqual(base.map.ocean);
  });
});

describe("registry", () => {
  it("registers every ThemeId exactly once", () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
    for (const id of THEME_IDS) {
      expect(getTheme(id).id).toBe(id);
      expect(isThemeId(id)).toBe(true);
      expect(parseThemeId(id)).toBe(id);
    }
    expect(isThemeId("not-a-theme")).toBe(false);
    expect(parseThemeId(null)).toBeNull();
    expect(parseThemeId("nope")).toBeNull();
    expect(DEFAULT_THEME_ID).toBe("tokyo-night");
    expect(themeOverride("tokyo-night")).toBeDefined();
    expect(themeOverride("catppuccin-mocha")).toBeDefined();
    expect(themeOverride("rose-pine-dawn")).toBeDefined();
    expect(getTheme("tokyo-night").map.colors.selected).toBe(0x7aa2f7);
    expect(getTheme("rose-pine-dawn").threeUiMode).toBe("light");

    const families = listThemesByFamily();
    expect(families.map((g) => g.family)).toEqual([
      "Tokyo Night",
      "Catppuccin",
      "Rosé Pine",
      "Nord",
      "One Dark",
      "Dracula",
      "Gruvbox",
    ]);
    expect(families.flatMap((g) => g.themes.map((t) => t.id))).toEqual([...THEME_IDS]);
  });
});

describe("resolveThemeId", () => {
  it("prefers URL, then storage, then fallback", () => {
    expect(resolveThemeId({ url: "nord", stored: "dracula" })).toBe("nord");
    expect(resolveThemeId({ url: "nope", stored: "dracula" })).toBe("dracula");
    expect(resolveThemeId({ url: "nope", stored: "also-nope" })).toBe("tokyo-night");
    expect(resolveThemeId({ url: null, stored: null, fallback: "one-dark" })).toBe("one-dark");
  });
});

describe("validateThemeSearch", () => {
  it("keeps valid theme ids and drops invalid", () => {
    expect(validateThemeSearch({ theme: "nord" })).toEqual({ theme: "nord" });
    expect(validateThemeSearch({ theme: "nope" })).toEqual({});
    expect(validateThemeSearch({})).toEqual({});
  });
});

describe("storage", () => {
  it("round-trips valid ids and ignores invalid", () => {
    const mem = createMemoryThemeStorage();
    expect(readStoredThemeId(mem)).toBeNull();

    writeStoredThemeId("gruvbox-dark", mem);
    expect(mem.getItem(THEME_STORAGE_KEY)).toBe("gruvbox-dark");
    expect(readStoredThemeId(mem)).toBe("gruvbox-dark");

    mem.setItem(THEME_STORAGE_KEY, "garbage");
    expect(readStoredThemeId(mem)).toBeNull();
  });
});

describe("themeStore", () => {
  let mem: ReturnType<typeof createMemoryThemeStorage>;

  beforeEach(() => {
    mem = createMemoryThemeStorage();
    resetThemeStore(mem);
  });

  it("setThemeId updates store and storage", () => {
    setThemeId("catppuccin-mocha", mem);
    expect(getThemeId()).toBe("catppuccin-mocha");
    expect(themeStore.state.id).toBe("catppuccin-mocha");
    expect(readStoredThemeId(mem)).toBe("catppuccin-mocha");
    expect(getActiveTheme().family).toBe("Catppuccin");
  });
});

describe("contrast smoke", () => {
  it("keeps paper/ink readable and muted/ink usable on every theme", () => {
    const failures: string[] = [];
    for (const id of THEME_IDS) {
      const { css } = getTheme(id);
      const paperInk = contrastRatio(css.paper, css.ink);
      const mutedInk = contrastRatio(css.muted, css.ink);
      if (paperInk < 4.5) failures.push(`${id} paper/ink ${paperInk.toFixed(2)}`);
      if (mutedInk < 3) failures.push(`${id} muted/ink ${mutedInk.toFixed(2)}`);
    }
    expect(failures).toEqual([]);
  });
});

describe("persistence checklist (automated)", () => {
  it("hydrates URL over storage, rewrites invalid URL, and commit updates writer", () => {
    const mem = createMemoryThemeStorage();
    resetThemeStore(mem);
    writeStoredThemeId("dracula", mem);

    const rewritten: string[] = [];
    const writer = {
      replaceThemeSearch: (theme: (typeof THEME_IDS)[number]) => {
        rewritten.push(theme);
      },
    };

    // Invalid / missing URL → storage (dracula), rewrite URL to match.
    expect(hydrateThemeFromSources(undefined, writer, mem)).toBe("dracula");
    expect(rewritten).toEqual(["dracula"]);
    expect(getThemeId()).toBe("dracula");
    expect(readStoredThemeId(mem)).toBe("dracula");

    // Valid URL wins over storage.
    rewritten.length = 0;
    expect(hydrateThemeFromSources("nord", writer, mem)).toBe("nord");
    expect(getThemeId()).toBe("nord");
    expect(readStoredThemeId(mem)).toBe("nord");
    // URL already matched — no rewrite required.
    expect(rewritten).toEqual([]);

    // Settings commit path.
    rewritten.length = 0;
    commitTheme("gruvbox-dark", writer, mem);
    expect(getThemeId()).toBe("gruvbox-dark");
    expect(readStoredThemeId(mem)).toBe("gruvbox-dark");
    expect(rewritten).toEqual(["gruvbox-dark"]);

    expect(validateThemeSearch({ theme: "not-a-theme" })).toEqual({});
  });
});
