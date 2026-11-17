"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import {
  GearSix,
  House,
  PiggyBank,
  Plus,
  Receipt,
  Scales,
  WifiHigh,
} from "@phosphor-icons/react";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import {
  SettingsDialog,
  type SettingsTab,
} from "@/components/settings/settings-dialog";
import {
  NewTransactionDialog,
  type NewTransactionPreset,
} from "@/components/transactions/new-transaction-dialog";
import { seedDefaultDataIfEmpty } from "@/lib/db";
import { editorialSpring, fastTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AppShellContextValue {
  openNewTransaction: (preset?: NewTransactionPreset) => void;
  openSettings: (tab?: SettingsTab) => void;
}

const AppShellContext = React.createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const ctx = React.useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell deve ser usado dentro de <AppShell>");
  }
  return ctx;
}

const NAV_ITEMS = [
  { href: "/", label: "Início", icon: House },
  { href: "/caixinhas", label: "Caixinhas", icon: PiggyBank },
  { href: "/extrato", label: "Extrato", icon: Receipt },
  { href: "/conciliar", label: "Conciliar", icon: Scales },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNewTxOpen, setIsNewTxOpen] = React.useState(false);
  const [txPreset, setTxPreset] = React.useState<
    NewTransactionPreset | undefined
  >(undefined);
  const [txSessionKey, setTxSessionKey] = React.useState(0);

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab>("banks");

  React.useEffect(() => {
    void seedDefaultDataIfEmpty();
  }, []);

  const openNewTransaction = React.useCallback(
    (preset?: NewTransactionPreset) => {
      setTxPreset(preset);
      setTxSessionKey((prev) => prev + 1);
      setIsNewTxOpen(true);
    },
    [],
  );

  const openSettings = React.useCallback((tab: SettingsTab = "banks") => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  }, []);

  const contextValue = React.useMemo(
    () => ({ openNewTransaction, openSettings }),
    [openNewTransaction, openSettings],
  );

  return (
    <MotionConfig reducedMotion="user">
      <AppShellContext.Provider value={contextValue}>
        <div className="min-h-dvh flex flex-col bg-canvas text-primary">
        {/* Top Editorial Header */}
        <header className="sticky top-0 z-30 border-b border-border-subtle/80 bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <BefinMark />
              <BefinWordmark />
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openSettings("banks")}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2 text-xs font-semibold text-primary shadow-xs transition-colors hover:bg-surface-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              >
                <GearSix size={17} weight="duotone" />
                <span className="hidden xs:inline sm:inline">
                  Bancos &amp; Terceiros
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Page Area */}
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-36 sm:px-6 sm:pt-7">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fastTransition}
          >
            {children}
          </motion.div>
        </main>

        {/* Bottom Navigation Bar + Central FAB */}
        <nav
          aria-label="Navegação principal"
          className="fixed bottom-0 inset-x-0 z-30 border-t border-border-subtle bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        >
          <div className="mx-auto flex h-18 max-w-lg items-center justify-around px-2">
            {NAV_ITEMS.slice(0, 2).map((item) => {
              const isActive = pathname === item.href;
              const IconComp = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "text-primary"
                      : "text-text-secondary hover:text-primary",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      transition={editorialSpring}
                      className="absolute inset-0 -z-10 rounded-2xl bg-surface-lavender/80"
                    />
                  )}
                  <IconComp
                    size={22}
                    weight={isActive ? "fill" : "regular"}
                    className={cn(isActive && "text-primary")}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Central FAB */}
            <motion.button
              type="button"
              onClick={() => openNewTransaction()}
              aria-label="Nova Transação"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={editorialSpring}
              className="-mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-editorial-lg ring-4 ring-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <Plus size={26} weight="bold" />
            </motion.button>

            {NAV_ITEMS.slice(2).map((item) => {
              const isActive = pathname === item.href;
              const IconComp = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "text-primary"
                      : "text-text-secondary hover:text-primary",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      transition={editorialSpring}
                      className="absolute inset-0 -z-10 rounded-2xl bg-surface-lavender/80"
                    />
                  )}
                  <IconComp
                    size={22}
                    weight={isActive ? "fill" : "regular"}
                    className={cn(isActive && "text-primary")}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <NewTransactionDialog
          open={isNewTxOpen}
          onOpenChange={setIsNewTxOpen}
          preset={txPreset}
          sessionKey={txSessionKey}
        />

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          defaultTab={settingsTab}
        />
        </div>
      </AppShellContext.Provider>
    </MotionConfig>
  );
}
