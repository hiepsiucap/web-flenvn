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
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full border border-foreground/20 bg-background px-3 text-sm font-bold text-foreground transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:border-foreground/40 hover:bg-accent hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none",
        selected && "border-foreground bg-foreground text-background shadow-sm ring-2 ring-foreground/15",
        className
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}
