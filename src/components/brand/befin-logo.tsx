import { cn } from "@/lib/utils";

export function BefinWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display text-2xl font-bold tracking-tight text-primary select-none",
        className
      )}
      aria-label="befin"
    >
      <span>bef</span>
      <span className="relative inline-block">
        <span aria-hidden="true">ı</span>
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[0.06em] h-[0.26em] w-[0.26em] -translate-x-1/2 rounded-full bg-accent ring-2 ring-accent-soft/60"
        />
      </span>
      <span>n</span>
    </span>
  );
}

export function BefinMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white shadow-editorial select-none",
        className
      )}
    >
      <span className="font-display text-lg font-bold leading-none">B</span>
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5"
      >
        <path
          d="M2 12C2 6.5 5.5 2 12 2C12 8.5 7.5 12 2 12Z"
          fill="#C7C2EC"
          stroke="#2E294E"
          strokeWidth="1.2"
        />
      </svg>
    </span>
  );
}
