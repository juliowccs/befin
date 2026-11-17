"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { editorialEase } from "@/lib/motion";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";

const SPLASH_SESSION_KEY = "befin:splash-shown";

function subscribeNoop() {
  return () => {};
}

function getShouldShowSplashSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function getShouldShowSplashServerSnapshot(): boolean {
  return true;
}

/**
 * Short continuity splash overlay shown once per browser session on app entry.
 * Mirrors the native PWA splash background (#F8F7FA) and animates the logo out
 * smoothly in ~400ms while remaining non-blocking (pointer-events-none).
 */
export function PwaSplashScreen() {
  const shouldShowOnMount = React.useSyncExternalStore(
    subscribeNoop,
    getShouldShowSplashSnapshot,
    getShouldShowSplashServerSnapshot,
  );
  const [phase, setPhase] = React.useState<"enter" | "exit" | "done">("enter");

  React.useEffect(() => {
    if (!shouldShowOnMount) return;

    try {
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      // Ignore storage quota / private mode errors
    }

    const exitTimer = window.setTimeout(() => {
      setPhase("exit");
    }, 90);

    const doneTimer = window.setTimeout(() => {
      setPhase("done");
    }, 460);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [shouldShowOnMount]);

  if (!shouldShowOnMount || phase === "done") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={phase === "exit" ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.28, ease: editorialEase }}
        className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas select-none"
      >
        <motion.div
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={
            phase === "exit"
              ? { opacity: 0, scale: 1.08, y: -28 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          transition={{ duration: 0.34, ease: editorialEase }}
          className="flex flex-col items-center gap-3"
        >
          <BefinMark className="h-16 w-16 rounded-3xl text-3xl shadow-editorial-lg [&>span]:text-3xl [&>svg]:-right-1 [&>svg]:-top-1 [&>svg]:h-5 [&>svg]:w-5" />
          <BefinWordmark className="text-3xl" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
