import { cn } from "@/lib/utils";

type PracticeEnergyProgressProps = {
  progress: number;
  segments: number;
};

export function PracticeEnergyProgress({
  progress,
  segments,
}: PracticeEnergyProgressProps) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  const total = Math.max(1, segments);
  const currentStep = Math.max(1, Math.round((safeProgress / 100) * total));

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-label="Practice stage position"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={currentStep}
      aria-valuetext={`Stage ${currentStep} of ${total}`}
    >
      {total <= 12 ? (
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                index < currentStep - 1
                  ? "bg-primary"
                  : index === currentStep - 1
                    ? "bg-primary/40"
                    : "bg-muted"
              )}
            />
          ))}
        </div>
      ) : (
        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
