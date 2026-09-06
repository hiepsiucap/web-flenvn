"use client";

import { Spinner as Loader2, ArrowClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { LabelingStatus as LabelingStatusValue } from "@/lib/dashboard-data";

export function LabelingStatus({
  status,
  timedOut = false,
  retrying = false,
  onRetry,
}: {
  status?: LabelingStatusValue;
  timedOut?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
}) {
  if (!status || status === "completed") return null;

  if (status === "failed") {
    return (
      <div className="flex flex-wrap items-center gap-2" role="status">
        <Text size="xs" tone="muted">Labels unavailable</Text>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" disabled={retrying} onClick={onRetry}>
            <Icon icon={retrying ? Loader2 : ArrowClockwise} className={retrying ? "animate-spin" : undefined} />
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" role="status" aria-live="polite">
      {!timedOut && status === "processing" ? (
        <Icon icon={Loader2} size="sm" className="animate-spin text-muted-foreground" />
      ) : null}
      <Text size="xs" tone="muted">
        {timedOut
          ? "Labels are processing in the background"
          : status === "processing"
            ? "Generating labels…"
            : "Labeling…"}
      </Text>
    </div>
  );
}
