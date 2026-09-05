"use client";

import { useState } from "react";
import NextImage from "next/image";
import { ArrowCounterClockwise, Check, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { PuzzleToken } from "@/lib/practice-games";
import { cn } from "@/lib/utils";
import puzzlePenguin from "@/img/penguin-game.png";

export type SentencePuzzleFeedback = {
  result: "correct" | "incorrect" | "skipped";
  canRetry?: boolean;
};

type SentencePuzzleProps = {
  tokens: PuzzleToken[];
  correctSentence: string;
  translation?: string | null;
  feedback: SentencePuzzleFeedback | null;
  disabled: boolean;
  onEdit: () => void;
  onSkip: () => void;
  onSubmit: (sentence: string) => void;
};

export function SentencePuzzle({
  tokens,
  correctSentence,
  translation,
  feedback,
  disabled,
  onEdit,
  onSkip,
  onSubmit,
}: SentencePuzzleProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedTokens = selectedIds
    .map((id) => tokens.find((token) => token.id === id))
    .filter((token): token is PuzzleToken => Boolean(token));
  const availableTokens = tokens.filter((token) => !selectedIds.includes(token.id));
  const sentence = selectedTokens.map((token) => token.text).join(" ");
  const isLocked = disabled || Boolean(feedback && !feedback.canRetry);

  function edit(nextIds: string[]) {
    if (isLocked) return;
    onEdit();
    setSelectedIds(nextIds);
  }

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "relative mt-7 grid min-h-56 content-end overflow-visible rounded-2xl border border-dashed border-brand-300 bg-brand-50/45 px-4 pb-4 pt-20 transition-colors sm:px-6",
          feedback?.result === "correct" &&
            "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
          feedback?.result === "incorrect" &&
            "border-destructive bg-destructive/5 ring-3 ring-destructive/15"
        )}
        aria-invalid={feedback?.result === "incorrect"}
      >
        <NextImage
          src={puzzlePenguin}
          alt=""
          className="pointer-events-none absolute left-1/2 top-0 h-28 w-auto -translate-x-1/2 -translate-y-1/2 object-contain sm:h-32"
          aria-hidden="true"
        />

        <div className="grid gap-2.5">
          <div className="flex min-h-14 flex-wrap items-center justify-center gap-2">
            {tokens.map((token, slotIndex) => {
              const selectedToken = selectedTokens[slotIndex];

              return selectedToken ? (
                <button
                  key={token.id}
                  type="button"
                  className="min-h-11 w-24 rounded-xl border border-brand-300 bg-background px-2 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none sm:w-28 sm:text-base"
                  disabled={isLocked}
                  onClick={() =>
                    edit(selectedIds.filter((id) => id !== selectedToken.id))
                  }
                  aria-label={`Remove ${selectedToken.text} from sentence`}
                >
                  {selectedToken.text}
                </button>
              ) : (
                <span
                  key={token.id}
                  className="h-11 w-24 rounded-xl border border-dashed border-brand-300/90 bg-background/55 px-2 sm:w-28"
                  aria-hidden="true"
                />
              );
            })}
          </div>

          {feedback?.result === "correct" ? (
            <div className="text-center" role="status">
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Correct sentence
              </p>
              <p className="text-xs text-muted-foreground">
                This order matches the original example{translation ? `: ${translation}` : "."}
              </p>
            </div>
          ) : feedback?.result === "incorrect" ? (
            <p className="text-center text-sm font-semibold text-destructive" role="status">
              The word order is not correct yet. Try again.
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground sm:text-sm">
              Tap the words below to build the sentence
            </p>
          )}
        </div>
      </div>

      <div className="flex min-h-24 flex-wrap content-center justify-center gap-2.5 py-1 sm:gap-3">
        {availableTokens.map((token) => (
          <button
            key={token.id}
            type="button"
            className="min-h-11 rounded-xl border border-amber-300 bg-amber-100 px-4 text-sm font-bold text-amber-950 shadow-[0_3px_0_#f5b82e] outline-none transition-transform hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:ring-3 focus-visible:ring-amber-400/50 active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-45 sm:min-h-12 sm:px-5 sm:text-base"
            disabled={isLocked}
            onClick={() => edit([...selectedIds, token.id])}
          >
            {token.text}
          </button>
        ))}
      </div>

      <div className="flex h-12 items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={disabled}
          onClick={onSkip}
        >
          <Icon icon={X} weight="bold" />
          Skip
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isLocked || selectedIds.length === 0}
            onClick={() => edit(selectedIds.slice(0, -1))}
            aria-label="Undo last word"
            title="Undo last word"
          >
            <Icon icon={ArrowCounterClockwise} />
          </Button>
          <Button
            type="button"
            className="min-w-28 rounded-xl"
            disabled={isLocked || selectedIds.length !== tokens.length}
            onClick={() => onSubmit(sentence)}
          >
            <Icon icon={Check} weight="bold" />
            Check
          </Button>
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {feedback?.result === "correct" ? correctSentence : ""}
      </span>
    </div>
  );
}
