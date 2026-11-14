import { describe, expect, it } from "vitest";

import type { Flashcard } from "./dashboard-data";
import {
  calculateGameScore,
  createPracticeGames,
  selectPracticeCards,
  createSentencePuzzleTokens,
  GAME_TIME_LIMIT_MS,
  mixPracticeSteps,
  isCorrectSentence,
} from "./practice-games";

describe("practice game queue", () => {
  const steps = (ids: string[]) =>
    ids.map((id, index) => ({ card: { id }, game: { id: `${id}-${index}` } }));

  it("mixes balanced cards without consecutive repeats and keeps every game", () => {
    const input = steps(["a", "a", "a", "b", "b", "b", "c", "c"]);
    const mixed = mixPracticeSteps(input, () => 0.5);

    expect(mixed).toHaveLength(input.length);
    expect(mixed.map((step) => step.game.id).sort()).toEqual(
      input.map((step) => step.game.id).sort()
    );
    expect(mixed.every((step, index) => index === 0 || step.card.id !== mixed[index - 1].card.id)).toBe(true);
  });

  it("handles a single card and unavoidable repeats", () => {
    expect(mixPracticeSteps(steps(["a", "a"]), () => 0.5)).toHaveLength(2);

    const mixed = mixPracticeSteps(steps(["a", "a", "a", "a", "b"]), () => 0.5);
    const repeats = mixed.filter((step, index) => index > 0 && step.card.id === mixed[index - 1].card.id);
    expect(repeats).toHaveLength(2);
  });

  it("allows scoring throughout a 20-second round", () => {
    expect(GAME_TIME_LIMIT_MS).toBe(20_000);
    expect(calculateGameScore(0)).toBe(100);
    expect(calculateGameScore(10_000)).toBe(50);
    expect(calculateGameScore(19_000)).toBe(5);
    expect(calculateGameScore(20_000)).toBe(0);
  });
});

describe("sentence puzzle", () => {
  it("keeps punctuation attached and returns a different order", () => {
    const tokens = createSentencePuzzleTokens(
      "I usually drink coffee in the morning.",
      () => 0.5
    );

    expect(tokens.map((token) => token.text)).toEqual([
      "usually",
      "drink",
      "coffee",
      "in",
      "the",
      "morning.",
      "I",
    ]);
  });

  it("gives repeated words unique identifiers", () => {
    const tokens = createSentencePuzzleTokens("The dog saw the dog", () => 0.5);

    expect(new Set(tokens.map((token) => token.id)).size).toBe(tokens.length);
  });

  it("normalizes casing and repeated whitespace when validating", () => {
    expect(
      isCorrectSentence(
        "  i   usually drink coffee in the morning. ",
        "I usually drink coffee in the morning."
      )
    ).toBe(true);
    expect(isCorrectSentence("Coffee I drink", "I drink coffee")).toBe(false);
  });

  it("creates a puzzle only for examples with 3 to 10 words", () => {
    const card: Flashcard = {
      id: "card-1",
      word: "drink",
      example: "I usually drink coffee in the morning.",
      status: "new",
    };
    const games = createPracticeGames(card, [card]);
    const puzzle = games.find((game) => game.type === "sentence-puzzle");

    expect(puzzle?.answer).toBe(card.example);
    expect(puzzle?.tokens).toHaveLength(7);

    const shortCard = { ...card, id: "card-2", example: "Drink coffee" };
    expect(
      createPracticeGames(shortCard, [shortCard]).some(
        (game) => game.type === "sentence-puzzle"
      )
    ).toBe(false);
  });
});

describe("custom practice selection", () => {
  const cards: Flashcard[] = [
    { id: "a", word: "apple", definition: "A fruit", status: "mastered", bookId: "parent" },
    { id: "b", word: "water", definition: "A liquid", status: "new", bookId: "child" },
  ];

  it("generates practice only for chosen words, including mastered words", () => {
    const chosen = selectPracticeCards(cards, ["a"]);
    const games = chosen.flatMap((card) => createPracticeGames(card, cards));
    expect(chosen.map((card) => card.id)).toEqual(["a"]);
    expect(games.length).toBeGreaterThan(0);
    expect(games.every((game) => game.flashcardId === "a")).toBe(true);
  });

  it("does not start with an empty selection", () => {
    expect(selectPracticeCards(cards, [])).toEqual([]);
  });

  it("ignores selections from another book or a deleted card", () => {
    expect(selectPracticeCards(cards, ["b", "unknown"]).map((card) => card.id)).toEqual(["b"]);
  });

  it("does not practice duplicate card IDs twice", () => {
    expect(selectPracticeCards([...cards, cards[0]], ["a", "a"]).map((card) => card.id)).toEqual(["a"]);
  });
});
