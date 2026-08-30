export const QUIZ_MODE_STORAGE_KEY = "fifty-states.quiz-mode";

export type QuizMode = "states" | "capitals";

export type QuizModeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultStorage(): QuizModeStorage | null {
  try {
    const storage = globalThis.localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

export function parseQuizMode(raw: string | null | undefined): QuizMode | null {
  if (raw === "states" || raw === "capitals") return raw;
  return null;
}

export function readStoredQuizMode(
  storage: QuizModeStorage | null = defaultStorage(),
): QuizMode | null {
  if (!storage) return null;
  try {
    return parseQuizMode(storage.getItem(QUIZ_MODE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredQuizMode(
  mode: QuizMode,
  storage: QuizModeStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(QUIZ_MODE_STORAGE_KEY, mode);
  } catch {
    // Quota / private mode — ignore.
  }
}

/** In-memory Storage stand-in for tests / SSR. */
export function createMemoryQuizModeStorage(
  initial?: Partial<Record<string, string>>,
): QuizModeStorage {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(initial ?? {})) {
    if (value !== undefined) map.set(key, value);
  }
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
