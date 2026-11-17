"use client";

import * as React from "react";
import { Serwist } from "@serwist/window";
import { AnimatePresence, motion } from "motion/react";
import { ArrowsClockwise, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { editorialSpring } from "@/lib/motion";

export interface SwUpdateState {
  hasUpdate: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

/**
 * Registers the Serwist service worker in production and shows an unobtrusive
 * update toast whenever a new build is waiting to activate.
 */
export function SwRegister({
  onUpdateAvailabilityChange,
}: {
  onUpdateAvailabilityChange?: (hasUpdate: boolean) => void;
}) {
  const [hasUpdate, setHasUpdate] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const serwistRef = React.useRef<Serwist | null>(null);

  React.useEffect(() => {
    onUpdateAvailabilityChange?.(hasUpdate);
  }, [hasUpdate, onUpdateAvailabilityChange]);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const sw = new Serwist("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    serwistRef.current = sw;

    const handleWaiting = () => {
      setHasUpdate(true);
    };

    const handleControlling = () => {
      window.location.reload();
    };

    sw.addEventListener("waiting", handleWaiting);
    sw.addEventListener("controlling", handleControlling);

    void sw.register();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sw.update();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      sw.removeEventListener("waiting", handleWaiting);
      sw.removeEventListener("controlling", handleControlling);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleApplyUpdate = () => {
    const sw = serwistRef.current;
    if (!sw) return;
    setIsUpdating(true);
    sw.messageSkipWaiting();
  };

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={editorialSpring}
          className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md lg:inset-x-auto lg:right-6 lg:bottom-6"
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface/95 px-4 py-3 shadow-editorial-lg backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-lavender text-primary">
                <ArrowsClockwise size={18} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">
                  Nova versão disponível
                </p>
                <p className="truncate text-xs text-text-secondary">
                  Atualize para aplicar as melhorias.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                onClick={handleApplyUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? "Atualizando..." : "Atualizar"}
              </Button>
              <button
                type="button"
                onClick={() => setHasUpdate(false)}
                aria-label="Dispensar aviso de atualização"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-lavender/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
