import { describe, expect, it } from "vitest";
import { parseListeningRound } from "./listening";
const round = {
  id: "round",
  game: "catch-details",
  difficulty: "easy",
  status: "ready",
  questions: Array.from({ length: 5 }, (_, i) => ({
    id: `q${i}`,
    prompt: "What time?",
    audioUrls: ["https://audio.example/test.mp3"],
  })),
};
describe("listening API contract", () => {
  it("accepts enveloped rounds", () =>
    expect(parseListeningRound({ data: round })).toEqual(round));
  it("rejects incomplete ready rounds and invalid audio", () => {
    expect(() => parseListeningRound({ ...round, questions: [] })).toThrow();
    expect(() =>
      parseListeningRound({
        ...round,
        questions: round.questions.map((q) => ({
          ...q,
          audioUrls: ["javascript:alert(1)"],
        })),
      }),
    ).toThrow();
  });
  it("accepts generation state without questions", () =>
    expect(
      parseListeningRound({ ...round, status: "generating", questions: [] })
        .status,
    ).toBe("generating"));
});
