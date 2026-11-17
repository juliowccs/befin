import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-editorial hover:bg-primary/92",
        secondary:
          "bg-surface-lavender text-primary hover:bg-surface-lavender-strong",
        outline:
          "border border-border-subtle bg-surface text-primary hover:bg-surface-lavender/60",
        ghost:
          "text-primary hover:bg-surface-lavender/70",
        accent:
          "bg-accent text-white shadow-editorial hover:bg-accent/90",
        sage:
          "bg-sage-bg text-sage-text border border-sage-text/15 hover:bg-sage-bg/85",
        amber:
          "bg-amber-bg text-amber-text border border-amber-text/15 hover:bg-amber-bg/85",
        mauve:
          "bg-mauve-bg text-mauve-text border border-mauve-text/15 hover:bg-mauve-bg/85",
        coral:
          "bg-coral-bg text-coral-text border border-coral-text/15 hover:bg-coral-bg/85",
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        sm: "min-h-9 rounded-xl px-3.5 text-xs",
        lg: "min-h-12 rounded-2xl px-6 text-base",
        icon: "h-11 w-11 rounded-2xl p-0",
        "icon-sm": "h-9 w-9 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
