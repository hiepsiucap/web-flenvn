import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  selected?: boolean;
  leadingIcon?: ReactNode;
};

export function Chip({
  children,
  className,
  leadingIcon,
  selected = false,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      data-slot="chip"
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-bold text-foreground transition-[background-color,color,border-color,box-shadow,transform] [transition-duration:var(--motion-quick)] [transition-timing-function:var(--ease-motion-out)] hover:-translate-y-px hover:border-border hover:bg-accent hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:border-border focus-visible:ring-3 focus-visible:ring-border disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none dark:border-border dark:hover:border-border",
        selected && "border-border bg-primary text-primary-foreground shadow-sm ring-2 ring-border dark:border-border",
        className
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}
