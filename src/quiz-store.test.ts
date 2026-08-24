import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelPick,
  checkAnswers,
  clearGuess,
  confirmGuess,
  quizStore,
  resetQuiz,
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

  it("scores guesses against truth", () => {
    selectState("06", "California");
    confirmGuess("California");
    selectState("48", "Texas");
    confirmGuess("Alaska");
    checkAnswers();
    expect(quizStore.state.scored).toEqual({ "06": true, "48": false });
    expect(quizStore.state.pick).toBeNull();
  });

  it("does not change picks after scoring", () => {
    selectState("06", "California");
    confirmGuess("California");
    checkAnswers();
    selectState("48", "Texas");
    expect(quizStore.state.pick).toBeNull();
    expect(quizStore.state.truth["48"]).toBeUndefined();
  });
});
