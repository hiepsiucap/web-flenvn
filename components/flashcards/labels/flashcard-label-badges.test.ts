import { describe, expect, it } from "vitest";

import type { FlashcardLabel } from "@/lib/dashboard-data";
import { sortFlashcardLabels } from "../../../lib/flashcard-labels";

function label(id: string, type: FlashcardLabel["type"]): FlashcardLabel {
  return { id, name: id, type };
}

describe("sortFlashcardLabels", () => {
  it("groups labels by level, topic, usage, then custom", () => {
    const labels = [
      label("custom", "custom"),
      label("topic", "topic"),
      label("level", "level"),
      label("usage", "usage"),
    ];

    expect(sortFlashcardLabels(labels).map((item) => item.id)).toEqual([
      "level",
      "topic",
      "usage",
      "custom",
    ]);
  });

  it("does not mutate the API response array", () => {
    const labels = [label("topic", "topic"), label("level", "level")];

    sortFlashcardLabels(labels);

    expect(labels.map((item) => item.id)).toEqual(["topic", "level"]);
  });
});
