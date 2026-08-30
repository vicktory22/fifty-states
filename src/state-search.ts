import { CAPITAL_NAMES, STATE_ABBR, STATE_NAMES, type CapitalName, type StateName } from "./states";

/** Subsequence match with bonuses for consecutive runs, word starts, and earlier hits. */
function subsequenceScore(query: string, text: string): number | null {
  if (!query) return 0;
  let qi = 0;
  let score = 0;
  let run = 0;
  let first = -1;
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] !== query[qi]) {
      run = 0;
      continue;
    }
    if (first < 0) first = i;
    run += 1;
    score += 8 + run * 4;
    if (i === 0 || text[i - 1] === " ") score += 16;
    qi += 1;
  }
  if (qi < query.length) return null;
  return score - first * 0.6 - (text.length - query.length) * 0.15;
}

function typoScore(query: string, text: string): number | null {
  const exact = subsequenceScore(query, text);
  if (exact != null) return exact;

  let best: number | null = null;
  const consider = (s: number | null, penalty: number) => {
    if (s == null) return;
    const next = s - penalty;
    if (best == null || next > best) best = next;
  };

  for (let d = 0; d < query.length; d++) {
    consider(subsequenceScore(query.slice(0, d) + query.slice(d + 1), text), 24);
  }
  for (let i = 0; i < query.length - 1; i++) {
    if (query[i] === query[i + 1]) continue;
    const swapped = query.slice(0, i) + query[i + 1] + query[i] + query.slice(i + 2);
    consider(subsequenceScore(swapped, text), 16);
  }
  return best;
}

/** Fuzzy score against a display name (no USPS abbr bonus). */
function nameFuzzyScore(query: string, name: string): number | null {
  const text = name.toLowerCase();
  const compact = text.replaceAll(" ", "");

  if (text.startsWith(query)) return 1200 + query.length * 12 - text.length;
  for (const word of text.split(" ")) {
    if (word.startsWith(query)) return 1000 + query.length * 12 - word.length;
  }
  if (compact.startsWith(query)) return 900 + query.length * 8;

  const at = text.indexOf(query);
  if (at >= 0) return 600 - at * 8 + query.length * 10;

  const compactAt = compact.indexOf(query);
  if (compactAt >= 0) return 520 - compactAt * 8 + query.length * 8;

  return typoScore(query, text);
}

function stateFuzzyScore(query: string, name: StateName): number | null {
  const abbr = STATE_ABBR[name].toLowerCase();
  if (query.length === 2 && query === abbr) return 2000;
  return nameFuzzyScore(query, name);
}

function rankNames<T extends string>(
  query: string,
  names: readonly T[],
  scoreOf: (q: string, name: T) => number | null,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...names];
  const ranked: { name: T; score: number }[] = [];
  for (const name of names) {
    const score = scoreOf(q, name);
    if (score === null) continue;
    ranked.push({ name, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.map((row) => row.name);
}

/** Rank official state names for the identify picker. */
export function rankStates(query: string): StateName[] {
  return rankNames(query, STATE_NAMES, stateFuzzyScore);
}

/** Rank official capital city names for the identify picker. */
export function rankCapitals(query: string): CapitalName[] {
  return rankNames(query, CAPITAL_NAMES, nameFuzzyScore);
}
