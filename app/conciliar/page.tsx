"use client";

import { BankIcon } from "@/lib/bank-icons";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Bank,
  CheckCircle,
  FloppyDisk,
  Plus,
  Scales,
  ShieldCheck,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBefinData } from "@/hooks/use-befin-data";
import {
  applyYieldSurplusToEmergencyFundInDb,
  deleteTransaction,
  saveReconciliationInDb,
  updateBank,
} from "@/lib/db";
import { calculateReconciliation } from "@/lib/ledger";
import { formatCents, formatCentsDecimal, parseCentsInput } from "@/lib/money";
import { editorialSpring, fastTransition } from "@/lib/motion";
import {
  type ReconciliationFormValues,
  reconciliationFormSchema,
} from "@/lib/schemas/forms";

export default function ConciliarPage() {
  const { openNewTransaction, openSettings } = useAppShell();
  const {
    isLoading,
    banks,
    envelopes,
    thirdParties,
    transactions,
    reconciliations,
    snapshot,
  } = useBefinData();

  const [feedbackBanner, setFeedbackBanner] = React.useState<string | null>(
    null
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationFormSchema),
    defaultValues: {
      bankBalances: {},
      yieldInputs: {},
      notes: "",
    },
  });

  const watchedBalanceInputs = useWatch({ control, name: "bankBalances" });
  const watchedYieldInputs = useWatch({ control, name: "yieldInputs" });

  const envelopesById = React.useMemo(
    () => Object.fromEntries(envelopes.map((env) => [env.id, env])),
    [envelopes]
  );

  const thirdPartiesById = React.useMemo(
    () => Object.fromEntries(thirdParties.map((tp) => [tp.id, tp])),
    [thirdParties]
  );

  const effectiveBankValues = React.useMemo(() => {
    const balanceInputs = watchedBalanceInputs ?? {};
    const yieldInputs = watchedYieldInputs ?? {};
    return banks.map((bank) => {
      const balanceRaw =
        balanceInputs[bank.id] ?? formatCentsDecimal(bank.balance_cents);
      const yieldRaw = yieldInputs[bank.id] ?? "";
      return {
        bank,
        balanceRaw,
        yieldRaw,
        balanceCents: parseCentsInput(balanceRaw),
        yieldCents: Math.max(0, parseCentsInput(yieldRaw)),
      };
    });
  }, [banks, watchedBalanceInputs, watchedYieldInputs]);

  const actualCents = React.useMemo(
    () =>
      effectiveBankValues.reduce((sum, item) => sum + item.balanceCents, 0),
    [effectiveBankValues]
  );

  const totalYieldCents = React.useMemo(
    () => effectiveBankValues.reduce((sum, item) => sum + item.yieldCents, 0),
    [effectiveBankValues]
  );

  const reconciliation = React.useMemo(
    () =>
      calculateReconciliation({
        expectedCents: snapshot.expectedBankBalanceCents,
        actualCents,
        yieldCents: totalYieldCents,
        envelopes,
      }),
    [snapshot.expectedBankBalanceCents, actualCents, totalYieldCents, envelopes]
  );

  const emergencyEnvelope = reconciliation.emergencyEnvelopeId
    ? envelopesById[reconciliation.emergencyEnvelopeId]
    : undefined;

  const persistBankBalances = async () => {
    for (const item of effectiveBankValues) {
      if (item.balanceCents !== item.bank.balance_cents) {
        await updateBank(item.bank.id, { balance_cents: item.balanceCents });
      }
    }
  };

  const handleSaveReconciliation = handleSubmit(async (values) => {
    setFeedbackBanner(null);
    await persistBankBalances();
    await saveReconciliationInDb({
      expected_cents: reconciliation.expectedCents,
      actual_cents: reconciliation.actualCents,
      yield_cents: reconciliation.yieldCents,
      discrepancy_cents: reconciliation.discrepancyCents,
      notes:
        values.notes ||
        (reconciliation.status === "MATCHED"
          ? "Conciliação batida exata"
          : reconciliation.status === "SURPLUS"
            ? "Sobra registrada na conciliação"
            : "Falta identificada para auditoria manual"),
    });
    setValue("notes", "");
    setFeedbackBanner("Registro de conciliação salvo no histórico.");
  });

  const handleSendSurplusToEmergency = handleSubmit(async (values) => {
    if (!reconciliation.emergencyEnvelopeId || reconciliation.discrepancyCents <= 0)
      return;
    setFeedbackBanner(null);
    await persistBankBalances();
    await applyYieldSurplusToEmergencyFundInDb({
      surplusCents: reconciliation.discrepancyCents,
      emergencyEnvelopeId: reconciliation.emergencyEnvelopeId,
      expectedCents: reconciliation.expectedCents,
      actualCents: reconciliation.actualCents,
      yieldCents: reconciliation.yieldCents,
      notes: values.notes,
    });
    setValue("yieldInputs", {});
    setValue("notes", "");
    setFeedbackBanner(
      `Sobra de ${formatCents(reconciliation.discrepancyCents)} enviada para ${
        emergencyEnvelope?.name ?? "Reserva de Emergência"
      }!`
    );
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-44 animate-pulse rounded-3xl bg-surface" />
        <div className="h-56 animate-pulse rounded-3xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            Calculadora de Conciliação
          </h1>
          <p className="text-sm text-text-secondary">
            Confira se o dinheiro físico nos bancos bate com suas caixinhas e
            faturas.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => openSettings("banks")}
        >
          <Plus size={15} weight="bold" />
          Gerenciar bancos
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-7">
        <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
      {/* Bank Physical Balance + Yield Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle as="h2">Saldos Físicos nos Bancos</CardTitle>
              <CardDescription>
                Informe o saldo principal e o rendimento acumulado em cada
                banco.
              </CardDescription>
            </div>
            <Badge variant="lavender" className="tabular-nums text-sm px-3 py-1">
              Real: {formatCents(actualCents)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {effectiveBankValues.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-subtle p-6 text-center">
              <p className="text-sm text-text-secondary">
                Cadastre seus bancos (ex: Nubank, Mercado Pago, Inter) para
                somar os saldos físicos.
              </p>
              <Button size="sm" onClick={() => openSettings("banks")}>
                <Bank size={15} weight="duotone" />
                Cadastrar primeiro banco
              </Button>
            </div>
          ) : (
            effectiveBankValues.map(({ bank, balanceRaw, yieldRaw }) => (
              <div
                key={bank.id}
                className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-canvas p-4"
              >
                <div className="flex items-center gap-2">
                  <BankIcon name={bank.name} />
                  <h2 className="font-display text-base font-bold text-primary">
                    {bank.name}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`bank-bal-${bank.id}`}>
                      Saldo Principal (R$)
                    </Label>
                    <Input
                      id={`bank-bal-${bank.id}`}
                      inputMode="decimal"
                      value={balanceRaw}
                      onChange={(e) =>
                        setValue(`bankBalances.${bank.id}`, e.target.value, {
                          shouldValidate: true,
                        })
                      }
                      aria-invalid={Boolean(errors.bankBalances?.[bank.id])}
                      className="tabular-nums font-semibold"
                    />
                    {errors.bankBalances?.[bank.id] && (
                      <p className="text-xs font-medium text-coral-text">
                        {errors.bankBalances[bank.id]?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`bank-yield-${bank.id}`}>
                      Rendimento Acumulado (R$)
                    </Label>
                    <Input
                      id={`bank-yield-${bank.id}`}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={yieldRaw}
                      onChange={(e) =>
                        setValue(`yieldInputs.${bank.id}`, e.target.value, {
                          shouldValidate: true,
                        })
                      }
                      aria-invalid={Boolean(errors.yieldInputs?.[bank.id])}
                      className="tabular-nums font-semibold"
                    />
                    {errors.yieldInputs?.[bank.id] && (
                      <p className="text-xs font-medium text-coral-text">
                        {errors.yieldInputs[bank.id]?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

        </div>

        <div className="contents lg:col-span-5 lg:sticky lg:top-8 lg:flex lg:flex-col lg:gap-6">
      {/* Truth Equation Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Scales size={20} weight="duotone" className="text-primary" />
            <CardTitle as="h2">Equação da Verdade</CardTitle>
          </div>
          <CardDescription>
            Comparação entre o saldo esperado pelo Befin e o saldo real nos
            bancos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-text-secondary">(+) Soma das Caixinhas</span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCents(snapshot.totalEnvelopesCents)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-text-secondary">(+) Saldo Livre</span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCents(snapshot.freeBalanceCents)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-text-secondary">
              (+) Crédito A Pagar (Seu)
            </span>
            <span className="font-semibold text-amber-text tabular-nums">
              {formatCents(snapshot.creditPayableCents)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-text-secondary">
              (-) A Receber (Terceiros)
            </span>
            <span className="font-semibold text-mauve-text tabular-nums">
              -{formatCents(snapshot.thirdPartyReceivableCents)}
            </span>
          </div>

          <div className="my-1 border-t border-border-subtle pt-3 flex items-center justify-between">
            <span className="font-display text-base font-bold text-primary">
              (=) Saldo Esperado nos Bancos
            </span>
            <span className="font-display text-xl font-bold text-primary tabular-nums">
              {formatCents(reconciliation.expectedCents)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Result Card */}
      <AnimatePresence mode="wait">
        {reconciliation.status === "MATCHED" && (
          <motion.div
            key="MATCHED"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={editorialSpring}
          >
            <Card className="border-sage-text/20 bg-sage-bg/70">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-text text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-sage-text">
                  Contas batendo centavo por centavo!
                </h2>
                <p className="mt-1 text-sm text-sage-text/90">
                  O saldo real nos bancos ({formatCents(reconciliation.actualCents)})
                  corresponde exatamente ao esperado ({formatCents(reconciliation.expectedCents)}).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 flex flex-col gap-1">
                <Input
                  placeholder="Observação opcional (ex: Fechamento do mês)..."
                  aria-invalid={Boolean(errors.notes)}
                  className="bg-surface"
                  {...register("notes")}
                />
                {errors.notes && (
                  <p className="text-xs font-medium text-coral-text">
                    {errors.notes.message}
                  </p>
                )}
              </div>
              <Button
                variant="sage"
                disabled={isSubmitting}
                onClick={handleSaveReconciliation}
                className="shrink-0"
              >
                <FloppyDisk size={16} weight="bold" />
                Registrar conciliação
              </Button>
            </div>
          </CardContent>
        </Card>
          </motion.div>
        )}

        {reconciliation.status === "SURPLUS" && (
          <motion.div
            key="SURPLUS"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={editorialSpring}
          >
            <Card className="border-sage-text/20 bg-sage-bg/70">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-text text-white">
                  <Sparkle size={22} weight="duotone" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-sage-text">
                      Sobrou {formatCents(reconciliation.discrepancyCents)}
                    </h2>
                    {reconciliation.isYieldCompatible && (
                      <Badge variant="sage">Compatível com rendimentos</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-sage-text/90">
                    Você tem {formatCents(reconciliation.actualCents)} reais nos
                    bancos contra {formatCents(reconciliation.expectedCents)}{" "}
                    esperados.
                    {totalYieldCents > 0 && (
                      <>
                        {" "}
                        Rendimentos informados:{" "}
                        <strong className="tabular-nums">
                          {formatCents(totalYieldCents)}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {emergencyEnvelope ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-surface/90 p-4 border border-sage-text/15">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck
                      size={20}
                      weight="fill"
                      className="text-sage-text shrink-0"
                    />
                    <span className="text-sm font-semibold text-primary">
                      Enviar sobra direto para{" "}
                      <strong>{emergencyEnvelope.name}</strong>?
                    </span>
                  </div>
                  <Button
                    variant="sage"
                    disabled={isSubmitting}
                    onClick={handleSendSurplusToEmergency}
                  >
                    <CheckCircle size={16} weight="bold" />
                    Enviar {formatCents(reconciliation.discrepancyCents)} para
                    Reserva
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface/90 p-3.5 text-xs text-primary">
                <span>
                  Marque uma caixinha como <strong>Reserva de Emergência</strong>{" "}
                  para enviar rendimentos com 1 clique.
                </span>
                <Link
                  href="/caixinhas"
                  className="inline-flex items-center gap-1 font-bold text-sage-text hover:underline"
                >
                  Ir para Caixinhas
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex-1 flex flex-col gap-1">
                <Input
                  placeholder="Observação opcional..."
                  aria-invalid={Boolean(errors.notes)}
                  className="bg-surface"
                  {...register("notes")}
                />
                {errors.notes && (
                  <p className="text-xs font-medium text-coral-text">
                    {errors.notes.message}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={handleSaveReconciliation}
                className="shrink-0"
              >
                <FloppyDisk size={16} weight="bold" />
                Apenas registrar histórico
              </Button>
            </div>
          </CardContent>
        </Card>
          </motion.div>
        )}

        {reconciliation.status === "DEFICIT" && (
          <motion.div
            key="DEFICIT"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={editorialSpring}
            className="flex flex-col gap-4"
          >
          <Card className="border-coral-text/20 bg-coral-bg/75">
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral-text text-white">
                  <WarningCircle size={22} weight="duotone" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-coral-text">
                    Faltou{" "}
                    {formatCents(Math.abs(reconciliation.discrepancyCents))} nos
                    bancos
                  </h2>
                  <p className="mt-1 text-sm text-coral-text/90 leading-relaxed">
                    Saldo real ({formatCents(reconciliation.actualCents)}) está
                    abaixo do esperado ({formatCents(reconciliation.expectedCents)}
                    ). <strong>Nenhum ajuste automático é criado</strong> —
                    revise os lançamentos abaixo para encontrar o gasto não
                    registrado.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="coral"
                  onClick={() => openNewTransaction({ type: "EXPENSE" })}
                >
                  <Plus size={16} weight="bold" />
                  Lançar gasto esquecido
                </Button>
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleSaveReconciliation}
                >
                  <FloppyDisk size={16} weight="bold" />
                  Registrar discrepância no histórico
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Audit List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle as="h2" className="text-lg">
                Auditoria manual — Últimos lançamentos
              </CardTitle>
              <CardDescription>
                Verifique se algum Pix, débito ou valor no cartão ficou
                divergente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                {transactions.slice(0, 10).map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    envelopesById={envelopesById}
                    thirdPartiesById={thirdPartiesById}
                    onDelete={(item) => void deleteTransaction(item.id)}
                  />
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedbackBanner && (
          <motion.div
            key={feedbackBanner}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={fastTransition}
            className="rounded-2xl border border-sage-text/20 bg-sage-bg px-4 py-3 text-sm font-semibold text-sage-text"
          >
            {feedbackBanner}
          </motion.div>
        )}
      </AnimatePresence>

        </div>
      </div>

      {/* Reconciliation History */}
      {reconciliations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle as="h2" className="text-lg">
              Histórico de Conciliações
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {reconciliations.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-canvas p-3.5 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-primary">
                    {rec.notes || "Conciliação registrada"}
                  </span>
                  <span className="text-text-secondary tabular-nums">
                    Data: {rec.date.split("-").reverse().join("/")} • Esperado:{" "}
                    {formatCents(rec.expected_cents)} • Real:{" "}
                    {formatCents(rec.actual_cents)}
                  </span>
                </div>
                <Badge
                  variant={
                    rec.discrepancy_cents === 0
                      ? "sage"
                      : rec.discrepancy_cents > 0
                        ? "sage"
                        : "coral"
                  }
                  className="tabular-nums"
                >
                  {rec.discrepancy_cents === 0
                    ? "Bateu exato"
                    : rec.discrepancy_cents > 0
                      ? `+${formatCents(rec.discrepancy_cents)}`
                      : formatCents(rec.discrepancy_cents)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
