import { describe, expect, it } from "vitest";

import { buildFlashcardUpdatePayload, validateFlashcardEdit } from "./flashcard-edit";
import type { Flashcard } from "./dashboard-data";

const original = {
  id: "card-1",
  word: "apple",
  partOfSpeech: "noun",
  pronunciation: "/ˈæp.əl/",
  definition: "A fruit",
  translation: "táo",
  audioUrl: "https://example.com/apple.mp3",
  imageUrl: "https://example.com/apple.jpg",
  example: "An apple.",
  exampleAudioUrl: "https://example.com/example.mp3",
  exampleTranslation: "Một quả táo.",
  status: "new",
} satisfies Flashcard;

const draft = {
  word: original.word,
  partOfSpeech: original.partOfSpeech,
  pronunciation: original.pronunciation,
  definition: original.definition,
  translation: original.translation,
  audioUrl: original.audioUrl,
  example: original.example,
  exampleAudioUrl: original.exampleAudioUrl,
  exampleTranslation: original.exampleTranslation,
};

describe("flashcard editor", () => {
  it("sends only changed properties", () => {
    expect(buildFlashcardUpdatePayload(original, { ...draft, definition: "A red fruit" }, "current", null, false)).toEqual({
      word: "apple",
      definition: "A red fruit",
    });
  });

  it("lets the backend reset stale word assets unless the user keeps them", () => {
    expect(buildFlashcardUpdatePayload(original, { ...draft, word: "pear" }, "current", null, false)).toEqual({ word: "pear" });
    expect(buildFlashcardUpdatePayload(original, { ...draft, word: "pear" }, "current", null, true)).toEqual({
      word: "pear",
      imageUrl: original.imageUrl,
      audioUrl: original.audioUrl,
    });
  });

  it("sends a selected image or the default image", () => {
    expect(buildFlashcardUpdatePayload(original, draft, "suggested", "https://images.pexels.com/new.jpg", false).imageUrl).toBe("https://images.pexels.com/new.jpg");
    expect(buildFlashcardUpdatePayload(original, draft, "default", null, false).imageUrl).toContain("images/logo.png");
  });

  it("validates the word, part of speech, and audio URLs", () => {
    expect(validateFlashcardEdit({ ...draft, word: " ", partOfSpeech: "fruit", audioUrl: "bad" })).toMatchObject({
      word: expect.any(String),
      partOfSpeech: expect.any(String),
      audioUrl: expect.any(String),
    });
  });
});
