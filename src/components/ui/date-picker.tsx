"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function parseIsoDate(iso: string): Date {
  const parts = iso.split("-").map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateBr(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const selectedDate = React.useMemo(() => parseIsoDate(value), [value]);
  const [viewYear, setViewYear] = React.useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selectedDate.getMonth());
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    openUpwards: boolean;
  } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const [prevOpen, setPrevOpen] = React.useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }

  const updatePosition = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 320 && rect.top > spaceBelow;
    const popoverWidth = 280;
    const left = Math.min(
      Math.max(12, rect.right - popoverWidth),
      window.innerWidth - popoverWidth - 12
    );
    setCoords({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left,
      openUpwards,
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleScrollOrResize = () => updatePosition();

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, updatePosition]);

  const todayIso = React.useMemo(() => toIsoDate(new Date()), []);

  const days = React.useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; iso: string | null }> = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(new Date(viewYear, viewMonth, d));
      cells.push({ day: d, iso });
    }
    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? "Selecionar data"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-surface px-4 py-2.5 text-left text-sm font-medium text-primary tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          open && "border-accent ring-2 ring-accent/40",
          className
        )}
      >
        <span>{formatDateBr(value)}</span>
        <CalendarBlank
          size={16}
          weight="duotone"
          aria-hidden="true"
          className="shrink-0 text-text-secondary"
        />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: 280,
              transform: coords.openUpwards ? "translateY(-100%)" : undefined,
              zIndex: 100,
            }}
            className="rounded-2xl border border-border-subtle bg-surface p-3.5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={prevMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-canvas hover:text-primary transition-colors cursor-pointer"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
              <span className="font-display text-sm font-bold text-primary">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={nextMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-canvas hover:text-primary transition-colors cursor-pointer"
              >
                <CaretRight size={15} weight="bold" />
              </button>
            </div>

            <div className="mb-1.5 grid grid-cols-7 text-center">
              {WEEKDAYS.map((wd, idx) => (
                <span
                  key={idx}
                  className="py-1 text-[11px] font-semibold text-text-secondary"
                >
                  {wd}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((cell, idx) => {
                if (!cell.day || !cell.iso) {
                  return <span key={`empty-${idx}`} className="h-8" />;
                }
                const isSelected = cell.iso === value;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => {
                      onChange(cell.iso!);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-xl text-xs font-medium tabular-nums transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary font-bold text-white"
                        : isToday
                          ? "bg-surface-lavender font-bold text-primary"
                          : "text-primary hover:bg-canvas"
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex justify-end border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange(todayIso);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-accent hover:bg-surface-lavender transition-colors cursor-pointer"
              >
                Hoje
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
