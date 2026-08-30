import { createStore } from "@tanstack/react-store";
import {
  parseQuizMode,
  readStoredQuizMode,
  writeStoredQuizMode,
  type QuizMode,
  type QuizModeStorage,
} from "./quiz-mode-storage";
import { STATE_CAPITALS, type StateName } from "./states";

export type { QuizMode } from "./quiz-mode-storage";

export type PickState = { id: string; trueName: StateName };

export type CheckResult = "perfect" | "miss" | null;

export type QuizState = {
  mode: QuizMode;
  /** Mode the player asked for while a quiz was still in progress. */
  pendingMode: QuizMode | null;
  guesses: Record<string, string>;
  truth: Record<string, StateName>;
  pick: PickState | null;
  scored: Record<string, boolean> | null;
  /** After a failed first check, player can keep editing until they reveal. */
  firstCheckFailed: boolean;
  result: CheckResult;
};

function initialMode(storage?: QuizModeStorage | null): QuizMode {
  return readStoredQuizMode(storage === undefined ? undefined : storage) ?? "states";
}

export const quizStore = createStore<QuizState>({
  mode: initialMode(),
  pendingMode: null,
  guesses: {},
  truth: {},
  pick: null,
  scored: null,
  firstCheckFailed: false,
  result: null,
});

export function expectedLabel(mode: QuizMode, stateName: StateName): string {
  return mode === "capitals" ? STATE_CAPITALS[stateName] : stateName;
}

export function isQuizInProgress(s: QuizState): boolean {
  return (
    s.pick != null ||
    Object.keys(s.guesses).length > 0 ||
    s.scored != null ||
    s.firstCheckFailed ||
    s.result != null
  );
}

function grade(mode: QuizMode, guesses: Record<string, string>, truth: Record<string, StateName>) {
  const scored: Record<string, boolean> = {};
  let allRight = Object.keys(guesses).length === 50;
  for (const id of Object.keys(guesses)) {
    const trueName = truth[id];
    const ok = trueName != null && guesses[id] === expectedLabel(mode, trueName);
    scored[id] = ok;
    if (!ok) allRight = false;
  }
  return { scored, allRight };
}

export type RequestModeResult = "ok" | "blocked" | "same";

export function requestMode(next: QuizMode, storage?: QuizModeStorage | null): RequestModeResult {
  const current = quizStore.state;
  if (current.mode === next) return "same";
  if (isQuizInProgress(current)) {
    quizStore.setState((s) => ({ ...s, pendingMode: next, pick: null }));
    return "blocked";
  }
  writeStoredQuizMode(next, storage === undefined ? undefined : storage);
  quizStore.setState((s) => ({ ...s, mode: next, pendingMode: null }));
  return "ok";
}

/** Clear the in-progress quiz and switch to the pending mode. */
export function confirmPendingModeSwitch(storage?: QuizModeStorage | null) {
  const next = quizStore.state.pendingMode;
  if (!next) return;
  writeStoredQuizMode(next, storage === undefined ? undefined : storage);
  quizStore.setState(() => ({
    mode: next,
    pendingMode: null,
    guesses: {},
    truth: {},
    pick: null,
    scored: null,
    firstCheckFailed: false,
    result: null,
  }));
}

export function dismissModeSwitchBlocked() {
  quizStore.setState((s) => (s.pendingMode ? { ...s, pendingMode: null } : s));
}

export function selectState(id: string, trueName: StateName) {
  quizStore.setState((s) => {
    if (s.scored) return s;
    return {
      ...s,
      truth: { ...s.truth, [id]: trueName },
      pick: { id, trueName },
    };
  });
}

export function confirmGuess(name: string) {
  quizStore.setState((s) => {
    if (!s.pick) return s;
    return {
      ...s,
      guesses: { ...s.guesses, [s.pick.id]: name },
      pick: null,
    };
  });
}

export function clearGuess() {
  quizStore.setState((s) => {
    if (!s.pick) return s;
    const guesses = { ...s.guesses };
    delete guesses[s.pick.id];
    return { ...s, guesses, pick: null };
  });
}

export function cancelPick() {
  quizStore.setState((s) => ({ ...s, pick: null }));
}

export function checkAnswers() {
  quizStore.setState((s) => {
    if (s.scored) return s;
    const { scored, allRight } = grade(s.mode, s.guesses, s.truth);
    if (allRight) {
      return {
        ...s,
        scored,
        pick: null,
        firstCheckFailed: false,
        result: "perfect",
      };
    }
    return { ...s, pick: null, firstCheckFailed: true, result: "miss" };
  });
}

export function continuePlay() {
  quizStore.setState((s) => (s.result === "miss" ? { ...s, result: null } : s));
}

export function revealHelp() {
  quizStore.setState((s) => {
    if (s.scored || !s.firstCheckFailed) return s;
    const { scored } = grade(s.mode, s.guesses, s.truth);
    return { ...s, scored, pick: null, result: null };
  });
}

export function dismissPerfect() {
  quizStore.setState((s) => (s.result === "perfect" ? { ...s, result: null } : s));
}

export function resetQuiz() {
  quizStore.setState((s) => ({
    mode: s.mode,
    pendingMode: null,
    guesses: {},
    truth: {},
    pick: null,
    scored: null,
    firstCheckFailed: false,
    result: null,
  }));
}

/** Test helper: reset store (+ optional storage) including mode. */
export function resetQuizStore(storage?: QuizModeStorage | null, mode?: QuizMode) {
  const resolved = mode ?? (storage != null ? (readStoredQuizMode(storage) ?? "states") : "states");
  if (storage != null && mode != null) {
    writeStoredQuizMode(mode, storage);
  }
  quizStore.setState(() => ({
    mode: resolved,
    pendingMode: null,
    guesses: {},
    truth: {},
    pick: null,
    scored: null,
    firstCheckFailed: false,
    result: null,
  }));
}

export { parseQuizMode };
