import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryQuizModeStorage, QUIZ_MODE_STORAGE_KEY } from "./quiz-mode-storage";
import { STATE_CAPITALS, STATE_NAMES } from "./states";
import {
  cancelPick,
  checkAnswers,
  clearGuess,
  confirmGuess,
  continuePlay,
  confirmPendingModeSwitch,
  dismissModeSwitchBlocked,
  expectedLabel,
  quizStore,
  requestMode,
  resetQuiz,
  resetQuizStore,
  revealHelp,
  selectState,
} from "./quiz-store";

beforeEach(() => {
  resetQuizStore(undefined, "states");
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
    const guesses: Record<string, string> = {};
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

  it("reset keeps the current mode", () => {
    const storage = createMemoryQuizModeStorage();
    expect(requestMode("capitals", storage)).toBe("ok");
    selectState("06", "California");
    confirmGuess("Sacramento");
    resetQuiz();
    expect(quizStore.state.mode).toBe("capitals");
    expect(quizStore.state.guesses).toEqual({});
    expect(storage.getItem(QUIZ_MODE_STORAGE_KEY)).toBe("capitals");
  });
});

describe("quiz mode switching", () => {
  it("switches and persists when the board is fresh", () => {
    const storage = createMemoryQuizModeStorage();
    expect(requestMode("capitals", storage)).toBe("ok");
    expect(quizStore.state.mode).toBe("capitals");
    expect(storage.getItem(QUIZ_MODE_STORAGE_KEY)).toBe("capitals");
    expect(requestMode("capitals", storage)).toBe("same");
  });

  it("blocks switching while a quiz is in progress", () => {
    const storage = createMemoryQuizModeStorage();
    selectState("06", "California");
    confirmGuess("California");
    selectState("48", "Texas");
    expect(requestMode("capitals", storage)).toBe("blocked");
    expect(quizStore.state.mode).toBe("states");
    expect(quizStore.state.pendingMode).toBe("capitals");
    expect(quizStore.state.pick).toBeNull();
    expect(quizStore.state.guesses).toEqual({ "06": "California" });
    expect(storage.getItem(QUIZ_MODE_STORAGE_KEY)).toBeNull();

    dismissModeSwitchBlocked();
    expect(quizStore.state.pendingMode).toBeNull();
    expect(quizStore.state.mode).toBe("states");
    expect(quizStore.state.guesses).toEqual({ "06": "California" });
  });

  it("cancel and switch clears progress and changes mode", () => {
    const storage = createMemoryQuizModeStorage();
    selectState("06", "California");
    confirmGuess("California");
    expect(requestMode("capitals", storage)).toBe("blocked");
    confirmPendingModeSwitch(storage);
    expect(quizStore.state.mode).toBe("capitals");
    expect(quizStore.state.pendingMode).toBeNull();
    expect(quizStore.state.guesses).toEqual({});
    expect(storage.getItem(QUIZ_MODE_STORAGE_KEY)).toBe("capitals");
  });

  it("hydrates mode from storage via resetQuizStore", () => {
    const storage = createMemoryQuizModeStorage({
      [QUIZ_MODE_STORAGE_KEY]: "capitals",
    });
    resetQuizStore(storage);
    expect(quizStore.state.mode).toBe("capitals");
  });
});

describe("capitals grading", () => {
  beforeEach(() => {
    resetQuizStore(undefined, "capitals");
  });

  it("grades capital guesses against STATE_CAPITALS", () => {
    selectState("06", "California");
    confirmGuess("Sacramento");
    selectState("48", "Texas");
    confirmGuess("Houston");
    checkAnswers();
    revealHelp();
    expect(quizStore.state.scored).toEqual({ "06": true, "48": false });
    expect(expectedLabel("capitals", "Texas")).toBe(STATE_CAPITALS.Texas);
  });

  it("celebrates fifty correct capitals", () => {
    const guesses: Record<string, string> = {};
    const truth: Record<string, (typeof STATE_NAMES)[number]> = {};
    STATE_NAMES.forEach((name, i) => {
      guesses[String(i)] = STATE_CAPITALS[name];
      truth[String(i)] = name;
    });
    quizStore.setState((s) => ({ ...s, mode: "capitals", guesses, truth }));
    checkAnswers();
    expect(quizStore.state.result).toBe("perfect");
  });
});
