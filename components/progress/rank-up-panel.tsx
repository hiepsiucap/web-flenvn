"use client";

import { useState } from "react";
import Image from "next/image";
import { Medal, Sparkle } from "@phosphor-icons/react";

import { Icon } from "@/components/ui/icon";
import type { ProgressTransition } from "@/lib/progress-transition";

export function RankUpPanel({
  transition,
}: {
  transition: ProgressTransition;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const rank = transition.currentRank;

  return (
    <div className="relative grid justify-items-center gap-4 text-center">
      <div className="relative grid size-40 place-items-center">
        {rank.imageUrl && !imageFailed ? (
          <Image
            src={rank.imageUrl}
            alt={`${rank.displayName} rank badge`}
            width={160}
            height={160}
            className="size-36 object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="grid size-32 place-items-center rounded-full border border-brand-200 bg-brand-50 text-primary">
            <Icon icon={Medal} className="size-16" weight="duotone" />
          </div>
        )}
        <Icon
          icon={Sparkle}
          className="absolute right-0 top-3 size-7 text-secondary"
          weight="fill"
        />
        <Icon
          icon={Sparkle}
          className="absolute bottom-4 left-1 size-5 text-brand-400"
          weight="fill"
        />
      </div>
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">
          Rank up
        </p>
        <p className="mt-2 text-3xl font-extrabold text-primary">
          {rank.displayName}
        </p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          A new badge is now yours.
        </p>
      </div>
    </div>
  );
}
