import { useEffect, useMemo, useRef, useState } from "react";
import { STATE_ABBR, STATE_NAMES, type StateName } from "./states";

type Props = {
  resetKey: string;
  used: Set<string>;
  currentGuess?: StateName;
  onConfirm: (name: StateName) => void;
  onCancel: () => void;
  onClear: () => void;
};

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
    const swapped =
      query.slice(0, i) + query[i + 1] + query[i] + query.slice(i + 2);
    consider(subsequenceScore(swapped, text), 16);
  }
  return best;
}

/** Rank USPS codes, name/word prefixes, then fuzzy typos. */
function fuzzyScore(query: string, name: StateName): number | null {
  const text = name.toLowerCase();
  const abbr = STATE_ABBR[name].toLowerCase();
  const compact = text.replaceAll(" ", "");

  if (query.length === 2 && query === abbr) return 2000;
  if (text.startsWith(query)) return 1200 + query.length * 12 - text.length;
  for (const word of text.split(" ")) {
    if (word.startsWith(query)) return 1000 + query.length * 12 - word.length;
  }
  if (compact.startsWith(query)) return 900 + query.length * 8;

  const at = text.indexOf(query);
  if (at >= 0) return 600 - at * 8 + query.length * 10;

  const compactAt = compact.indexOf(query);
  if (compactAt >= 0) return 520 - compactAt * 8 + query.length * 8;

  const fuzzy = typoScore(query, text);
  if (fuzzy == null) return null;
  return fuzzy;
}

export function IdentifyLock({
  resetKey,
  used,
  currentGuess,
  onConfirm,
  onCancel,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState(currentGuess ?? "");
  const [hi, setHi] = useState(0);

  useEffect(() => {
    setQuery(currentGuess ?? "");
    setHi(0);
    inputRef.current?.focus();
  }, [resetKey, currentGuess]);

  useEffect(() => {
    function onDocKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onCancel();
    }
    window.addEventListener("keydown", onDocKey, true);
    return () => window.removeEventListener("keydown", onDocKey, true);
  }, [onCancel]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...STATE_NAMES];
    const ranked: { name: StateName; score: number }[] = [];
    for (const name of STATE_NAMES) {
      const score = fuzzyScore(q, name);
      if (score === null) continue;
      ranked.push({ name, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked.map((row) => row.name);
  }, [query]);

  function isTaken(name: StateName): boolean {
    return used.has(name) && name !== currentGuess;
  }

  const highlighted = matches[hi] ?? matches[0];

  useEffect(() => {
    if (highlighted && isTaken(highlighted)) {
      const next = matches.findIndex((n) => !isTaken(n));
      if (next >= 0) setHi(next);
    }
  }, [highlighted, matches, currentGuess, used]);

  useEffect(() => {
    const row = activeRef.current;
    const list = row?.closest(".lock-list");
    if (!row || !list) return;
    const rowBox = row.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    if (rowBox.bottom > listBox.bottom) list.scrollTop += rowBox.bottom - listBox.bottom;
    if (rowBox.top < listBox.top) list.scrollTop -= listBox.top - rowBox.top;
  }, [hi, highlighted]);

  function confirm(name?: StateName) {
    const pick = name ?? highlighted;
    if (!pick || isTaken(pick)) return;
    onConfirm(pick);
  }

  function step(from: number, dir: 1 | -1): number {
    if (matches.length === 0) return 0;
    for (let n = 1; n <= matches.length; n++) {
      const i = (from + dir * n + matches.length * n) % matches.length;
      const name = matches[i];
      if (name && !isTaken(name)) return i;
    }
    return from;
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onCancel();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      setHi((i) => step(i, 1));
      e.preventDefault();
    }
    if (e.key === "ArrowUp") {
      setHi((i) => step(i, -1));
      e.preventDefault();
    }
    if (e.key === "Enter") {
      confirm();
      e.preventDefault();
    }
  }

  return (
    <div
      className="lock-veil"
      role="dialog"
      aria-label="Identify this state"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="lock-panel">
        <p className="kicker">Which state?</p>
        <div className={`lock-field${currentGuess ? " has-clear" : ""}`}>
          <input
            ref={inputRef}
            value={query}
            placeholder="Type a name"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              setHi(0);
            }}
            onKeyDown={onKey}
          />
          {currentGuess ? (
            <button className="lock-field-clear" type="button" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
        <ul className="lock-list">
          {matches.length === 0 ? (
            <li className="lock-empty">No match</li>
          ) : (
            matches.map((name, i) => {
              const taken = isTaken(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    ref={name === highlighted && !taken ? activeRef : undefined}
                    className={`lock-row${name === highlighted && !taken ? " is-active" : ""}${taken ? " is-taken" : ""}`}
                    disabled={taken}
                    onMouseEnter={() => {
                      if (!taken) setHi(i);
                    }}
                    onClick={() => confirm(name)}
                  >
                    {name}
                    {taken ? <em>used</em> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
