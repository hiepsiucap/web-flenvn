import type { FlashcardLabel } from "@/lib/dashboard-data";
import { sortFlashcardLabels } from "@/lib/flashcard-labels";
import { Tag } from "@/components/ui/tag";

const labelVariant = {
  level: "outline",
  topic: "neutral",
  usage: "outline",
  custom: "outline",
} as const;

export function getFlashcardLabelToneClassName(label: FlashcardLabel) {
  if (label.type === "topic") {
    return "border-label-topic-foreground/20 bg-label-topic text-label-topic-foreground";
  }

  if (label.type !== "level") return "";

  switch (label.normalizedName?.toUpperCase() ?? label.name.toUpperCase()) {
    case "A1":
    case "A2":
      return "border-label-cefr-basic-foreground/20 bg-label-cefr-basic text-label-cefr-basic-foreground";
    case "B1":
    case "B2":
      return "border-label-cefr-independent-foreground/20 bg-label-cefr-independent text-label-cefr-independent-foreground";
    case "C1":
    case "C2":
      return "border-label-cefr-proficient-foreground/20 bg-label-cefr-proficient text-label-cefr-proficient-foreground";
    default:
      return "";
  }
}

export function FlashcardLabelBadges({
  labels = [],
  limit,
}: {
  labels?: FlashcardLabel[];
  limit?: number;
}) {
  const sortedLabels = sortFlashcardLabels(labels);
  const visibleLabels = limit ? sortedLabels.slice(0, limit) : sortedLabels;
  const overflowCount = sortedLabels.length - visibleLabels.length;

  if (!sortedLabels.length) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Flashcard labels">
      {visibleLabels.map((label) => (
        <Tag
          key={label.id}
          size="sm"
          variant={labelVariant[label.type]}
          className={`h-5 max-w-44 px-1.5 text-[11px] font-bold ${getFlashcardLabelToneClassName(label)}`}
          title={`${label.type}: ${label.name}`}
        >
          {label.type === "custom" && label.color ? (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: label.color }}
            />
          ) : null}
          <span className="truncate">{label.name}</span>
          <span className="sr-only"> ({label.type})</span>
        </Tag>
      ))}
      {overflowCount > 0 ? (
        <Tag
          size="sm"
          variant="outline"
          className="h-5 px-1.5 text-[11px] font-bold"
          aria-label={`Show ${overflowCount} more labels`}
          title={sortedLabels.slice(visibleLabels.length).map((label) => label.name).join(", ")}
        >
          +{overflowCount}
        </Tag>
      ) : null}
    </div>
  );
}
