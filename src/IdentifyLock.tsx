import { useEffect, useMemo, useRef, useState } from "react";
import { rankStates } from "./state-search";
import type { StateName } from "./states";

type Props = {
  resetKey: string;
  used: Set<string>;
  currentGuess?: StateName;
  onConfirm: (name: StateName) => void;
  onCancel: () => void;
  onClear: () => void;
};

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
    return rankStates(query);
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
