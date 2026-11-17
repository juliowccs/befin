import * as React from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, style, ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          ...style,
        }}
        className={cn(
          "flex min-h-11 w-full appearance-none rounded-2xl border border-border-subtle bg-surface px-4 py-2.5 pr-10 text-sm font-medium text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        size={16}
        weight="bold"
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
      />
    </div>
  );
}
