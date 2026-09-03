import { ArrowUp, Sparkle } from "@phosphor-icons/react";

import { Icon } from "@/components/ui/icon";
import type { ProgressTransition } from "@/lib/progress-transition";

export function LevelUpPanel({
  transition,
}: {
  transition: ProgressTransition;
}) {
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <div className="relative grid size-24 place-items-center rounded-full border border-brand-200 bg-brand-50 text-primary">
        <Icon icon={ArrowUp} className="size-12" weight="bold" />
        <Icon
          icon={Sparkle}
          className="absolute -right-1 top-1 size-6 text-secondary"
          weight="fill"
        />
      </div>
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">
          Level up
        </p>
        <p className="mt-2 text-4xl font-extrabold text-primary">
          Level {transition.currentLevel}
        </p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {transition.levelsGained > 1
            ? `You gained ${transition.levelsGained} levels.`
            : "You reached a new level."}
        </p>
      </div>
    </div>
  );
}
