"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  checked,
  onCheckedChange,
  onClick,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && !disabled) {
      onCheckedChange?.(!checked);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "t-check inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        checked
          ? "border-primary bg-primary text-white"
          : "border-accent-soft bg-surface hover:border-accent",
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 12 10"
        fill="none"
        aria-hidden="true"
        className="h-3.5 w-3.5"
      >
        <path
          d="M1.5 5.2L4.5 8.2L10.5 1.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
