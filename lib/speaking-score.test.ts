import { describe, expect, it } from "vitest";
import { scoreSpokenWords } from "./speaking-score";

describe("spoken word accuracy", () => {
  it("ignores case and punctuation", () => expect(scoreSpokenWords("Hello, world!", "hello world")).toBe(100));
  it("gives no credit for silence or a different single word", () => {
    expect(scoreSpokenWords("apple", "")).toBe(0);
    expect(scoreSpokenWords("apple", "banana")).toBe(0);
  });
  it("counts omitted and substituted words", () => {
    expect(scoreSpokenWords("I drink cold water", "I drink water")).toBe(75);
    expect(scoreSpokenWords("I drink cold water", "I eat warm water")).toBe(50);
  });
  it("penalizes additional words and clamps the score", () => {
    expect(scoreSpokenWords("drink water", "please drink water")).toBe(50);
    expect(scoreSpokenWords("apple", "a banana and pear")).toBe(0);
  });
  it("normalizes apostrophes and hyphenated phrases", () => {
    expect(scoreSpokenWords("I’m well-known", "I'm well known.")).toBe(100);
    expect(scoreSpokenWords("", "hello")).toBe(0);
  });
});
