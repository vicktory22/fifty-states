import { DiagnosticsPanel } from "@designcodeio/threeui";
import { Link } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { IdentifyLock } from "./IdentifyLock";
import {
  cancelPick,
  checkAnswers,
  clearGuess,
  confirmGuess,
  continuePlay,
  dismissPerfect,
  quizStore,
  resetQuiz,
  revealHelp,
} from "./quiz-store";
import { getTheme } from "./theme/registry";
import { themeStore } from "./theme/theme-store";

/** Game HUD / dialogs. Map lives in the `_stage` layout so it survives `/settings`. */
export function GameHud() {
  const guesses = useSelector(quizStore, (s) => s.guesses);
  const truth = useSelector(quizStore, (s) => s.truth);
  const pick = useSelector(quizStore, (s) => s.pick);
  const scored = useSelector(quizStore, (s) => s.scored);
  const firstCheckFailed = useSelector(quizStore, (s) => s.firstCheckFailed);
  const result = useSelector(quizStore, (s) => s.result);
  const themeId = useSelector(themeStore, (s) => s.id);
  const threeUiMode = getTheme(themeId).threeUiMode;
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
    <>
      <Link to="/settings" search={true} className="hud hud-tr theme-entry btn ghost">
        Theme
      </Link>

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
          {score === null && firstCheckFailed && result !== "miss" && (
            <p className="stats-score">Not all correct. Keep going.</p>
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
            {firstCheckFailed && !scored && (
              <button className="btn ghost" type="button" onClick={revealHelp}>
                Help
              </button>
            )}
            <button className="btn ghost" type="button" onClick={resetQuiz}>
              Reset
            </button>
          </div>
          <p className="dock-note">
            {scored
              ? "Answers checked"
              : firstCheckFailed && allGuessed
                ? "Not all correct — keep labeling, or ask for help"
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
            <DiagnosticsPanel mode={threeUiMode} />
          </div>
        </aside>
      )}

      {result === "perfect" && (
        <div className="dialog" role="dialog" aria-labelledby="result-title">
          <div className="card result-card win">
            <div className="kicker">Survey complete</div>
            <h2 id="result-title">Fifty for fifty.</h2>
            <p>Every state named. Clean sweep.</p>
            <div className="row">
              <button className="btn primary" type="button" onClick={dismissPerfect}>
                Soak it in
              </button>
              <button className="btn ghost" type="button" onClick={resetQuiz}>
                Play again
              </button>
            </div>
          </div>
        </div>
      )}

      {result === "miss" && (
        <div className="dialog" role="dialog" aria-labelledby="result-title">
          <div className="card result-card miss">
            <div className="kicker">Not yet</div>
            <h2 id="result-title">Not all correct.</h2>
            <p>No peek at which ones. Keep going, or ask for help.</p>
            <div className="row">
              <button className="btn primary" type="button" onClick={continuePlay}>
                Continue
              </button>
              <button className="btn ghost" type="button" onClick={revealHelp}>
                Help
              </button>
            </div>
          </div>
        </div>
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
    </>
  );
}
