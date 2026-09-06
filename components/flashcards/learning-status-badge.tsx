import { Badge } from "@/components/ui/badge";
import type { FlashcardStatus } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const statusStyles: Record<FlashcardStatus, string> = {
  new: "border-status-new-foreground/20 bg-status-new text-status-new-foreground",
  learning:
    "border-status-learning-foreground/20 bg-status-learning text-status-learning-foreground",
  reviewing:
    "border-label-cefr-independent-foreground/20 bg-label-cefr-independent text-label-cefr-independent-foreground",
  mastered:
    "border-status-mastered-foreground/20 bg-status-mastered text-status-mastered-foreground",
};

export function LearningStatusBadge({
  status,
  className,
}: {
  status: FlashcardStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", statusStyles[status], className)}
    >
      {status}
    </Badge>
  );
}
