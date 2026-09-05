import type { Flashcard } from "./dashboard-data";

export type GameMechanism = "input" | "quiz" | "puzzle" | "buzz";

export type PracticePromptType =
  | "definition"
  | "example-blank"
  | "media"
  | "sentence-puzzle";

export type PuzzleToken = {
  id: string;
  text: string;
};

export type PracticeGame = {
  id: string;
  flashcardId: string;
  type:
    | "definition-input"
    | "example-blank-quiz"
    | "media-input"
    | "sentence-puzzle";
  mechanism: GameMechanism;
  promptType: PracticePromptType;
  answer: string;
  choices?: string[];
  tokens?: PuzzleToken[];
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

    const puzzleTokens = createSentencePuzzleTokens(card.example);

    if (puzzleTokens.length >= 3 && puzzleTokens.length <= 10) {
      games.push({
        id: `${card.id}:sentence-puzzle`,
        flashcardId: card.id,
        type: "sentence-puzzle",
        mechanism: "puzzle",
        promptType: "sentence-puzzle",
        answer: card.example.trim(),
        tokens: puzzleTokens,
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

export function createSentencePuzzleTokens(
  sentence: string,
  random: () => number = Math.random
): PuzzleToken[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const tokens = words.map((text, index) => ({ id: `word-${index}`, text }));

  if (tokens.length < 2) return tokens;

  const shuffled = shuffle(tokens, random);

  if (shuffled.every((token, index) => token.id === tokens[index].id)) {
    return [...shuffled.slice(1), shuffled[0]];
  }

  return shuffled;
}

export function isCorrectSentence(userAnswer: string, answer: string) {
  return normalizeSentence(userAnswer) === normalizeSentence(answer);
}

function normalizeSentence(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
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

function shuffle<TItem>(items: TItem[], random: () => number = Math.random) {
  return items
    .map((item) => ({ item, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}
