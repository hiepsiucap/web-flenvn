"use client";

import { useEffect, useState } from "react";
import { Check, Sparkle } from "@phosphor-icons/react";

import { LevelUpPanel } from "@/components/progress/level-up-panel";
import { RankUpPanel } from "@/components/progress/rank-up-panel";
import { XpProgressBar } from "@/components/progress/xp-progress-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import type { ProgressTransition } from "@/lib/progress-transition";

type CelebrationPhase = "xp" | "level-up" | "rank-up" | "complete";

export function ProgressCelebration({
  transition,
  open,
  onComplete,
}: {
  transition: ProgressTransition;
  open: boolean;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<CelebrationPhase>(
    getFirstPhase(transition)
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!open || phase === "complete" || reducedMotion) return;

    const timeout = window.setTimeout(
      () => setPhase(getNextPhase(phase, transition)),
      getPhaseDuration(phase)
    );

    return () => window.clearTimeout(timeout);
  }, [open, phase, reducedMotion, transition]);

  const celebrationComplete = reducedMotion || phase === "complete";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onComplete();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="px-6 pt-6 text-center sm:px-8 sm:pt-8">
          <DialogTitle>Practice progress</DialogTitle>
          <DialogDescription>
            Your saved session has updated your learning progress.
          </DialogDescription>
        </DialogHeader>

        <div
          key={phase}
          role="status"
          aria-live="polite"
          className="grid min-h-72 place-items-center px-6 py-8 animate-[score-pop_450ms_ease-out] motion-reduce:animate-none sm:px-10"
        >
          {reducedMotion ? (
            <div className="grid justify-items-center gap-5 text-center">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">
                  Progress saved
                </p>
                <p className="mt-2 text-4xl font-extrabold text-primary">
                  +{transition.xpEarned} XP
                </p>
              </div>
              <div className="grid gap-2 text-sm font-semibold text-muted-foreground">
                {transition.leveledUp ? (
                  <p>New level: {transition.currentLevel}</p>
                ) : null}
                {transition.rankedUp ? (
                  <p>New rank: {transition.currentRank.displayName}</p>
                ) : null}
              </div>
            </div>
          ) : phase === "xp" ? (
            <XpProgressBar
              reducedMotion={reducedMotion}
              transition={transition}
            />
          ) : phase === "level-up" ? (
            <LevelUpPanel transition={transition} />
          ) : phase === "rank-up" ? (
            <RankUpPanel transition={transition} />
          ) : (
            <div className="grid justify-items-center gap-4 text-center">
              <div className="relative grid size-24 place-items-center rounded-full bg-primary text-primary-foreground">
                <Icon icon={Check} className="size-12" weight="bold" />
                <Icon
                  icon={Sparkle}
                  className="absolute -right-1 top-0 size-6 text-secondary"
                  weight="fill"
                />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-primary">Progress saved</p>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  Keep the momentum going in your next review.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 flex-row justify-between rounded-none bg-muted/30 px-6 py-4 sm:px-8">
          {celebrationComplete ? (
            <span className="text-xs font-semibold text-muted-foreground">
              Celebration complete
            </span>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onComplete}>
              Skip animation
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!celebrationComplete}
            onClick={onComplete}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getFirstPhase(transition: ProgressTransition): CelebrationPhase {
  if (transition.xpEarned > 0) return "xp";
  if (transition.leveledUp) return "level-up";
  if (transition.rankedUp) return "rank-up";
  return "complete";
}

function getNextPhase(
  phase: CelebrationPhase,
  transition: ProgressTransition
): CelebrationPhase {
  if (phase === "xp" && transition.leveledUp) return "level-up";
  if ((phase === "xp" || phase === "level-up") && transition.rankedUp) {
    return "rank-up";
  }
  return "complete";
}

function getPhaseDuration(phase: CelebrationPhase) {
  if (phase === "xp") return 900;
  if (phase === "level-up") return 1100;
  return 1700;
}
