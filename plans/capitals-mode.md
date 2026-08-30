# Capitals mode

## Context

Today the quiz is state-shape identification: click a region, type the state name (`IdentifyLock` + `rankStates`), then check. Add a second mode where the player names each state's **capital city** instead (same map click target).

## Decisions

- **Switch UI:** HUD toggle (States | Capitals).
- **Switch gate:** if a game is in progress and the player clicks the other mode, show an alert that they must cancel/reset the current game first — do **not** auto-switch or auto-reset.
- **Persistence:** remember mode across refresh (`localStorage`, same pattern as theme storage).
- **Map labels:** guessed capital name only (same decal path as state names).
- **Uniqueness:** each capital usable once (“used” in the picker).
- **Picker:** dropdown of official capital names with the same fuzzy typeahead as states.

## Approach

### Data

Add to `src/states.ts`:

- `STATE_CAPITALS` satisfies `Record<StateName, string>` (official capital city per state)
- `CAPITAL_NAMES` derived unique list + `CapitalName` type
- assert uniqueness in a unit test (all 50 capitals are distinct today)

### Mode + store

Extend `quizStore` (`src/quiz-store.ts`):

- `mode: "states" | "capitals"`
- Hydrate `mode` from `localStorage` key e.g. `fifty-states.quiz-mode` (mirror `src/theme/storage.ts`: read/write helpers, memory storage for tests)
- `requestMode(next)`:
  - if `next === mode` → no-op
  - if quiz **in progress** → set a small UI flag / return `"blocked"` so HUD can show the alert dialog
  - else → set mode, persist, ensure board is clean
- **In progress** means anything other than a fresh board: `pick != null`, any guesses, `scored != null`, `firstCheckFailed`, or `result != null`
- Keep map `truth` as `Record<id, StateName>` from clicks
- Keep `guesses` as labels for the active mode (`StateName` or capital string)
- `grade`:
  - states: `guesses[id] === truth[id]`
  - capitals: `guesses[id] === STATE_CAPITALS[truth[id]]`
- Miss list / score sheet: show guess → correct **label for the mode** (state name or capital)
- `resetQuiz` clears progress but **keeps** `mode`

### Search + picker

- Reuse fuzzy helpers in `src/state-search.ts`; add `rankCapitals(query)` over `CAPITAL_NAMES` (abbr bonus N/A — score on city name only, same subsequence/typo behavior)
- Generalize `IdentifyLock` to take `items`, `rank`, title/kicker (“Which state?” / “Which capital?”), still enforcing `used`

### HUD

- Toggle control in main HUD (`src/App.tsx`)
- Mode-aware title/lede (“Label every state” vs capitals framing; dock notes)
- Blocked-switch dialog (same card/dialog pattern as miss/perfect — not `window.alert`): copy along the lines of “Finish or reset the current quiz before switching modes.” + dismiss; point them at **Reset**
- After **Reset**, toggle switches immediately and persists

### Map

- `UsMap` unchanged: decals already render whatever string is in `guesses`

## Files to modify

- `src/states.ts` — capitals dataset
- `src/state-search.ts` — `rankCapitals`
- `src/quiz-store.ts` — mode, persistence hooks, grading, switch gate
- new tiny `src/quiz-mode-storage.ts` (or colocated in quiz-store) — localStorage helpers
- `src/IdentifyLock.tsx` — generic options + copy
- `src/App.tsx` — toggle, copy, blocked dialog
- `src/routes/_stage.tsx` — only if wiring changes (likely none)
- Tests: `states` / `state-search` / `quiz-store` (+ storage)

## Reuse

- Theme storage pattern: `src/theme/storage.ts`
- Quiz loop: `checkAnswers` / `revealHelp` / `resetQuiz` in `src/quiz-store.ts`
- Picker UX: `src/IdentifyLock.tsx`
- Fuzzy rank: `src/state-search.ts` (`subsequenceScore` / `typoScore` style)
- Map select: `selectState` from `_stage.tsx` + `UsMap`

## Steps

- [x] Add `STATE_CAPITALS` + uniqueness/length tests
- [x] Add quiz-mode localStorage helpers + hydrate on store init
- [x] Add `mode` + `requestMode` / in-progress gate + capitals `grade`
- [x] Add `rankCapitals` + tests
- [x] Generalize `IdentifyLock`; wire mode-specific list/copy from `App`
- [x] HUD toggle + blocked-switch dialog + mode copy
- [x] Extend `quiz-store` tests for mode switch, persistence (memory storage), capitals grading
- [x] Manual pass both modes

## Verification

- Capitals: click → capital dropdown → capital decal → check/help/reset behave correctly
- States mode unchanged
- Clicking the other mode mid-quiz shows blocked dialog; mode unchanged until Reset, then switch works
- Refresh restores last mode; progress still resets only via Reset (progress not persisted — mode only)
- Used capitals excluded like used states
- `pnpm test` green
