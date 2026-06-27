import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-black",
  {
    variants: {
      variant: {
        default:
          "border border-black bg-black text-white",
        secondary:
          "border border-[#e4e4e7] bg-[#f4f4f5] text-black",
        destructive:
          "border border-red-200 bg-red-50 text-red-600",
        outline: "border border-[#e4e4e7] bg-white text-black",
        cyan: "border border-[#e4e4e7] bg-[#f4f4f5] text-black",
        purple: "border border-[#e4e4e7] bg-[#f4f4f5] text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
