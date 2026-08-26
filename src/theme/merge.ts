import type { ThemeDefinition, ThemeOverride } from "./types";

/** Deep-merge a derived theme with optional hand overrides. */
export function mergeTheme(base: ThemeDefinition, override?: ThemeOverride): ThemeDefinition {
  if (!override) return base;

  return {
    id: base.id,
    label: override.label ?? base.label,
    family: override.family ?? base.family,
    threeUiMode: override.threeUiMode ?? base.threeUiMode,
    css: { ...base.css, ...override.css },
    map: {
      colors: { ...base.map.colors, ...override.map?.colors },
      background: override.map?.background ?? base.map.background,
      ocean: { ...base.map.ocean, ...override.map?.ocean },
      lights: { ...base.map.lights, ...override.map?.lights },
      decalUnscored: override.map?.decalUnscored ?? base.map.decalUnscored,
    },
  };
}
