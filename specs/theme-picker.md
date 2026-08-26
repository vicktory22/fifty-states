# Feature: Theme picker (editor-theme presets)

**Status:** Implemented (Slices 1–5); browser smoke checklist remains for human pass  
**Type:** Feature plan  
**Effort:** L (light XL)  
**Approved:** 2026-03-29

## Problem Statement

**Who:** Players of Fifty States  
**What:** The app only offers one hard-coded “forest night” look (CSS tokens + Three.js palette/lights).  
**Why it matters:** Visual variety via recognizable editor-theme aesthetics; shareable looks via URL; preference remembered locally.  
**Evidence:** Current look is fixed in `src/index.css`, `src/UsMap.tsx`, and `DiagnosticsPanel mode="dark"`; no theme store, URL param, or settings surface.

## Proposed Solution

Ship a curated catalog of ~12–14 popular editor-theme presets. Each preset is a full **game theme** covering UI chrome, 3D map treatment, and ThreeUI light/dark mode.

Use a **hybrid mapper**: derive game tokens from each theme’s semantic editor colors, then deep-merge hand overrides. Polish **Tokyo Night** (default) and a couple of hero themes more carefully; leave the rest mostly derived until contrast/coherence requires overrides.

Theme id resolves **URL `?theme=` → localStorage → `tokyo-night`**. Changing theme updates the store, `data-theme` on `<html>`, localStorage, and the URL search param.

Settings is a **full-screen overlay route**. The WebGL map stays mounted in a parent layout so camera/scene state survives.

Fonts stay **Instrument Serif + IBM Plex Mono** for all themes in v1.

## Discovery

**Explored:** `src/index.css`, `src/App.tsx`, `src/UsMap.tsx`, `src/quiz-store.ts`, `src/routes/*`, ThreeUI `mode` API

**Key findings:**

- CSS already has a small token set (`--ink`, `--panel`, `--line`, …) plus many hardcoded hex/rgba values.
- Map colors/lights/ocean/background are hardcoded in `UsMap.tsx` (`COLORS` + scene setup).
- Quiz state uses TanStack Store; no URL search params or localStorage yet.
- Only routes today: `__root` + `/`.
- ThreeUI components expose `mode: "dark" | "light"` only—not arbitrary palettes.

## Scope & Deliverables

| ID  | Deliverable                                                            | Effort | Depends On |
| --- | ---------------------------------------------------------------------- | ------ | ---------- |
| D1  | Theme types + editor→game deriver + override merge                     | M      | —          |
| D2  | Curated preset registry (~12–14 ids) + Tokyo Night default polish      | L      | D1         |
| D3  | Theme store: resolve URL→storage→default; `setTheme` syncs both        | M      | D1         |
| D4  | Layout route: persistent map shell; `/settings` overlay                | M      | —          |
| D5  | CSS tokens via `data-theme` / vars; migrate hardcoded chrome colors    | M      | D2         |
| D6  | `UsMap` live recolor from theme (palette, lights, ocean, bg, decals)   | L      | D2, D3     |
| D7  | Settings UI: swatch/list picker, live preview, back-to-game            | M      | D3, D4     |
| D8  | Contrast checks + unit tests (resolve, invalid theme, merge overrides) | S      | D2, D3     |

### Vertical slices (suggested build order)

1. D1 + D3 — theme identity + persistence without UI polish
2. D4 — layout/outlet so map can persist
3. D2 + D5 + D6 — visible themes on chrome + map
4. D7 — settings overlay picker
5. D8 — harden

## Tasks

Checkboxes are implementation units. Do slices in order; within a slice, top-to-bottom.

### Slice 1 — Theme identity + persistence (D1, D3)

- [x] **T1** Add `src/theme/types.ts` — `ThemeId`, `EditorSeed`, `ThemeCssTokens`, `ThemeMapTokens`, `ThemeDefinition`, override partial type
- [x] **T2** Add `src/theme/derive.ts` — `deriveTheme(seed, meta) → ThemeDefinition` (css + map + `threeUiMode` from luminance)
- [x] **T3** Add `src/theme/merge.ts` — deep-merge derived theme with per-id overrides
- [x] **T4** Add `src/theme/registry.ts` — seeds for all 14 ids + empty/partial `overrides` map; export `THEMES`, `isThemeId`, `getTheme`
- [x] **T5** Add `src/theme/storage.ts` — read/write `fifty-states.theme`; validate with `isThemeId`
- [x] **T6** Add `src/theme/resolve.ts` — `resolveThemeId({ url, stored, fallback: "tokyo-night" })`
- [x] **T7** Add `src/theme/theme-store.ts` — TanStack store holding active `ThemeId`; `setThemeId` / selectors; no router coupling yet
- [x] **T8** Unit tests: `derive` invariants, `merge`, `resolve` order, invalid id, storage round-trip (`*.test.ts`)

### Slice 2 — Persistent map layout (D4)

