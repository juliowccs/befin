"use client";

import * as React from "react";
import { onLocalMutation } from "@/lib/db";
import {
  getSyncMeta,
  type SyncStatus,
  syncWithServer,
} from "@/lib/sync";
import { useSession } from "@/src/lib/auth-client";

const LOCAL_MUTATION_DEBOUNCE_MS = 1000;
const PERIODIC_SYNC_INTERVAL_MS = 60_000;

export interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = React.createContext<SyncContextValue | null>(null);

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [state, setState] = React.useState<{
    userId: string | null;
    status: SyncStatus;
    lastSyncedAt: number | null;
    error: string | null;
  }>(() => ({
    userId: null,
    status: "unauthenticated",
    lastSyncedAt: null,
    error: null,
  }));

  const activeUserIdRef = React.useRef<string | null>(userId);

  React.useEffect(() => {
    activeUserIdRef.current = userId;
  }, [userId]);

  const syncNow = React.useCallback(async () => {
    const currentUserId = activeUserIdRef.current;
    if (!currentUserId) {
      setState({
        userId: null,
        status: "unauthenticated",
        lastSyncedAt: null,
        error: null,
      });
      return;
    }

    if (!isBrowserOnline()) {
      const meta = getSyncMeta(currentUserId);
      setState((prev) => ({
        userId: currentUserId,
        status: "offline",
        lastSyncedAt:
          prev.userId === currentUserId
            ? (prev.lastSyncedAt ?? meta.lastSyncedAt)
            : meta.lastSyncedAt,
        error: null,
      }));
      return;
    }

    const metaBefore = getSyncMeta(currentUserId);
    setState((prev) => ({
      userId: currentUserId,
      status: "syncing",
      lastSyncedAt:
        prev.userId === currentUserId
          ? (prev.lastSyncedAt ?? metaBefore.lastSyncedAt)
          : metaBefore.lastSyncedAt,
      error: null,
    }));

    try {
      const result = await syncWithServer(currentUserId);
      if (activeUserIdRef.current !== currentUserId) return;

      setState({
        userId: currentUserId,
        status: "synced",
        lastSyncedAt: result.serverTime,
        error: null,
      });
    } catch (err) {
      if (activeUserIdRef.current !== currentUserId) return;
      console.error("[SyncProvider] Erro ao sincronizar:", err);

      const metaAfter = getSyncMeta(currentUserId);
      if (!isBrowserOnline()) {
        setState({
          userId: currentUserId,
          status: "offline",
          lastSyncedAt: metaAfter.lastSyncedAt,
          error: null,
        });
        return;
      }

      const message =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível sincronizar agora.";
      setState({
        userId: currentUserId,
        status: "error",
        lastSyncedAt: metaAfter.lastSyncedAt,
        error: message,
      });
    }
  }, []);

  React.useEffect(() => {
    if (!userId) {
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerDebouncedSync = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void syncNow();
      }, LOCAL_MUTATION_DEBOUNCE_MS);
    };

    // Initial sync on mount / login
    void syncNow();

    // Debounced sync after local Dexie mutations
    const unsubscribeMutation = onLocalMutation(triggerDebouncedSync);

    const handleOnline = () => {
      void syncNow();
    };

    const handleOffline = () => {
      const meta = getSyncMeta(userId);
      setState((prev) => ({
        userId,
        status: "offline",
        lastSyncedAt:
          prev.userId === userId
            ? (prev.lastSyncedAt ?? meta.lastSyncedAt)
            : meta.lastSyncedAt,
        error: null,
      }));
    };

    const handleVisibilityChange = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        isBrowserOnline()
      ) {
        void syncNow();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        isBrowserOnline()
      ) {
        void syncNow();
      }
    }, PERIODIC_SYNC_INTERVAL_MS);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      unsubscribeMutation();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [userId, syncNow]);

  const effectiveValue = React.useMemo<SyncContextValue>(() => {
    if (!userId) {
      return {
        status: "unauthenticated",
        lastSyncedAt: null,
        error: null,
        syncNow,
      };
    }

    if (state.userId !== userId) {
      const meta = getSyncMeta(userId);
      return {
        status: isBrowserOnline() ? "idle" : "offline",
        lastSyncedAt: meta.lastSyncedAt,
        error: null,
        syncNow,
      };
    }

    return {
      status: state.status,
      lastSyncedAt: state.lastSyncedAt,
      error: state.error,
      syncNow,
    };
  }, [userId, state, syncNow]);

  return React.createElement(
    SyncContext.Provider,
    { value: effectiveValue },
    children,
  );
}

export function useSync(): SyncContextValue {
  const ctx = React.useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync deve ser usado dentro de <SyncProvider>");
  }
  return ctx;
}
