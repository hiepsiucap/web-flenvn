import { BeatLoader, HashLoader } from "react-spinners";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title?: string;
  description?: string;
  variant?: "page" | "panel" | "inline";
  className?: string;
};

function LoadingState({
  title = "Loading",
  description = "Getting everything ready.",
  variant = "panel",
  className,
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <span
        className={cn("inline-flex items-center gap-2 text-sm font-semibold", className)}
        role="status"
        aria-live="polite"
      >
        <BeatLoader color="var(--primary)" size={6} speedMultiplier={0.85} />
        {title}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "grid place-items-center px-6 py-12",
        variant === "page" && "min-h-[calc(100vh-9rem)]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="grid size-24 place-items-center rounded-full bg-brand-50 shadow-inner shadow-brand-200/60">
          <HashLoader
            color="var(--primary)"
            size={52}
            speedMultiplier={0.82}
            aria-label={title}
          />
        </div>

        <Text as="div" className="mt-5 text-lg font-extrabold tracking-normal">
          {title}
        </Text>
        <Text className="mt-2 text-sm text-muted-foreground" weight="semibold">
          {description}
        </Text>
      </div>
    </div>
  );
}

export { LoadingState };
