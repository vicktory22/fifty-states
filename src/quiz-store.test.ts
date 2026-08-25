import { beforeEach, describe, expect, it } from "vitest";
import { STATE_NAMES } from "./states";
import {
  cancelPick,
  checkAnswers,
  clearGuess,
  confirmGuess,
  continuePlay,
  quizStore,
  resetQuiz,
  revealHelp,
  selectState,
} from "./quiz-store";

beforeEach(() => {
  resetQuiz();
});

describe("quizStore", () => {
  it("records a pick then a guess", () => {
    selectState("06", "California");
    expect(quizStore.state.pick).toEqual({ id: "06", trueName: "California" });
    expect(quizStore.state.truth["06"]).toBe("California");

    confirmGuess("Oregon");
    expect(quizStore.state.pick).toBeNull();
    expect(quizStore.state.guesses["06"]).toBe("Oregon");
  });

  it("ignores confirm and clear without a pick", () => {
    confirmGuess("Texas");
    clearGuess();
    expect(quizStore.state.guesses).toEqual({});
  });

  it("clears the guess for the current pick", () => {
    selectState("06", "California");
    confirmGuess("California");
    selectState("06", "California");
    clearGuess();
    expect(quizStore.state.guesses).toEqual({});
    expect(quizStore.state.pick).toBeNull();
  });

  it("cancels a pick without changing guesses", () => {
    selectState("48", "Texas");
    confirmGuess("Texas");
    selectState("06", "California");
    cancelPick();
    expect(quizStore.state.pick).toBeNull();
    expect(quizStore.state.guesses).toEqual({ "48": "Texas" });
  });

  it("first check of all 50 correct celebrates", () => {
    const guesses: Record<string, (typeof STATE_NAMES)[number]> = {};
    const truth: Record<string, (typeof STATE_NAMES)[number]> = {};
    STATE_NAMES.forEach((name, i) => {
      guesses[String(i)] = name;
      truth[String(i)] = name;
    });
    quizStore.setState((s) => ({ ...s, guesses, truth }));
    checkAnswers();
    expect(quizStore.state.result).toBe("perfect");
    expect(Object.values(quizStore.state.scored ?? {}).every(Boolean)).toBe(true);
  });

  it("first check with misses does not reveal or lock", () => {
    selectState("06", "California");
    confirmGuess("California");
    selectState("48", "Texas");
    confirmGuess("Alaska");
    checkAnswers();
    expect(quizStore.state.scored).toBeNull();
    expect(quizStore.state.firstCheckFailed).toBe(true);
    expect(quizStore.state.result).toBe("miss");
    expect(quizStore.state.pick).toBeNull();

    continuePlay();
    expect(quizStore.state.result).toBeNull();
    expect(quizStore.state.scored).toBeNull();

    selectState("48", "Texas");
    expect(quizStore.state.pick).toEqual({ id: "48", trueName: "Texas" });
  });

  it("help reveals misses after a failed first check", () => {
    selectState("06", "California");
    confirmGuess("California");
    selectState("48", "Texas");
    confirmGuess("Alaska");
    checkAnswers();
    revealHelp();
    expect(quizStore.state.scored).toEqual({ "06": true, "48": false });
    expect(quizStore.state.result).toBeNull();
  });

  it("can check and continue as many times as they want", () => {
    selectState("06", "California");
    confirmGuess("California");
    selectState("48", "Texas");
    confirmGuess("Alaska");
    checkAnswers();
    continuePlay();
    checkAnswers();
    continuePlay();
    checkAnswers();
    expect(quizStore.state.scored).toBeNull();
    expect(quizStore.state.result).toBe("miss");
    continuePlay();
    selectState("48", "Texas");
    expect(quizStore.state.pick).toEqual({ id: "48", trueName: "Texas" });
  });

  it("does not change picks after a revealing score", () => {
    selectState("06", "California");
    confirmGuess("California");
    checkAnswers();
    revealHelp();
    selectState("48", "Texas");
    expect(quizStore.state.pick).toBeNull();
    expect(quizStore.state.truth["48"]).toBeUndefined();
  });
});
