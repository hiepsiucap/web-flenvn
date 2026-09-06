import type { FlashcardLabel, LabelType } from "./dashboard-data";

const labelOrder: Record<LabelType, number> = {
  level: 0,
  topic: 1,
  usage: 2,
  custom: 3,
};

export function sortFlashcardLabels(labels: FlashcardLabel[] = []) {
  return [...labels].sort(
    (left, right) => labelOrder[left.type] - labelOrder[right.type]
  );
}