- [x] **T9** Introduce `src/routes/_stage.tsx` layout that mounts `UsMap` (wired to quiz store as today) + `<Outlet />`
- [x] **T10** Move current game HUD from `App`/`routes/index` into `src/routes/_stage/index.tsx` (behavior unchanged)
- [x] **T11** Add `src/routes/_stage/settings.tsx` stub overlay route (scrim + “Settings” + back link to `/`)
- [x] **T12** Confirm navigating `/` ↔ `/settings` does **not** recreate the WebGL canvas/scene — pathless `_stage` parent keeps `UsMap` mounted (both children `getParentRoute → StageRoute` in `routeTree.gen.ts`); smoke-check in browser when you run the app
- [x] **T13** Add HUD entry control (gear / “Theme”) linking to `/settings`

### Slice 3 — Apply themes to chrome + map (D2, D5, D6)

- [x] **T14** Fill registry seeds for all 14 themes; hand-polish overrides for `tokyo-night` (required), plus 1–2 heroes (e.g. mocha, rose-pine-dawn)
- [x] **T15** Apply active theme on the client: set `document.documentElement.dataset.theme` when theme changes
- [x] **T16** Expand CSS variables; migrate hardcoded chrome colors in `index.css` to vars driven by `html[data-theme]` **or** inline vars from store (pick one approach and stick to it — prefer setting CSS vars from JS from `ThemeDefinition.css` so we don’t maintain 14 CSS blocks)
- [x] **T17** Refactor `UsMap` to take map tokens (or full theme) as props; remove module-level `COLORS` hardcoding from the live path
- [x] **T18** On theme change, update existing scene in place: background, clear color, ocean uniforms, lights, state palette via existing `apply` path — **no full remount**
- [x] **T19** Wire `DiagnosticsPanel mode={theme.threeUiMode}`
- [x] **T20** Sync theme with URL search param `theme`: read on load (URL → storage → default), `setTheme` uses router `navigate({ search, replace: true })` + storage write

### Slice 4 — Settings picker UI (D7)

- [x] **T21** Settings overlay layout: dimmed scrim, panel, back control, short attribution line
- [x] **T22** Theme list/grid grouped by `family` with label + swatches (bg / accent / success)
- [x] **T23** Selecting a row calls `setTheme`; highlight active id; map under scrim updates live
- [x] **T24** Preserve `?theme=` when entering/leaving settings

### Slice 5 — Harden (D8)

- [x] **T25** Contrast smoke tests on `css.paper` vs `css.ink` / `css.muted` vs `css.ink` for every registry theme; fix via overrides — deriver `ensureContrast` (paper ≥4.5, muted ≥3)
- [x] **T26** Manual checklist pass: all 14 themes, refresh persistence, invalid `?theme=`, settings map persistence — automated coverage in `theme.test.ts`; browser smoke list below
- [x] **T27** Update README with theme/settings usage one-liner if needed

#### Browser smoke checklist (run with `pnpm dev`)

- [ ] Default load → Tokyo Night chrome + map
- [ ] `/settings`: click through all 13 themes; map recolors without remounting
- [ ] Refresh keeps the last theme
- [ ] `/?theme=one-dark` applies One Dark and persists
- [ ] `/?theme=nope` falls back safely
- [ ] Theme ↔ Back preserves `?theme=`

### Out of scope for this task list

- Per-theme fonts, system preference, custom editor, verdant preset, quiz state in URL

## Non-Goals (Explicit Exclusions)

- Custom / user-authored color editor
- System-preference auto theme switching
- Per-theme font pairing
- Runtime import of full VS Code theme JSON / syntax scopes
- Exhaustive marketplace catalog
- Preserving the original verdant look as a named preset
- Sharing quiz progress in the URL (theme param only)

## Data Model

```ts
type ThemeId =
  | "tokyo-night"
  | "tokyo-night-storm"
  | "tokyo-night-day"
  | "catppuccin-latte"
  | "catppuccin-frappe"
  | "catppuccin-macchiato"
  | "catppuccin-mocha"
  | "rose-pine"
  | "rose-pine-moon"
  | "rose-pine-dawn"
  | "one-dark"
  | "dracula"
  | "gruvbox-dark";

type EditorSeed = {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
};

type ThemeCssTokens = {
  ink: string;
  panel: string;
  line: string;
  lineDim: string;
  paper: string;
  muted: string;
  guessed: string;
  right: string;
  wrong: string;
  // Additional migrated chrome vars as needed (dock bg, meter glow, etc.)
};

type ThemeMapTokens = {
  colors: {
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

type ThemeDefinition = {
  id: ThemeId;
  label: string;
  family: string;
  threeUiMode: "dark" | "light";
  css: ThemeCssTokens;
  map: ThemeMapTokens;
};

// Hybrid pipeline: deepMerge(derive(seed), overrides[id] ?? {})
```

### Persistence contract

| Source       | Key / param          | Behavior                                                          |
| ------------ | -------------------- | ----------------------------------------------------------------- |
| URL          | `?theme=<ThemeId>`   | Wins on load when valid; written on change (`replace`)            |
| localStorage | `fifty-states.theme` | Used when URL absent/invalid; written when URL wins or user picks |
| Default      | `tokyo-night`        | Fallback when both missing/invalid                                |

