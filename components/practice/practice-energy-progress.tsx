import Image from "next/image";

import progressPenguin from "@/img/icon-penguin.png";
import progressBackground from "@/img/progress-background.png";

type PracticeEnergyProgressProps = {
  progress: number;
  segments: number;
};

export function PracticeEnergyProgress({
  progress,
  segments,
}: PracticeEnergyProgressProps) {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="relative h-9 w-full px-1">
      <div
        className="absolute inset-x-1 top-1/2 h-3 -translate-y-1/2 rounded-full bg-brand-100 ring-1 ring-primary/10"
        role="progressbar"
        aria-label="Practice stage progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeProgress)}
      >
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
        >
          <div
            className="h-full w-full animate-[practice-energy-flow_1.8s_linear_infinite] bg-[length:180px_100%] motion-reduce:animate-none"
            style={{ backgroundImage: `url(${progressBackground.src})` }}
          />
          <span className="absolute inset-x-1 top-0 h-px bg-white/70" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex overflow-hidden rounded-full">
          {Array.from({ length: Math.max(1, segments) }).map((_, index) => (
            <span
              key={index}
              className="flex-1 border-r border-background/75 last:border-r-0"
            />
          ))}
        </div>

        <Image
          src={progressPenguin}
          alt=""
          className="absolute top-1/2 z-10 size-8 max-w-none animate-[practice-progress-bob_1.6s_ease-in-out_infinite] object-contain drop-shadow-sm motion-reduce:-translate-x-1/2 motion-reduce:-translate-y-1/2 motion-reduce:animate-none"
          style={{ left: `${Math.min(98, Math.max(2, safeProgress))}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
