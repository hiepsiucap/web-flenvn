export type ListeningGameType =
  | "quick-reply"
  | "catch-details"
  | "conversation";
export type ListeningDifficulty = "easy" | "medium" | "hard";
export type ListeningQuestion = {
  id: string;
  prompt: string;
  choices?: string[];
  audioUrls: string[];
};
export type ListeningRound = {
  id: string;
  game: ListeningGameType;
  difficulty: ListeningDifficulty;
  status: "generating" | "ready" | "failed";
  questions: ListeningQuestion[];
};
export type ListeningFeedback = {
  questionId: string;
  correct: boolean;
  score: number;
  correctAnswer: string;
  transcript: string;
  explanation: string;
};
export function unwrapListening<T>(value: T | { data: T }): T {
  return value && typeof value === "object" && "data" in value
    ? value.data
    : (value as T);
}
export function parseListeningRound(input: unknown): ListeningRound {
  const round = unwrapListening(input) as ListeningRound | undefined;
  if (
    !round ||
    typeof round.id !== "string" ||
    !["generating", "ready", "failed"].includes(round.status) ||
    !["quick-reply", "catch-details", "conversation"].includes(round.game) ||
    !["easy", "medium", "hard"].includes(round.difficulty) ||
    !Array.isArray(round.questions)
  )
    throw new Error("Invalid listening round");
  if (
    round.status === "ready" &&
    (round.questions.length !== 5 ||
      new Set(round.questions.map((q) => q.id)).size !== 5 ||
      round.questions.some(
        (q) =>
          typeof q.id !== "string" ||
          typeof q.prompt !== "string" ||
          !q.prompt.trim() ||
          !Array.isArray(q.audioUrls) ||
          !q.audioUrls.length ||
          q.audioUrls.some(
            (url) => typeof url !== "string" || !url.startsWith("https://"),
          ) ||
          (round.game !== "catch-details" &&
            (!Array.isArray(q.choices) ||
              q.choices.length !== 3 ||
              q.choices.some((choice) => typeof choice !== "string"))),
      ))
  )
    throw new Error("Incomplete listening round");
  return round;
}

export function waitForListeningPoll(signal: AbortSignal, delay = 1500) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, delay);
    signal.addEventListener("abort", cancel, { once: true });
  });
}
