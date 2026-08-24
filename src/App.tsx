import { DiagnosticsPanel } from "@designcodeio/threeui";
import { useSelector } from "@tanstack/react-store";
import { IdentifyLock } from "./IdentifyLock";
import {
  cancelPick,
  checkAnswers,
  clearGuess,
  confirmGuess,
  quizStore,
  resetQuiz,
  selectState,
} from "./quiz-store";
import { UsMap } from "./UsMap";

export function App() {
  const guesses = useSelector(quizStore, (s) => s.guesses);
  const truth = useSelector(quizStore, (s) => s.truth);
  const pick = useSelector(quizStore, (s) => s.pick);
  const scored = useSelector(quizStore, (s) => s.scored);
  const usedNames = useSelector(quizStore, (s) => new Set(Object.values(s.guesses)));

  const guessedCount = Object.keys(guesses).length;
  const allGuessed = guessedCount === 50;
  const score = scored ? Object.values(scored).filter(Boolean).length : null;

  const misses = scored
    ? Object.entries(scored)
        .filter(([, ok]) => !ok)
        .map(([id]) => ({ guess: guesses[id], actual: truth[id] }))
    : [];

  return (
    <div className="stage">
      <UsMap
        guesses={guesses}
        selectedId={pick?.id ?? null}
        scored={scored}
        onSelect={selectState}
      />

      <header className="hud hud-tl">
        <div className="kicker">United States</div>
        <h1>Label every state.</h1>
        <p className="lede">
          Click a state, type its name. Drag to pan, scroll to zoom. Fill the map, then check your
          answers.
        </p>
      </header>

      <div className="hud hud-bm">
        <div className="stats-dock">
          <div className="kicker">Current stats</div>
          <div className="stat">
            <span>Named</span>
            <b>
              {guessedCount}
              <span className="dim"> / 50</span>
            </b>
          </div>
          <div className="meter" aria-hidden>
            <i style={{ width: `${(guessedCount / 50) * 100}%` }} />
          </div>
          {score !== null && (
            <p className="stats-score">
              {score} correct
              {score < 50 ? ` · ${50 - score} missed` : " · clean sweep"}
            </p>
          )}
        </div>
      </div>

      <footer className="hud hud-bl">
        <div className="dock">
          <div className="dock-stats">
            <div className="stat">
              <span>Named</span>
              <b>
                {guessedCount}
                <span className="dim"> / 50</span>
              </b>
            </div>
            <div className="meter" aria-hidden>
              <i style={{ width: `${(guessedCount / 50) * 100}%` }} />
            </div>
          </div>
          <div className="dock-main">
            <button
              className="btn primary"
              type="button"
              disabled={!allGuessed || Boolean(scored)}
              onClick={checkAnswers}
            >
              Check answers
            </button>
            <button className="btn ghost" type="button" onClick={resetQuiz}>
              Reset
            </button>
          </div>
          <p className="dock-note">
            {scored
              ? "Answers checked"
              : allGuessed
                ? "Ready to check"
                : "Name all 50 states to check"}
          </p>
          <ul className="dock-keys">
            <li>
              <kbd>drag</kbd>
              <span>pan</span>
            </li>
            <li>
              <kbd>scroll</kbd>
              <span>zoom</span>
            </li>
            <li>
              <kbd>click</kbd>
              <span>name</span>
            </li>
          </ul>
        </div>
      </footer>

      {score !== null && (
        <aside className="hud hud-br score-sheet">
          <strong>{score} / 50</strong>
          {score === 50 ? "Perfect survey." : `${50 - score} misfires.`}
          {misses.length > 0 && (
            <ul>
              {misses.map((m) => (
                <li key={m.actual}>
                  {m.guess} → {m.actual}
                </li>
              ))}
            </ul>
          )}
          <div className="diag">
            <DiagnosticsPanel mode="dark" />
          </div>
        </aside>
      )}

      {pick && (
        <IdentifyLock
          resetKey={pick.id}
          used={usedNames}
          currentGuess={guesses[pick.id]}
          onConfirm={confirmGuess}
          onCancel={cancelPick}
          onClear={clearGuess}
        />
      )}
    </div>
  );
}
