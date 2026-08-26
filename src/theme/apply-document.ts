import type { ThemeDefinition } from "./types";

/** Push theme tokens onto `<html>` as data-theme + CSS variables. */
export function applyThemeToDocument(theme: ThemeDefinition): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.dataset.theme = theme.id;
  const { css } = theme;
  root.style.setProperty("--ink", css.ink);
  root.style.setProperty("--panel", css.panel);
  root.style.setProperty("--line", css.line);
  root.style.setProperty("--line-dim", css.lineDim);
  root.style.setProperty("--paper", css.paper);
  root.style.setProperty("--muted", css.muted);
  root.style.setProperty("--guessed", css.guessed);
  root.style.setProperty("--right", css.right);
  root.style.setProperty("--wrong", css.wrong);
}
