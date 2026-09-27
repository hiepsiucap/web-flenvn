import { describe, expect, it } from "vitest";

import { validateFlashcardAudioFile } from "./flashcard-audio";

describe("flashcard audio uploads", () => {
  it("accepts supported audio within the size limit", () => {
    expect(validateFlashcardAudioFile({ type: "audio/mpeg", size: 1024 })).toBeNull();
  });

  it("rejects unsupported and oversized files", () => {
    expect(validateFlashcardAudioFile({ type: "text/plain", size: 1024 })).toMatch(/MP3/);
    expect(validateFlashcardAudioFile({ type: "audio/mpeg", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});
