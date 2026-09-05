import { describe, expect, it } from "vitest";

import type { Flashcard } from "./dashboard-data";
import {
  createPracticeGames,
  createSentencePuzzleTokens,
  isCorrectSentence,
} from "./practice-games";

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
