"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import {
  ChartBar,
  GearSix,
  House,
  PiggyBank,
  Plus,
  Receipt,
  Scales,
} from "@phosphor-icons/react";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import { PwaProvider } from "@/components/pwa/pwa-provider";
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
  { href: "/inicio", label: "Início", icon: House },
  { href: "/caixinhas", label: "Caixinhas", icon: PiggyBank },
  { href: "/extrato", label: "Extrato", icon: Receipt },
  { href: "/conciliar", label: "Conciliar", icon: Scales },
  { href: "/relatorios", label: "Relatórios", icon: ChartBar },
] as const;

function isPublicShellRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/termos")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = isPublicShellRoute(pathname);
  const [isNewTxOpen, setIsNewTxOpen] = React.useState(false);
  const [txPreset, setTxPreset] = React.useState<
    NewTransactionPreset | undefined
  >(undefined);
  const [txSessionKey, setTxSessionKey] = React.useState(0);

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab>("banks");

  React.useEffect(() => {
    if (isPublicRoute) return;
    void seedDefaultDataIfEmpty();
  }, [isPublicRoute]);

  const openNewTransaction = React.useCallback(
    (preset?: NewTransactionPreset) => {
      setTxPreset(preset);
      setTxSessionKey((prev) => prev + 1);
      setIsNewTxOpen(true);
    },
    [],
  );

  const openSettings = React.useCallback(
    (tab: SettingsTab = "banks") => {
      router.push(tab === "banks" ? "/configuracoes" : `/configuracoes?tab=${tab}`);
    },
    [router]
  );

  const contextValue = React.useMemo(
    () => ({ openNewTransaction, openSettings }),
    [openNewTransaction, openSettings],
  );

  React.useEffect(() => {
    if (isPublicRoute) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isNewTxOpen || isSettingsOpen) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        openNewTransaction();
        return;
      }

      const index = Number(key) - 1;
      if (index >= 0 && index < NAV_ITEMS.length) {
        e.preventDefault();
        router.push(NAV_ITEMS[index].href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPublicRoute, isNewTxOpen, isSettingsOpen, openNewTransaction, router]);

  if (isPublicRoute) {
    return (
      <MotionConfig reducedMotion="user">
        <PwaProvider showSplash={false} showInstallPrompt={false} />
        <div className="min-h-dvh flex flex-col bg-canvas text-primary">
          {children}
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AppShellContext.Provider value={contextValue}>
        <PwaProvider showSplash showInstallPrompt />
        <div className="min-h-dvh flex flex-col bg-canvas text-primary lg:pl-60">
        {/* Desktop Editorial Sidebar */}
        <aside
          aria-label="Menu lateral"
          className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border-subtle/80 lg:bg-surface/95 lg:backdrop-blur-md"
        >
          <div className="flex h-18 items-center px-5">
            <Link
              href="/inicio"
              className="flex items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <BefinMark />
              <BefinWordmark />
            </Link>
          </div>

          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={() => openNewTransaction()}
              className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-editorial-sm transition-all hover:bg-primary/92 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus size={18} weight="bold" />
                <span>Novo lançamento</span>
              </span>
              <kbd className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white/90">
                N
              </kbd>
            </button>
          </div>

          <nav
            aria-label="Navegação principal desktop"
            className="flex-1 space-y-1 px-3 py-2"
          >
            {NAV_ITEMS.map((item, idx) => {
              const isActive = pathname === item.href;
              const IconComp = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "text-primary"
                      : "text-text-secondary hover:bg-surface-lavender/40 hover:text-primary",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-nav-pill"
                      transition={editorialSpring}
                      className="absolute inset-0 -z-10 rounded-2xl bg-surface-lavender/85"
                    />
                  )}
                  <span className="flex items-center gap-3">
                    <IconComp
                      size={20}
                      weight={isActive ? "fill" : "regular"}
                      className={cn(isActive && "text-primary")}
                    />
                    <span>{item.label}</span>
                  </span>
                  <kbd className="text-[11px] font-medium text-text-secondary/60">
                    {idx + 1}
                  </kbd>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border-subtle/80 p-3">
            <button
              type="button"
              onClick={() => openSettings("banks")}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-lavender/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <GearSix size={19} weight="duotone" />
              <span>Bancos &amp; Terceiros</span>
            </button>
          </div>
        </aside>

        {/* Top Editorial Header (Mobile & Tablet) */}
        <header className="sticky top-0 z-30 border-b border-border-subtle/80 bg-canvas/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/inicio"
              className="flex items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <BefinMark />
              <BefinWordmark />
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/relatorios"
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  pathname === "/relatorios"
                    ? "border-primary bg-primary text-white"
                    : "border-border-subtle bg-surface text-primary hover:bg-surface-lavender",
                )}
              >
                <ChartBar size={17} weight="duotone" />
                <span className="hidden xs:inline sm:inline">Relatórios</span>
              </Link>
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
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-36 sm:px-6 sm:pt-7 lg:px-10 lg:py-9">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fastTransition}
          >
            {children}
          </motion.div>
        </main>

        {/* Bottom Navigation Bar + Central FAB (Mobile & Tablet) */}
        <nav
          aria-label="Navegação principal"
          className="fixed bottom-0 inset-x-0 z-30 border-t border-border-subtle bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
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

            {NAV_ITEMS.slice(2, 4).map((item) => {
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