**Resolve order:** valid URL id → localStorage if valid → `tokyo-night`.

**Invalid URL id:** ignore; fall back to storage/default; do not crash. Optionally rewrite URL to canonical resolved id.

### Application contract

- Set `data-theme="<ThemeId>"` on `<html>` (or root element) for CSS.
- Pass active `ThemeDefinition` (or map tokens) into `UsMap`; update materials/lights/ocean/background **in place** (no full scene remount on theme change).
- Map `DiagnosticsPanel` `mode` to `theme.threeUiMode`.

## API / Interface Contract

```ts
// theme-store (sketch)
function getResolvedThemeId(searchTheme: string | undefined): ThemeId;
function setTheme(id: ThemeId): void; // store + storage + URL + data-theme
function useTheme(): ThemeDefinition;
```

Settings route:

- Entry from game HUD (gear / “Theme”) → `/settings` (preserve `theme` search param).
- Exit → `/`.
- Picker calls `setTheme(id)`; map under overlay should reflect changes live.

## Routing

```
src/routes/
  __root.tsx
  _stage.tsx           // persistent UsMap + theme apply + <Outlet />
  _stage/index.tsx     // game HUD (current App chrome)
  _stage/settings.tsx  // full-screen overlay picker
```

Overlay should use a **dimmed scrim with live map peek** so theme changes are visible while choosing (product default; opaque sheet is the alternative if peek is too noisy).

## Acceptance Criteria

- [x] Default load with no URL/storage → Tokyo Night on UI + map (code + hydrate tests)
- [x] `/settings` opens without disposing/recreating the WebGL map (pathless layout)
- [x] Selecting a preset updates chrome + map immediately (`commitTheme` + live UsMap)
- [x] Refresh keeps the chosen theme (storage) — covered by storage/hydrate tests; confirm in browser
- [x] `/?theme=one-dark` applies One Dark and persists it (hydrate test)
- [x] `/?theme=not-a-theme` falls back safely; no crash (`validateThemeSearch`)
- [x] Shared link with `?theme=` reproduces that theme for a new visitor (URL-first resolve)
- [x] Text/controls readable on every preset (contrast smoke ≥4.5 / ≥3)
- [x] `DiagnosticsPanel` mode follows `threeUiMode`

## Test Strategy

| Layer  | What                                                                  | How                     |
| ------ | --------------------------------------------------------------------- | ----------------------- |
| Unit   | Resolve order, invalid id, override merge, registry completeness      | vitest                  |
| Unit   | Deriver invariants (idle ≠ background, right ≠ wrong, contrast smoke) | vitest                  |
| Manual | Map coherence + contrast per preset via settings overlay              | click-through checklist |

## Risks & Mitigations

| Risk                          | Likelihood | Impact | Mitigation                                                      |
| ----------------------------- | ---------- | ------ | --------------------------------------------------------------- |
| Derived map colors look muddy | High       | Med    | Hybrid overrides; polish Tokyo Night + 2 heroes first           |
| Theme change remounts `UsMap` | Med        | High   | Reactive theme input; mutate materials/lights in existing scene |
| Layout refactor breaks game   | Med        | Med    | Slice layout+outlet with current HUD before settings UI         |
| Naming/attribution concerns   | Low        | Med    | Public palette values; credit families in settings footer       |
| Light-theme contrast failures | Med        | Med    | Assert css token contrast; override until pass                  |

## Trade-offs Made

| Chose                        | Over                          | Because                                     |
| ---------------------------- | ----------------------------- | ------------------------------------------- |
| Hybrid derive + overrides    | Full hand art / pure derive   | Catalog ships; default can still look great |
| Overlay settings route       | Modal-only / hard nav remount | “Settings page” + map stays alive           |
| URL then storage             | Storage-only                  | Shareable looks                             |
| Shared fonts                 | Per-theme typography          | YAGNI for v1                                |
| Drop original verdant preset | Keep as named theme           | Tokyo Night default + editor catalog        |

## Open Questions

- [x] Catalog size → curated ~12–14
- [x] Settings shape → overlay route, map stays mounted
- [x] Default → `tokyo-night`
- [x] Mapping → hybrid (C)
- [ ] Settings chrome: dimmed scrim + live map peek (recommended) vs opaque sheet → Owner: implementer default to scrim unless UX says otherwise
- [ ] Exact id list as specified vs swap One Dark / Dracula / Gruvbox → Owner: implementer may swap within same count
- [ ] Attribution line in settings (“palettes inspired by …”) → Owner: yes, recommended

## Success Metrics

- Player can switch among curated editor themes from settings without map reload
- Theme survives refresh and round-trips through share URL
- Default (Tokyo Night) feels coherent on both HUD and map

## Recommendation Summary

Implement a hybrid editor-theme catalog with URL-first persistence and a persistent-map settings overlay. Prioritize deriver + Tokyo Night polish, then wire CSS/`UsMap`, then ship the settings picker.
