import type { Flashcard } from "@/lib/dashboard-data";

export type GameMechanism = "input" | "quiz" | "buzz";

export type PracticePromptType =
  | "definition"
  | "example-blank"
  | "media";

export type PracticeGame = {
  id: string;
  flashcardId: string;
  type: "definition-input" | "example-blank-quiz" | "media-input";
  mechanism: GameMechanism;
  promptType: PracticePromptType;
  answer: string;
  choices?: string[];
};

export type PracticeGameResult = {
  gameType: PracticeGame["type"];
  result: "correct" | "incorrect" | "skipped";
  responseTime: number;
  score: number;
};

export type PracticeFlashcardResult = {
  flashcardId: string;
  quality: number;
  games: PracticeGameResult[];
};

export function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

export function isCorrectAnswer(userAnswer: string, answer: string) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(answer);
}

export function createPracticeGames(card: Flashcard, pool: Flashcard[]) {
  const games: PracticeGame[] = [];
  const answer = card.word.trim();

  if (!answer) {
    return games;
  }

  if (card.definition?.trim()) {
    games.push({
      id: `${card.id}:definition-input`,
      flashcardId: card.id,
      type: "definition-input",
      mechanism: "input",
      promptType: "definition",
      answer,
    });
  }

  if (card.example?.trim()) {
    const choices = createChoices(card, pool);

    if (choices.length >= 4) {
      games.push({
        id: `${card.id}:example-blank-quiz`,
        flashcardId: card.id,
        type: "example-blank-quiz",
        mechanism: "quiz",
        promptType: "example-blank",
        answer,
        choices,
      });
    }
  }

  if (card.imageUrl?.trim() || card.audioUrl?.trim()) {
    games.push({
      id: `${card.id}:media-input`,
      flashcardId: card.id,
      type: "media-input",
      mechanism: "input",
      promptType: "media",
      answer,
    });
  }

  return games;
}

export function blankWord(example: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return example.replace(new RegExp(`\\b${escaped}\\b`, "i"), "_____");
}

export function calculateQuality(results: PracticeGameResult[]) {
  if (!results.length || results.every((item) => item.result === "skipped")) {
    return 0;
  }

  const answered = results.filter((item) => item.result !== "skipped");
  const correct = answered.filter((item) => item.result === "correct").length;
  const accuracy = answered.length ? correct / answered.length : 0;

  if (accuracy === 1) return 5;
  if (accuracy >= 0.75) return 4;
  if (accuracy >= 0.5) return 3;
  return 1;
}

function createChoices(card: Flashcard, pool: Flashcard[]) {
  const correct = card.word.trim();
  const distractors = pool
    .filter((item) => item.id !== card.id)
    .map((item) => item.word.trim())
    .filter((word, index, words) => word && word !== correct && words.indexOf(word) === index)
    .slice(0, 3);

  if (distractors.length < 3) {
    return [correct, ...distractors];
  }

  return shuffle([correct, ...distractors]);
}

function shuffle<TItem>(items: TItem[]) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}
