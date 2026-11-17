"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowsLeftRight,
  ArrowUpRight,
  ChartBar,
  CreditCard,
  Plus,
  Scales,
  ShieldCheck,
  Sparkle,
  Users,
  Wallet,
} from "@phosphor-icons/react";
import { DistributeDialog } from "@/components/envelopes/distribute-dialog";
import { SegmentedBar } from "@/components/envelopes/segmented-bar";
import { useAppShell } from "@/components/layout/app-shell";
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
import { useBefinData } from "@/hooks/use-befin-data";
import { deleteTransaction } from "@/lib/db";
import { getEnvelopeColorStyle, getEnvelopeIcon } from "@/lib/envelope-styles";
import { formatCents } from "@/lib/money";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function InicioPage() {
  const { openNewTransaction, openSettings } = useAppShell();
  const { isLoading, envelopes, thirdParties, transactions, snapshot } =
    useBefinData();

  const [isDistributeOpen, setIsDistributeOpen] = React.useState(false);
  const [distributeSessionKey, setDistributeSessionKey] = React.useState(0);

  const envelopesById = React.useMemo(
    () => Object.fromEntries(envelopes.map((env) => [env.id, env])),
    [envelopes]
  );

  const thirdPartiesById = React.useMemo(
    () => Object.fromEntries(thirdParties.map((tp) => [tp.id, tp])),
    [thirdParties]
  );

  const openCreditCount = React.useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.type === "EXPENSE" &&
          tx.third_party_id == null &&
          tx.payment_method === "CREDIT" &&
          tx.status === "PENDING"
      ).length,
    [transactions]
  );

  const thirdPartyEntries = React.useMemo(
    () =>
      thirdParties
        .map((person) => ({
          person,
          amountCents: snapshot.receivablesByThirdParty[person.id] ?? 0,
        }))
        .filter((item) => item.amountCents > 0),
    [thirdParties, snapshot.receivablesByThirdParty]
  );

  const recentTransactions = transactions.slice(0, 6);
  const netWorthCents =
    snapshot.totalEnvelopesCents + snapshot.freeBalanceCents;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-44 animate-pulse rounded-3xl bg-surface-lavender" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 animate-pulse rounded-3xl bg-surface" />
          <div className="h-32 animate-pulse rounded-3xl bg-surface" />
        </div>
        <div className="h-56 animate-pulse rounded-3xl bg-surface" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-7"
    >
      {/* Left Column on Desktop (7/12): Summary + Caixinhas */}
      <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
      {/* Hero Card: Saldo Livre ("Sala de Espera") */}
      <motion.section
        variants={staggerItem}
        aria-labelledby="free-balance-heading"
        className="lg:hidden"
      >
        <Card className="overflow-hidden border-accent-soft/50 bg-surface-lavender">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-primary shadow-xs">
                    <Wallet size={17} weight="duotone" />
                  </span>
                  <span
                    id="free-balance-heading"
                    className="text-xs font-semibold text-text-secondary"
                  >
                    Saldo Livre • Sala de Espera
                  </span>
                </div>
                <p className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-primary tabular-nums">
                  {formatCents(snapshot.freeBalanceCents)}
                </p>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Patrimônio líquido alocado + livre:{" "}
                  <strong className="text-primary tabular-nums">
                    {formatCents(netWorthCents)}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="default"
                  onClick={() => {
                    setDistributeSessionKey((k) => k + 1);
                    setIsDistributeOpen(true);
                  }}
                  disabled={snapshot.freeBalanceCents <= 0}
                >
                  <Sparkle size={16} weight="duotone" />
                  Distribuir saldo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openNewTransaction({ type: "INCOME" })}
                >
                  <Plus size={16} weight="bold" />
                  Nova receita
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Summary Grid: Total Caixinhas + Faturas / Terceiros */}
      <motion.section
        variants={staggerItem}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardDescription>Total nas Caixinhas</CardDescription>
                <CardTitle className="mt-0.5 text-2xl sm:text-3xl tabular-nums">
                  {formatCents(snapshot.totalEnvelopesCents)}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/relatorios"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-lavender"
                >
                  <ChartBar size={15} weight="duotone" />
                  Relatórios &amp; KPIs
                </Link>
                <Link
                  href="/conciliar"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl bg-surface-lavender px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-lavender-strong"
                >
                  <Scales size={15} weight="duotone" />
                  Conciliar bancos
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SegmentedBar
              envelopes={envelopes}
              envelopeBalances={snapshot.envelopeBalances}
              freeBalanceCents={snapshot.freeBalanceCents}
            />
          </CardContent>
        </Card>

        {/* Crédito A Pagar (Usuária) */}
        <Card className="border-amber-text/15 bg-amber-bg/45 md:col-span-1">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-5 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-amber-text/90">
                  Crédito A Pagar
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-amber-text tabular-nums">
                  {formatCents(snapshot.creditPayableCents)}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-bg text-amber-text">
                <CreditCard size={20} weight="duotone" />
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-amber-text/85">
                {openCreditCount === 0
                  ? "Nenhuma fatura pendente"
                  : `${openCreditCount} lançamento(s) em aberto`}
              </span>
              <Link
                href="/extrato?status=PENDING"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-text hover:underline"
              >
                Quitar
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* A Receber de Terceiros */}
        <Card className="border-mauve-text/15 bg-mauve-bg/45 md:col-span-2">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-5 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-mauve-text/90">
                  A Receber de Terceiros
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-mauve-text tabular-nums">
                  {formatCents(snapshot.thirdPartyReceivableCents)}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-mauve-bg text-mauve-text">
                <Users size={20} weight="duotone" />
              </span>
            </div>

            {thirdPartyEntries.length === 0 ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-mauve-text/80">
                  Nenhuma compra de terceiro em aberto no momento.
                </span>
                <button
                  type="button"
                  onClick={() => openSettings("third_parties")}
                  className="text-xs font-bold text-mauve-text hover:underline cursor-pointer"
                >
                  Gerenciar pessoas
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {thirdPartyEntries.map(({ person, amountCents }) => (
                    <Badge
                      key={person.id}
                      variant="mauve"
                      className="tabular-nums"
                    >
                      {person.name}: {formatCents(amountCents)}
                    </Badge>
                  ))}
                </div>
                <Link
                  href="/extrato?status=PENDING"
                  className="inline-flex items-center gap-1 text-xs font-bold text-mauve-text hover:underline"
                >
                  Cobrar / Quitar
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Envelopes Grid */}
      <motion.section
        variants={staggerItem}
        aria-labelledby="envelopes-section-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h2
            id="envelopes-section-heading"
            className="font-display text-xl font-bold text-primary"
          >
            Suas Caixinhas
          </h2>
          <Link
            href="/caixinhas"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent"
          >
            Gerenciar caixinhas
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {envelopes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-text-secondary">
                Você ainda não tem caixinhas criadas.
              </p>
              <Link href="/caixinhas">
                <Button size="sm">Criar primeira caixinha</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {envelopes.map((env) => {
              const style = getEnvelopeColorStyle(env.color);
              const IconComp = getEnvelopeIcon(env.icon);
              const balance = snapshot.envelopeBalances[env.id] ?? 0;

              return (
                <Card
                  key={env.id}
                  className="t-interactive-card flex flex-col justify-between"
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.bgClass} ${style.textClass}`}
                        >
                          <IconComp size={22} weight="duotone" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-primary">
                              {env.name}
                            </h3>
                          </div>
                          {env.is_emergency_fund && (
                            <Badge variant="sage" className="mt-1">
                              <ShieldCheck size={12} weight="fill" />
                              Reserva de Emergência
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p
                        className={`shrink-0 whitespace-nowrap font-display text-lg sm:text-xl font-bold tabular-nums ${
                          balance < 0 ? "text-coral-text" : "text-primary"
                        }`}
                      >
                        {formatCents(balance)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() =>
                          openNewTransaction({
                            type: "EXPENSE",
                            fromEnvelopeId: env.id,
                          })
                        }
                      >
                        <ArrowUpRight size={14} weight="bold" />
                        Gastar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          openNewTransaction({
                            type: "TRANSFER",
                            fromEnvelopeId: env.id,
                          })
                        }
                      >
                        <ArrowsLeftRight size={14} weight="bold" />
                        Transferir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.section>
      </div>

      {/* Right Column on Desktop (5/12): Saldo Livre + Recent Transactions */}
      <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6">
        <motion.section
          variants={staggerItem}
          aria-labelledby="free-balance-heading-desktop"
          className="hidden lg:block"
        >
          <Card className="overflow-hidden border-accent-soft/50 bg-surface-lavender">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-primary shadow-xs">
                      <Wallet size={17} weight="duotone" />
                    </span>
                    <span
                      id="free-balance-heading-desktop"
                      className="text-xs font-semibold text-text-secondary"
                    >
                      Saldo Livre • Sala de Espera
                    </span>
                  </div>
                  <p className="font-display text-3xl font-bold tracking-tight text-primary tabular-nums">
                    {formatCents(snapshot.freeBalanceCents)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Patrimônio líquido alocado + livre:{" "}
                    <strong className="text-primary tabular-nums">
                      {formatCents(netWorthCents)}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    variant="default"
                    onClick={() => {
                      setDistributeSessionKey((k) => k + 1);
                      setIsDistributeOpen(true);
                    }}
                    disabled={snapshot.freeBalanceCents <= 0}
                  >
                    <Sparkle size={16} weight="duotone" />
                    Distribuir saldo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openNewTransaction({ type: "INCOME" })}
                  >
                    <Plus size={16} weight="bold" />
                    Nova receita
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

      {/* Recent Transactions */}
      <motion.section
        variants={staggerItem}
        aria-labelledby="recent-tx-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h2
            id="recent-tx-heading"
            className="font-display text-xl font-bold text-primary"
          >
            Últimas movimentações
          </h2>
          <Link
            href="/extrato"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent"
          >
            Ver extrato completo
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-text-secondary">
              Nenhuma movimentação registrada ainda. Toque no botão{" "}
              <strong>+</strong> abaixo para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {recentTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  envelopesById={envelopesById}
                  thirdPartiesById={thirdPartiesById}
                  onDelete={(item) => void deleteTransaction(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>
      </div>

      <DistributeDialog
        open={isDistributeOpen}
        onOpenChange={setIsDistributeOpen}
        freeBalanceCents={snapshot.freeBalanceCents}
        envelopes={envelopes}
        envelopeBalances={snapshot.envelopeBalances}
        sessionKey={distributeSessionKey}
      />
    </motion.div>
  );
}
