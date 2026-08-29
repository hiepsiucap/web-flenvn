import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textVariants = cva("", {
  variants: {
    as: {
      p: "",
      span: "",
      div: "",
    },
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",
      inverse: "text-primary-foreground",
    },
    leading: {
      none: "leading-none",
      tight: "leading-tight",
      normal: "leading-normal",
      relaxed: "leading-7",
    },
    balance: {
      true: "text-balance",
      false: "",
    },
  },
  defaultVariants: {
    as: "p",
    size: "base",
    weight: "normal",
    tone: "default",
    leading: "normal",
    balance: false,
  },
})

type TextProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    as?: "p" | "span" | "div"
  }

function Text({
  as = "p",
  size,
  weight,
  tone,
  leading,
  balance,
  className,
  ...props
}: TextProps) {
  const Component = as

  return (
    <Component
      data-slot="text"
      className={cn(
        textVariants({ as, size, weight, tone, leading, balance }),
        className
      )}
      {...props}
    />
  )
}

export { Text, textVariants }
