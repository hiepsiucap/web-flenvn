import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
  IconWeight,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

type IconProps = Omit<PhosphorIconProps, "as" | "weight"> & {
  icon: PhosphorIcon
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  weight?: IconWeight
}

const iconSizes = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
  xl: "size-6",
}

function Icon({
  icon: IconComponent,
  size = "md",
  weight = "regular",
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: IconProps) {
  return (
    <IconComponent
      aria-hidden={ariaHidden}
      className={cn(iconSizes[size], className)}
      weight={weight}
      {...props}
    />
  )
}

export { Icon }
export type { IconProps }
