"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle,
  CreditCard,
  Funnel,
  MagnifyingGlass,
  Users,
  X,
} from "@phosphor-icons/react";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBefinData } from "@/hooks/use-befin-data";
import { deleteTransaction, settleTransactionsInDb } from "@/lib/db";
import type {
  TransactionRecord,
  TransactionStatus,
  TransactionType,
} from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { editorialSpring } from "@/lib/motion";

export default function ExtratoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="h-36 animate-pulse rounded-3xl bg-surface" />
          <div className="h-64 animate-pulse rounded-3xl bg-surface" />
        </div>
      }
    >
      <ExtratoContent />
    </Suspense>
  );
}

function ExtratoContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status");
  const initialStatus: "ALL" | TransactionStatus =
    initialStatusParam === "PENDING" || initialStatusParam === "PAID"
      ? initialStatusParam
      : "ALL";

  const { isLoading, envelopes, thirdParties, transactions, snapshot } =
    useBefinData();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"ALL" | TransactionType>(
    "ALL"
  );
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | TransactionStatus
  >(initialStatus);
  const [envelopeFilter, setEnvelopeFilter] = React.useState<string>("ALL");
  const [thirdPartyFilter, setThirdPartyFilter] = React.useState<string>("ALL");

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [anchorIndex, setAnchorIndex] = React.useState<number | null>(null);
  const [isSettling, setIsSettling] = React.useState(false);

  const envelopesById = React.useMemo(
    () => Object.fromEntries(envelopes.map((env) => [env.id, env])),
    [envelopes]
  );

  const thirdPartiesById = React.useMemo(
    () => Object.fromEntries(thirdParties.map((tp) => [tp.id, tp])),
    [thirdParties]
  );

  const userPendingCreditTxs = React.useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.type === "EXPENSE" &&
          tx.third_party_id == null &&
          tx.payment_method === "CREDIT" &&
          tx.status === "PENDING"
      ),
    [transactions]
  );

  const thirdPartyPendingGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      { name: string; totalCents: number; txIds: string[] }
    >();

    for (const tx of transactions) {
      if (
        tx.type === "EXPENSE" &&
        tx.third_party_id != null &&
        tx.status === "PENDING"
      ) {
        const tp = thirdPartiesById[tx.third_party_id];
        const current = groups.get(tx.third_party_id) ?? {
          name: tp?.name ?? "Terceiro",
          totalCents: 0,
          txIds: [],
        };
        current.totalCents += tx.amount_cents;
        current.txIds.push(tx.id);
        groups.set(tx.third_party_id, current);
      }
    }

    return Array.from(groups.entries()).map(([id, data]) => ({ id, ...data }));
  }, [transactions, thirdPartiesById]);

  const filteredTransactions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (q && !tx.description.toLowerCase().includes(q)) return false;
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;

      if (envelopeFilter === "__FREE__") {
        const touchesFree =
          tx.third_party_id == null &&
          (tx.from_envelope_id == null || tx.to_envelope_id == null);
        if (!touchesFree) return false;
      } else if (envelopeFilter !== "ALL") {
        if (
          tx.from_envelope_id !== envelopeFilter &&
          tx.to_envelope_id !== envelopeFilter
        ) {
          return false;
        }
      }

      if (thirdPartyFilter === "__OWN__") {
        if (tx.third_party_id != null) return false;
      } else if (thirdPartyFilter !== "ALL") {
        if (tx.third_party_id !== thirdPartyFilter) return false;
      }

      return true;
    });
  }, [
    transactions,
    searchQuery,
    typeFilter,
    statusFilter,
    envelopeFilter,
    thirdPartyFilter,
  ]);

  const toggleRangeOrItem = (
    index: number,
    tx: TransactionRecord,
    opts: { shiftKey: boolean; ctrlOrMetaKey: boolean; fromCheckbox?: boolean }
  ) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (opts.shiftKey && anchorIndex !== null) {
        const start = Math.min(anchorIndex, index);
        const end = Math.max(anchorIndex, index);
        for (let i = start; i <= end; i += 1) {
          const item = filteredTransactions[i];
          if (item) next.add(item.id);
        }
        return next;
      }

      if (opts.fromCheckbox || opts.ctrlOrMetaKey || prev.size > 0) {
        if (next.has(tx.id)) {
          next.delete(tx.id);
        } else {
          next.add(tx.id);
        }
        return next;
      }

      // Plain click when nothing was selected yet: start selection on that item
      next.add(tx.id);
      return next;
    });
    setAnchorIndex(index);
  };

  const selectedTransactions = React.useMemo(
    () => filteredTransactions.filter((tx) => selectedIds.has(tx.id)),
    [filteredTransactions, selectedIds]
  );

  const selectedPendingIds = React.useMemo(
    () =>
      selectedTransactions
        .filter((tx) => tx.status === "PENDING")
        .map((tx) => tx.id),
    [selectedTransactions]
  );

  const selectedTotalCents = React.useMemo(
    () =>
      selectedTransactions.reduce((sum, tx) => sum + tx.amount_cents, 0),
    [selectedTransactions]
  );

  const handleSettleIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsSettling(true);
    try {
      await settleTransactionsInDb(ids);
      setSelectedIds(new Set());
      setAnchorIndex(null);
    } finally {
      setIsSettling(false);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    envelopeFilter !== "ALL" ||
    thirdPartyFilter !== "ALL";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-36 animate-pulse rounded-3xl bg-surface" />
        <div className="h-64 animate-pulse rounded-3xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
          Extrato &amp; Fatura Aberta
        </h1>
        <p className="text-sm text-text-secondary">
          Audite lançamentos, filtre por pessoa ou caixinha e quite faturas em
          lote.
        </p>
      </div>

      {/* Open Invoice Panel (Ela vs Terceiros) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-text/15 bg-amber-bg/40">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription className="text-amber-text/90 font-semibold">
                  Meus Gastos no Crédito (A Pagar)
                </CardDescription>
                <CardTitle className="mt-1 text-2xl text-amber-text tabular-nums">
                  {formatCents(snapshot.creditPayableCents)}
                </CardTitle>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-bg text-amber-text">
                <CreditCard size={20} weight="duotone" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-amber-text/90">
              {userPendingCreditTxs.length === 0
                ? "Tudo quitado no seu cartão."
                : `${userPendingCreditTxs.length} compra(s) aguardando pagamento da fatura`}
            </span>
            <Button
              size="sm"
              variant="amber"
              disabled={userPendingCreditTxs.length === 0 || isSettling}
              onClick={() =>
                void handleSettleIds(userPendingCreditTxs.map((tx) => tx.id))
              }
            >
              <CheckCircle size={15} weight="bold" />
              Pagar tudo
            </Button>
          </CardContent>
        </Card>

        <Card className="border-mauve-text/15 bg-mauve-bg/40">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription className="text-mauve-text/90 font-semibold">
                  Gastos de Terceiros (A Receber)
                </CardDescription>
                <CardTitle className="mt-1 text-2xl text-mauve-text tabular-nums">
                  {formatCents(snapshot.thirdPartyReceivableCents)}
                </CardTitle>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-mauve-bg text-mauve-text">
                <Users size={20} weight="duotone" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {thirdPartyPendingGroups.length === 0 ? (
              <span className="text-xs text-mauve-text/85">
                Nenhum valor pendente de terceiros.
              </span>
            ) : (
              thirdPartyPendingGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-surface/80 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-xs font-semibold text-primary">
                      {group.name}
                    </span>
                    <Badge variant="mauve" className="tabular-nums">
                      {formatCents(group.totalCents)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="mauve"
                    disabled={isSettling}
                    onClick={() => void handleSettleIds(group.txIds)}
                  >
                    Marcar recebido
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <Funnel size={14} weight="bold" />
              Filtros do extrato
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                  setEnvelopeFilter("ALL");
                  setThirdPartyFilter("ALL");
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent cursor-pointer"
              >
                <X size={13} weight="bold" />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="relative lg:col-span-2">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <Input
                placeholder="Buscar por descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              aria-label="Filtrar por tipo"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "ALL" | TransactionType)
              }
            >
              <option value="ALL">Todos os tipos</option>
              <option value="EXPENSE">Gastos</option>
              <option value="INCOME">Receitas</option>
              <option value="TRANSFER">Transferências</option>
            </Select>

            <Select
              aria-label="Filtrar por status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | TransactionStatus)
              }
            >
              <option value="ALL">Todos os status</option>
              <option value="PENDING">Em aberto</option>
              <option value="PAID">Pagos</option>
            </Select>

            <Select
              aria-label="Filtrar por caixinha"
              value={envelopeFilter}
              onChange={(e) => setEnvelopeFilter(e.target.value)}
            >
              <option value="ALL">Todas as caixinhas</option>
              <option value="__FREE__">Saldo Livre</option>
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </Select>
          </div>

          {thirdParties.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-text-secondary">
                Pessoa:
              </span>
              <button
                type="button"
                onClick={() => setThirdPartyFilter("ALL")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  thirdPartyFilter === "ALL"
                    ? "bg-primary text-white"
                    : "bg-surface-lavender text-primary hover:bg-surface-lavender-strong"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setThirdPartyFilter("__OWN__")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  thirdPartyFilter === "__OWN__"
                    ? "bg-primary text-white"
                    : "bg-surface-lavender text-primary hover:bg-surface-lavender-strong"
                }`}
              >
                Meu orçamento
              </button>
              {thirdParties.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setThirdPartyFilter(person.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    thirdPartyFilter === person.id
                      ? "bg-mauve-bg text-mauve-text ring-1 ring-mauve-text/30"
                      : "bg-surface-lavender text-primary hover:bg-mauve-bg/60"
                  }`}
                >
                  {person.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-select helper bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-text-secondary">
          {filteredTransactions.length} lançamento(s) encontrado(s).{" "}
          <span className="hidden sm:inline">
            Use <kbd className="rounded bg-surface-lavender px-1.5 py-0.5 font-mono text-[11px]">Ctrl+Clique</kbd> ou{" "}
            <kbd className="rounded bg-surface-lavender px-1.5 py-0.5 font-mono text-[11px]">Shift+Clique</kbd> para seleção múltipla.
          </span>
        </p>

        {filteredTransactions.some((tx) => tx.status === "PENDING") && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const pendingIds = filteredTransactions
                .filter((tx) => tx.status === "PENDING")
                .map((tx) => tx.id);
              setSelectedIds(new Set(pendingIds));
            }}
          >
            Selecionar pendentes visíveis
          </Button>
        )}
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-secondary">
            Nenhuma transação corresponde aos filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredTransactions.map((tx, idx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                envelopesById={envelopesById}
                thirdPartiesById={thirdPartiesById}
                selectable
                selected={selectedIds.has(tx.id)}
                onRowClick={(item, event) =>
                  toggleRangeOrItem(idx, item, {
                    shiftKey: event.shiftKey,
                    ctrlOrMetaKey: event.ctrlKey || event.metaKey,
                  })
                }
                onCheckboxToggle={(item, shiftKey) =>
                  toggleRangeOrItem(idx, item, {
                    shiftKey,
                    ctrlOrMetaKey: true,
                    fromCheckbox: true,
                  })
                }
                onDelete={(item) => void deleteTransaction(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating Multi-select Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <div className="pointer-events-none fixed bottom-22 inset-x-0 z-40 px-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={editorialSpring}
              className="pointer-events-auto mx-auto w-full max-w-2xl rounded-3xl border border-accent-soft bg-primary p-3.5 text-white shadow-editorial-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-accent-soft">
                    {selectedIds.size} item(ns) selecionado(s)
                  </span>
                  <span className="font-display text-base font-bold tabular-nums">
                    Total: {formatCents(selectedTotalCents)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setSelectedIds(new Set());
                      setAnchorIndex(null);
                    }}
                  >
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    variant="sage"
                    disabled={selectedPendingIds.length === 0 || isSettling}
                    onClick={() => void handleSettleIds(selectedPendingIds)}
                  >
                    <CheckCircle size={15} weight="bold" />
                    {selectedPendingIds.length > 0
                      ? `Pagar selecionadas (${selectedPendingIds.length})`
                      : "Nenhuma pendente"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
