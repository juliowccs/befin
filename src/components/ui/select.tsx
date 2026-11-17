"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SelectOptionItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  children?: React.ReactNode;
  options?: SelectOptionItem[];
}

function extractOptions(children: React.ReactNode): SelectOptionItem[] {
  const options: SelectOptionItem[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === React.Fragment) {
      const fragmentProps = child.props as { children?: React.ReactNode };
      options.push(...extractOptions(fragmentProps.children));
      return;
    }

    if (child.type === "option") {
      const optProps = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      const rawValue = optProps.value ?? (typeof optProps.children === "string" ? optProps.children : "");
      options.push({
        value: String(rawValue),
        label: optProps.children,
        disabled: optProps.disabled,
      });
    }
  });

  return options;
}

export function Select({
  className,
  children,
  options: optionsProp,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const options = React.useMemo(
    () => optionsProp ?? extractOptions(children),
    [optionsProp, children]
  );
  const [internalValue, setInternalValue] = React.useState<string>(() =>
    defaultValue !== undefined ? String(defaultValue) : (options[0]?.value ?? "")
  );
  const currentValue = value !== undefined ? String(value) : internalValue;

  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
  } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const selectedOption =
    options.find((opt) => opt.value === currentValue) ?? options[0];

  const updatePosition = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 220 && rect.top > spaceBelow;
    setCoords({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
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
        menuRef.current?.contains(target)
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

  function handleSelect(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    if (onChange) {
      const syntheticEvent = {
        target: { value: nextValue },
        currentTarget: { value: nextValue },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  const listboxId = React.useId();

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-surface px-4 py-2.5 text-left text-sm font-medium text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          open && "border-accent ring-2 ring-accent/40",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center">{selectedOption.icon}</span>
          )}
          <span className="truncate">{selectedOption?.label ?? ""}</span>
        </span>
        <CaretDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className={cn(
            "shrink-0 text-text-secondary transition-transform duration-150",
            open && "rotate-180 text-primary"
          )}
        />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUpwards ? "translateY(-100%)" : undefined,
              zIndex: 100,
            }}
            className="max-h-60 overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-1.5 shadow-xl"
          >
            {options.map((opt) => {
              const isSelected = opt.value === currentValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                    isSelected
                      ? "bg-surface-lavender font-semibold text-primary"
                      : "font-medium text-primary hover:bg-canvas",
                    opt.disabled && "cursor-not-allowed opacity-45"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {opt.icon && (
                      <span className="shrink-0 flex items-center">{opt.icon}</span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check
                      size={15}
                      weight="bold"
                      className="shrink-0 text-accent"
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
