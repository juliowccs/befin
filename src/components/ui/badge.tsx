import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        lavender: "bg-surface-lavender text-primary",
        sage: "bg-sage-bg text-sage-text",
        amber: "bg-amber-bg text-amber-text",
        mauve: "bg-mauve-bg text-mauve-text",
        coral: "bg-coral-bg text-coral-text",
        outline: "border border-border-subtle bg-surface text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "lavender",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
