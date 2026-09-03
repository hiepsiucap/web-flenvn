import Image from "next/image";
import { Star } from "@phosphor-icons/react";

import { Icon } from "@/components/ui/icon";
import progressPenguin from "@/img/icon-penguin.png";
import progressBackground from "@/img/progress-background.png";
import progressStart from "@/img/start.png";
import { cn } from "@/lib/utils";

type RankLevelProgressProps = {
  progress: number;
  xpLabel: string;
  className?: string;
  compact?: boolean;
  showStart?: boolean;
};

export function RankLevelProgress({
  progress,
  xpLabel,
  className,
  compact = false,
  showStart = true,
}: RankLevelProgressProps) {
  const safeProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className={cn(
      "relative w-full",
      compact ? "h-7" : "h-9",
      showStart && (compact ? "pl-3" : "pl-4"),
      className
    )}>
      <div
        className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full border-2 border-primary/15 bg-brand-50",
          showStart ? (compact ? "left-3" : "left-4") : "left-0",
          compact ? "h-3.5" : "h-[18px]"
        )}
        role="progressbar"
        aria-label="Experience toward the next level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgress}
      >
        <span className="absolute left-[8%] right-[5%] top-1/2 -translate-y-1/2 border-t-2 border-dashed border-primary/20" />
        {[28, 50, 70].map((position) => (
          <span
            key={position}
            className="absolute inset-y-0 z-10 grid w-5 place-items-center bg-brand-50 text-primary/20"
            style={{ left: `${position}%` }}
          >
            <Icon icon={Star} className={compact ? "size-2.5" : "size-3"} weight="bold" />
          </span>
        ))}
        <span className={cn(
          "absolute inset-y-0 right-2 z-20 flex items-center bg-brand-50 px-1 font-extrabold text-primary/70",
          compact ? "text-[8px]" : "text-[9px]"
        )}>
          {xpLabel}
        </span>
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
          style={{ width: `${safeProgress}%` }}
        >
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${progressBackground.src})` }}
          />
        </div>
        <Image
          src={progressPenguin}
          alt=""
          className={cn(
            "absolute top-[calc(50%-1px)] z-20 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain",
            compact ? "size-7" : "size-8"
          )}
          style={{ left: `${Math.min(98, Math.max(2, safeProgress))}%` }}
        />
      </div>
      {showStart && (
        <Image
          src={progressStart}
          alt="Start"
          className={cn(
            "absolute left-0 top-1/2 z-30 -translate-y-1/2 object-contain",
            compact ? "size-7" : "size-8"
          )}
        />
      )}
    </div>
  );
}
