import type { HTMLAttributes, ReactNode } from "react"
import { X } from "@phosphor-icons/react"
import { cva, type VariantProps } from "class-variance-authority"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

const tagVariants = cva(
  "inline-flex w-fit max-w-full items-center border font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-foreground",
        primary: "border-primary/20 bg-primary/10 text-primary",
        success:
          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        warning:
          "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border bg-background text-foreground",
      },
      size: {
        sm: "h-6 gap-1 rounded-full px-2 text-xs",
        md: "h-8 gap-1.5 rounded-full px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
)

type TagProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof tagVariants> & {
    leadingIcon?: ReactNode
    onRemove?: () => void
    removeLabel?: string
  }

function Tag({
  children,
  className,
  leadingIcon,
  onRemove,
  removeLabel = "Remove tag",
  size = "md",
  variant = "neutral",
  ...props
}: TagProps) {
  return (
    <span
      data-slot="tag"
      className={cn(
        tagVariants({ size, variant }),
        onRemove && (size === "sm" ? "pr-1" : "pr-1.5"),
        className
      )}
      {...props}
    >
      {leadingIcon ? (
        <span className="flex shrink-0 items-center" data-slot="tag-icon">
          {leadingIcon}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className={cn(
            "grid shrink-0 place-items-center rounded-full text-current opacity-70 outline-none transition-colors hover:bg-foreground/10 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60",
            size === "sm" ? "size-4" : "size-5"
          )}
          onClick={onRemove}
          aria-label={removeLabel}
          data-slot="tag-remove"
        >
          <Icon icon={X} size="xs" weight="bold" />
        </button>
      ) : null}
    </span>
  )
}

export { Tag, tagVariants }
export type { TagProps }
