import { createStore } from "@tanstack/react-store";
import type { StateName } from "./states";

export type PickState = { id: string; trueName: StateName };

export type CheckResult = "perfect" | "miss" | null;

export type QuizState = {
  guesses: Record<string, StateName>;
  truth: Record<string, StateName>;
  pick: PickState | null;
  scored: Record<string, boolean> | null;
  /** After a failed first check, player can keep editing until they reveal. */
  firstCheckFailed: boolean;
  result: CheckResult;
};

export const quizStore = createStore<QuizState>({
  guesses: {},
  truth: {},
  pick: null,
  scored: null,
  firstCheckFailed: false,
  result: null,
});

function grade(guesses: Record<string, StateName>, truth: Record<string, StateName>) {
  const scored: Record<string, boolean> = {};
  let allRight = Object.keys(guesses).length === 50;
  for (const id of Object.keys(guesses)) {
    const ok = guesses[id] === truth[id];
    scored[id] = ok;
    if (!ok) allRight = false;
  }
  return { scored, allRight };
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

export function confirmGuess(name: StateName) {
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
    const { scored, allRight } = grade(s.guesses, s.truth);
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
    const { scored } = grade(s.guesses, s.truth);
    return { ...s, scored, pick: null, result: null };
  });
}

export function dismissPerfect() {
  quizStore.setState((s) => (s.result === "perfect" ? { ...s, result: null } : s));
}

export function resetQuiz() {
  quizStore.setState(() => ({
    guesses: {},
    truth: {},
    pick: null,
    scored: null,
    firstCheckFailed: false,
    result: null,
  }));
}
