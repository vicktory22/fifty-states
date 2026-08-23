import { createStore } from "@tanstack/react-store";
import type { StateName } from "./states";

export type PickState = { id: string; trueName: StateName };

export type QuizState = {
  guesses: Record<string, StateName>;
  truth: Record<string, StateName>;
  pick: PickState | null;
  scored: Record<string, boolean> | null;
};

export const quizStore = createStore<QuizState>({
  guesses: {},
  truth: {},
  pick: null,
  scored: null,
});

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
    const scored: Record<string, boolean> = {};
    for (const id of Object.keys(s.guesses)) {
      scored[id] = s.guesses[id] === s.truth[id];
    }
    return { ...s, scored, pick: null };
  });
}

export function resetQuiz() {
  quizStore.setState(() => ({
    guesses: {},
    truth: {},
    pick: null,
    scored: null,
  }));
}
