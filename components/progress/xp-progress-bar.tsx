"use client";

import { useEffect, useState } from "react";

import type { ProgressTransition } from "@/lib/progress-transition";

export function XpProgressBar({
  reducedMotion,
  transition,
}: {
  reducedMotion: boolean;
  transition: ProgressTransition;
}) {
  const targetProgress = transition.rankedUp
    ? 100
    : transition.currentRank.progressPercent;
  const [displayedExp, setDisplayedExp] = useState(transition.previousExp);
  const [displayedProgress, setDisplayedProgress] = useState(
    transition.previousRank.progressPercent
  );

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 800;

    function update(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayedExp(
        Math.round(
          transition.previousExp +
            (transition.currentExp - transition.previousExp) * easedProgress
        )
      );
      setDisplayedProgress(
        transition.previousRank.progressPercent +
          (targetProgress - transition.previousRank.progressPercent) *
            easedProgress
      );

      if (progress < 1) {
        frame = window.requestAnimationFrame(update);
      }
    }

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, targetProgress, transition]);

  const visibleExp = reducedMotion ? transition.currentExp : displayedExp;
  const visibleProgress = reducedMotion
    ? targetProgress
    : displayedProgress;

  return (
    <div className="grid w-full gap-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Experience gained
          </p>
          <p className="mt-1 text-4xl font-extrabold text-primary">
            +{transition.xpEarned} XP
          </p>
        </div>
        <p className="text-sm font-bold tabular-nums text-brand-700">
          {visibleExp.toLocaleString()} XP
        </p>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-brand-100"
        role="progressbar"
        aria-label="Rank progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(visibleProgress)}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, visibleProgress))}%` }}
        />
      </div>
      <p className="text-center text-xs font-semibold text-muted-foreground">
        {transition.rankedUp
          ? "Rank requirement completed"
          : `${Math.round(visibleProgress)}% toward the next rank`}
      </p>
    </div>
  );
}
