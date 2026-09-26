import Image from "next/image";
import { useId, type ReactNode } from "react";

import emptyFolderImage from "../../img/empty-folder.png";
import { cn } from "../../lib/utils";
import { Text } from "./text";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "page" | "panel" | "compact";
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  variant = "page",
  className,
}: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "grid place-items-center px-6 text-center",
        variant === "page" && "min-h-[min(520px,65vh)] py-12",
        variant === "panel" && "min-h-56 py-8",
        variant === "compact" && "min-h-32 py-5",
        className
      )}
    >
      <div className="flex max-w-sm flex-col items-center">
        {variant === "page" ? (
          <Image src={emptyFolderImage} alt="" className="h-auto w-40 sm:w-48" />
        ) : null}
        <h2 id={titleId} className={variant === "page" ? "mt-5" : undefined}>
          <Text as="span" className={variant === "compact" ? "text-sm" : "text-lg"} weight="semibold">
            {title}
          </Text>
        </h2>
        {description ? (
          <Text className="mt-2" size={variant === "compact" ? "xs" : "sm"} tone="muted">
            {description}
          </Text>
        ) : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </section>
  );
}
