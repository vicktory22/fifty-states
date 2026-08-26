import type { EditorSeed, ThemeDefinition, ThemeMeta } from "./types";

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, "");
  if (h.length !== 3 && h.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, "0")).join("")}`;
}

function toHexNum(rgb: Rgb): number {
  return (clampByte(rgb.r) << 16) | (clampByte(rgb.g) << 8) | clampByte(rgb.b);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Relative luminance (sRGB), 0–1. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}, ${alpha})`;
}

/** Mix `from` toward `toward` until contrast vs `against` reaches `minRatio`. */
function ensureContrast(from: Rgb, toward: Rgb, againstHex: string, minRatio: number): Rgb {
  let color = from;
  let t = 0;
  while (contrastRatio(toHex(color), againstHex) < minRatio && t < 1) {
    t += 0.05;
    color = mix(from, toward, t);
  }
  return color;
}

/**
 * Map an editor semantic seed onto full game chrome + map tokens.
 * Hand overrides (via merge) refine muddy results later.
 */
export function deriveTheme(seed: EditorSeed, meta: ThemeMeta): ThemeDefinition {
  const bg = parseHex(seed.bg);
  const fg = parseHex(seed.fg);
  const accent = parseHex(seed.accent);
  const mutedSeed = parseHex(seed.muted);
  const success = parseHex(seed.success);
  const warning = parseHex(seed.warning);
  const error = parseHex(seed.error);

  const inkHex = toHex(bg);
  const paper = ensureContrast(fg, { r: 255, g: 255, b: 255 }, inkHex, 4.5);
  // If still short on light themes, pull toward black instead.
  const paperFinal =
    contrastRatio(toHex(paper), inkHex) >= 4.5
      ? paper
      : ensureContrast(fg, { r: 0, g: 0, b: 0 }, inkHex, 4.5);
  const muted = ensureContrast(mutedSeed, paperFinal, inkHex, 3);

  const isLight = luminance(seed.bg) > 0.45;
  const idle = mix(bg, accent, isLight ? 0.18 : 0.28);
  const hover = mix(bg, accent, isLight ? 0.32 : 0.42);
  const edgeIdle = mix(accent, fg, 0.35);
  const edgeSelected = mix(fg, accent, 0.15);
  const edgeGuessed = mix(warning, fg, 0.25);
  const edgeRight = mix(success, fg, 0.3);
  const edgeWrong = mix(error, fg, 0.25);

  const oceanDeep = mix(bg, accent, isLight ? 0.08 : 0.12);
  const oceanMid = mix(bg, accent, isLight ? 0.22 : 0.32);
  const oceanFog = mix(bg, { r: 0, g: 0, b: 0 }, isLight ? 0.06 : 0.15);

  const hemiSky = mix(fg, accent, 0.2);
  const hemiGround = mix(bg, { r: 0, g: 0, b: 0 }, isLight ? 0.2 : 0.45);
  const key = mix(fg, warning, 0.15);
  const rim = mix(accent, fg, 0.2);
  const lock = mix(success, accent, 0.25);

  return {
    id: meta.id,
    label: meta.label,
    family: meta.family,
    threeUiMode: isLight ? "light" : "dark",
    css: {
      ink: inkHex,
      panel: rgba(mix(bg, fg, isLight ? 0.06 : 0.1), isLight ? 0.72 : 0.62),
      line: toHex(accent),
      lineDim: rgba(accent, 0.28),
      paper: toHex(paperFinal),
      muted: toHex(muted),
      guessed: toHex(warning),
      right: toHex(success),
      wrong: toHex(error),
    },
    map: {
      colors: {
        idle: toHexNum(idle),
        hover: toHexNum(hover),
        selected: toHexNum(accent),
        guessed: toHexNum(warning),
        right: toHexNum(success),
        wrong: toHexNum(error),
        edgeIdle: toHexNum(edgeIdle),
        edgeSelected: toHexNum(edgeSelected),
        edgeGuessed: toHexNum(edgeGuessed),
        edgeRight: toHexNum(edgeRight),
        edgeWrong: toHexNum(edgeWrong),
      },
      background: toHexNum(bg),
      ocean: {
        deep: toHexNum(oceanDeep),
        mid: toHexNum(oceanMid),
        fog: toHexNum(oceanFog),
      },
      lights: {
        hemiSky: toHexNum(hemiSky),
        hemiGround: toHexNum(hemiGround),
        key: toHexNum(key),
        rim: toHexNum(rim),
        lock: toHexNum(lock),
      },
      decalUnscored: toHexNum(mix(fg, warning, 0.12)),
    },
  };
}
