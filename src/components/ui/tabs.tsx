"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { editorialSpring, fastTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  tabsId: string;
  value: string;
  onValueChange: (nextValue: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs components must be used within <Tabs>");
  }
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const tabsId = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ tabsId, value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn("flex flex-col gap-3", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-2xl bg-surface-lavender p-1.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  children,
  onClick,
  ...props
}: TabsTriggerProps) {
  const { tabsId, value: activeValue, onValueChange } = useTabsContext();
  const isSelected = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onValueChange(value);
        }
      }}
      className={cn(
        "relative z-10 flex-1 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isSelected
          ? "text-primary"
          : "text-text-secondary hover:text-primary",
        className
      )}
      {...props}
    >
      {isSelected && (
        <motion.span
          layoutId={`tab-pill-${tabsId}`}
          transition={editorialSpring}
          className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-sm"
        />
      )}
      {children}
    </button>
  );
}

export interface TabsContentProps
  extends Omit<HTMLMotionProps<"div">, "children"> {
  value: string;
  children?: React.ReactNode;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) {
    return null;
  }

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fastTransition}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
