"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { editorialSpring, fastTransition, gentleSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export interface OverlayShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "dialog" | "drawer";
  closeDurationMs?: number;
  contentClassName?: string;
  showHandleBar?: boolean;
  children: React.ReactNode;
}

export function OverlayShell({
  open,
  onOpenChange,
  variant = "dialog",
  contentClassName,
  showHandleBar = false,
  children,
}: OverlayShellProps) {
  const isClient = useIsClient();
  const isDrawer = variant === "drawer" || showHandleBar;
  const dragControls = useDragControls();

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!isClient) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          key="overlay-shell"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="presentation"
        >
          <motion.div
            aria-hidden="true"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastTransition}
            className="fixed inset-0 bg-primary/30 backdrop-blur-[2px]"
          />
          {isDrawer ? (
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0, transition: gentleSpring }}
              exit={{ opacity: 0, y: "100%", transition: fastTransition }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 450) {
                  onOpenChange(false);
                }
              }}
              className={cn(
                "relative z-10 w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl border border-border-subtle bg-surface p-5 pb-8 sm:p-6 shadow-editorial-lg",
                contentClassName
              )}
            >
              {showHandleBar && (
                <div
                  aria-hidden="true"
                  onPointerDown={(e) => dragControls.start(e)}
                  className="mx-auto mb-2 flex w-full cursor-grab items-center justify-center py-2 touch-none active:cursor-grabbing sm:hidden"
                >
                  <div className="h-1.5 w-12 rounded-full bg-border-subtle" />
                </div>
              )}
              {children}
            </motion.div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: editorialSpring }}
              exit={{ opacity: 0, scale: 0.96, y: 4, transition: fastTransition }}
              className={cn(
                "relative z-10 w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border-subtle bg-surface p-5 sm:p-6 shadow-editorial-lg",
                contentClassName
              )}
            >
              {children}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function OverlayHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 pb-4", className)}
      {...props}
    />
  );
}

export function OverlayTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-display text-xl font-bold tracking-tight text-primary",
        className
      )}
      {...props}
    />
  );
}

export function OverlayDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm text-text-secondary", className)} {...props} />
  );
}

export function OverlayCloseButton({
  onClick,
  ariaLabel = "Fechar",
  className,
}: {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-lavender text-primary transition-colors hover:bg-surface-lavender-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
        className
      )}
    >
      <X size={18} weight="bold" />
    </button>
  );
}
