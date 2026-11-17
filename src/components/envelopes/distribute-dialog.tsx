"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { CurrencyDollar, Divide, Percent } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { distributeFreeBalanceInDb } from "@/lib/db";
import { getEnvelopeColorStyle, getEnvelopeIcon } from "@/lib/envelope-styles";
import type { EnvelopeRecord } from "@/lib/ledger";
import {
  distributeByPercentages,
  formatCents,
  parseCentsInput,
} from "@/lib/money";
import {
  type DistributeFormValues,
  distributeFormSchema,
} from "@/lib/schemas/forms";

interface DistributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freeBalanceCents: number;
  envelopes: EnvelopeRecord[];
  envelopeBalances: Record<string, number>;
  sessionKey: number;
}

export function DistributeDialog({
  open,
  onOpenChange,
  freeBalanceCents,
  envelopes,
  envelopeBalances,
  sessionKey,
}: DistributeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DistributeForm
        key={sessionKey}
        freeBalanceCents={freeBalanceCents}
        envelopes={envelopes}
        envelopeBalances={envelopeBalances}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function DistributeForm({
  freeBalanceCents,
  envelopes,
  envelopeBalances,
  onClose,
}: {
  freeBalanceCents: number;
  envelopes: EnvelopeRecord[];
  envelopeBalances: Record<string, number>;
  onClose: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<DistributeFormValues>({
    resolver: zodResolver(distributeFormSchema),
    defaultValues: {
      mode: "FIXED",
      allocations: {},
    },
  });

  const mode = useWatch({ control, name: "mode" });
  const watchedAllocations = useWatch({ control, name: "allocations" });

  const safeFreeBalance = Math.max(0, freeBalanceCents);

  const computedPreview = React.useMemo(() => {
    const rawValues = watchedAllocations ?? {};
    if (mode === "FIXED") {
      const centsPerEnv = envelopes.map((env) =>
        Math.max(0, parseCentsInput(rawValues[env.id] ?? ""))
      );
      const totalAssigned = centsPerEnv.reduce((sum, val) => sum + val, 0);
      return {
        centsPerEnv,
        totalAssigned,
        totalPercentage:
          safeFreeBalance > 0
            ? Math.round((totalAssigned / safeFreeBalance) * 100)
            : 0,
        exceeds: totalAssigned > safeFreeBalance,
      };
    }

    const percentages = envelopes.map((env) => {
      const cleaned = (rawValues[env.id] ?? "").replace(",", ".").trim();
      const parsed = cleaned ? Number(cleaned) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    });
    const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
    if (totalPercentage > 100.0001) {
      return {
        centsPerEnv: envelopes.map(() => 0),
        totalAssigned: 0,
        totalPercentage,
        exceeds: true,
      };
    }

    const centsPerEnv = distributeByPercentages(safeFreeBalance, percentages);
    const totalAssigned = centsPerEnv.reduce((sum, val) => sum + val, 0);
    return {
      centsPerEnv,
      totalAssigned,
      totalPercentage,
      exceeds: false,
    };
  }, [envelopes, mode, watchedAllocations, safeFreeBalance]);

  const handleEqualSplit = () => {
    setServerError(null);
    if (envelopes.length === 0) return;

    if (mode === "PERCENTAGE") {
      const base = Math.floor(100 / envelopes.length);
      const rem = 100 - base * envelopes.length;
      const next: Record<string, string> = {};
      envelopes.forEach((env, idx) => {
        next[env.id] = String(base + (idx === 0 ? rem : 0));
      });
      setValue("allocations", next);
    } else {
      const base = Math.floor(safeFreeBalance / envelopes.length);
      const rem = safeFreeBalance - base * envelopes.length;
      const next: Record<string, string> = {};
      envelopes.forEach((env, idx) => {
        const val = base + (idx === 0 ? rem : 0);
        next[env.id] = (val / 100).toFixed(2).replace(".", ",");
      });
      setValue("allocations", next);
    }
  };

  const onSubmit = async (values: DistributeFormValues) => {
    setServerError(null);

    if (safeFreeBalance <= 0) {
      setServerError("Não há Saldo Livre disponível para distribuir.");
      return;
    }
    if (computedPreview.exceeds) {
      setServerError(
        values.mode === "PERCENTAGE"
          ? "A soma dos percentuais não pode passar de 100%."
          : "O total distribuído excede o Saldo Livre."
      );
      return;
    }
    if (computedPreview.totalAssigned <= 0) {
      setServerError("Informe pelo menos um valor para distribuir.");
      return;
    }

    try {
      const allocations = envelopes
        .map((env, idx) => {
          if (values.mode === "FIXED") {
            return {
              envelopeId: env.id,
              value: computedPreview.centsPerEnv[idx],
            };
          }
          const cleaned = (values.allocations[env.id] ?? "")
            .replace(",", ".")
            .trim();
          const parsed = cleaned ? Number(cleaned) : 0;
          return {
            envelopeId: env.id,
            value: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
          };
        })
        .filter((item) => item.value > 0);

      const envelopeNames = Object.fromEntries(
        envelopes.map((env) => [env.id, env.name])
      );

      await distributeFreeBalanceInDb({
        freeBalanceCents: safeFreeBalance,
        mode: values.mode,
        allocations,
        envelopeNames,
      });
      onClose();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Erro ao distribuir Saldo Livre."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <DialogHeader className="pb-1">
        <div>
          <DialogTitle>Distribuir Saldo Livre</DialogTitle>
          <DialogDescription>
            Sala de espera disponível:{" "}
            <strong className="text-primary tabular-nums">
              {formatCents(safeFreeBalance)}
            </strong>
          </DialogDescription>
        </div>
        <DialogCloseButton onClick={onClose} />
      </DialogHeader>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={mode}
          onValueChange={(next) => {
            setValue("mode", next as "FIXED" | "PERCENTAGE");
            setValue("allocations", {});
            setServerError(null);
          }}
          className="flex-1 min-w-52"
        >
          <TabsList>
            <TabsTrigger value="FIXED">
              <CurrencyDollar size={15} weight="bold" />
              Valor fixo (R$)
            </TabsTrigger>
            <TabsTrigger value="PERCENTAGE">
              <Percent size={15} weight="bold" />
              Percentual (%)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleEqualSplit}
          disabled={envelopes.length === 0 || safeFreeBalance <= 0}
        >
          <Divide size={15} weight="bold" />
          Dividir igual
        </Button>
      </div>

      {envelopes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-subtle p-5 text-center text-sm text-text-secondary">
          Crie pelo menos uma caixinha antes de distribuir seu Saldo Livre.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
          {envelopes.map((env, idx) => {
            const color = getEnvelopeColorStyle(env.color);
            const IconComp = getEnvelopeIcon(env.icon);
            const currentBalance = envelopeBalances[env.id] ?? 0;
            const addedCents = computedPreview.centsPerEnv[idx] ?? 0;

            return (
              <div
                key={env.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-canvas p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${color.bgClass} ${color.textClass}`}
                  >
                    <IconComp size={19} weight="duotone" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      {env.name}
                    </p>
                    <p className="text-xs text-text-secondary tabular-nums">
                      Atual: {formatCents(currentBalance)}
                      {addedCents > 0 && (
                        <span className="ml-1.5 font-semibold text-sage-text">
                          (+{formatCents(addedCents)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="relative w-32 shrink-0">
                  <Input
                    inputMode="decimal"
                    placeholder={mode === "FIXED" ? "0,00" : "0"}
                    className="min-h-10 h-10 pr-8 text-right tabular-nums font-semibold"
                    aria-label={`${env.name} em ${mode === "FIXED" ? "reais" : "porcentagem"}`}
                    {...register(`allocations.${env.id}`)}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                    {mode === "FIXED" ? "R$" : "%"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-lavender p-3.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-secondary">Alocado:</span>
          <Badge
            variant={computedPreview.exceeds ? "coral" : "default"}
            className="tabular-nums"
          >
            {formatCents(computedPreview.totalAssigned)}
            {mode === "PERCENTAGE"
              ? ` (${computedPreview.totalPercentage.toFixed(0)}%)`
              : ""}
          </Badge>
        </div>
        <span className="font-medium text-primary tabular-nums">
          Restará no Saldo Livre:{" "}
          <strong>
            {formatCents(
              Math.max(0, safeFreeBalance - computedPreview.totalAssigned)
            )}
          </strong>
        </span>
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-2xl bg-coral-bg px-3.5 py-2.5 text-xs font-semibold text-coral-text"
        >
          {serverError}
        </p>
      )}

      <DialogFooter className="mt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            computedPreview.exceeds ||
            computedPreview.totalAssigned <= 0
          }
        >
          {isSubmitting ? "Distribuindo..." : "Confirmar distribuição"}
        </Button>
      </DialogFooter>
    </form>
  );
}
