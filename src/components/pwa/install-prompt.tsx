"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { DownloadSimple, Export, PlusSquare, X } from "@phosphor-icons/react";
import { BefinMark } from "@/components/brand/befin-logo";
import { Button } from "@/components/ui/button";
import { editorialSpring } from "@/lib/motion";

const INSTALL_DISMISSED_KEY = "befin:pwa-install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface ClientEnvironment {
  ready: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
  wasDismissed: boolean;
}

const SERVER_ENV: ClientEnvironment = {
  ready: false,
  isStandalone: false,
  isIosSafari: false,
  wasDismissed: true,
};

let cachedClientEnv: ClientEnvironment | null = null;

function getClientEnvironmentSnapshot(): ClientEnvironment {
  if (cachedClientEnv) return cachedClientEnv;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

  const ua = window.navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

  let wasDismissed = false;
  try {
    const raw = window.localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (raw) {
      const dismissedAt = Number(raw);
      wasDismissed =
        Number.isFinite(dismissedAt) &&
        Date.now() - dismissedAt < DISMISS_TTL_MS;
    }
  } catch {
    wasDismissed = false;
  }

  cachedClientEnv = {
    ready: true,
    isStandalone,
    isIosSafari: isIosDevice && isSafari,
    wasDismissed,
  };
  return cachedClientEnv;
}

function getServerEnvironmentSnapshot(): ClientEnvironment {
  return SERVER_ENV;
}

function subscribeNoop() {
  return () => {};
}

function markDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Unobtrusive PWA install prompt supporting Chromium's beforeinstallprompt
 * and Safari iOS "Add to Home Screen" guidance.
 */
export function InstallPrompt({ hidden = false }: { hidden?: boolean }) {
  const env = React.useSyncExternalStore(
    subscribeNoop,
    getClientEnvironmentSnapshot,
    getServerEnvironmentSnapshot,
  );
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedInSession, setDismissedInSession] = React.useState(false);

  React.useEffect(() => {
    if (!env.ready || env.isStandalone || env.wasDismissed) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissedInSession(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [env]);

  const handleDismiss = () => {
    markDismissed();
    setDismissedInSession(true);
    setDeferredPrompt(null);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissedInSession(true);
    } else {
      handleDismiss();
    }
  };

  const isVisible =
    !hidden &&
    env.ready &&
    !env.isStandalone &&
    !env.wasDismissed &&
    !dismissedInSession &&
    (deferredPrompt !== null || env.isIosSafari);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          aria-label="Instalar aplicativo"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={editorialSpring}
          className="fixed inset-x-4 bottom-24 z-35 mx-auto max-w-md lg:inset-x-auto lg:right-6 lg:bottom-6"
        >
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-border-subtle bg-surface/95 p-3.5 shadow-editorial-lg backdrop-blur-md">
            <div className="flex min-w-0 items-start gap-3">
              <BefinMark className="mt-0.5 h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  Instalar o befin
                </p>
                {deferredPrompt ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                    Use direto da tela inicial, com abertura rápida e suporte offline.
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                    Toque em{" "}
                    <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                      <Export size={13} weight="bold" aria-hidden="true" />
                      Compartilhar
                    </span>{" "}
                    e depois em{" "}
                    <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                      <PlusSquare size={13} weight="bold" aria-hidden="true" />
                      Adicionar à Tela de Início
                    </span>
                    .
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {deferredPrompt && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleInstallClick()}
                >
                  <DownloadSimple size={15} weight="bold" />
                  Instalar
                </Button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Fechar sugestão de instalação"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-lavender/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
