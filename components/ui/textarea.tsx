import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-border bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-3 focus-visible:ring-border focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-border aria-invalid:ring-3 aria-invalid:ring-border md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-border dark:aria-invalid:ring-border",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
