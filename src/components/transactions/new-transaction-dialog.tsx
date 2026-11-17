"use client";

import * as React from "react";
import {
  ArrowsLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PixLogo,
  Plus,
  UserPlus,
  Users,
  Wallet,
} from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerCloseButton,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOptionItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBefinData } from "@/hooks/use-befin-data";
import { addThirdParty, addTransaction, todayIsoDate } from "@/lib/db";
import { BankIcon } from "@/lib/bank-icons";
import { getEnvelopeColorStyle, getEnvelopeIcon } from "@/lib/envelope-styles";
import type { TransactionType } from "@/lib/ledger";
import { formatCents, maskCurrencyInput, parseCentsInput } from "@/lib/money";
import {
  quickThirdPartySchema,
  type TransactionFormValues,
  transactionFormSchema,
} from "@/lib/schemas/forms";
import { cn } from "@/lib/utils";

export interface NewTransactionPreset {
  type?: TransactionType;
  fromEnvelopeId?: string | null;
  toEnvelopeId?: string | null;
  thirdPartyId?: string | null;
}

interface NewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: NewTransactionPreset;
  sessionKey: number;
}

export function NewTransactionDialog({
  open,
  onOpenChange,
  preset,
  sessionKey,
}: NewTransactionDialogProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <NewTransactionForm
        key={sessionKey}
        preset={preset}
        onClose={() => onOpenChange(false)}
      />
    </Drawer>
  );
}

function NewTransactionForm({
  preset,
  onClose,
}: {
  preset?: NewTransactionPreset;
  onClose: () => void;
}) {
  const { envelopes, thirdParties, banks, snapshot } = useBefinData();

  const initialType: TransactionType = preset?.type ?? "EXPENSE";
  const defaultExpenseEnvelope =
    preset?.fromEnvelopeId !== undefined
      ? (preset.fromEnvelopeId ?? "__FREE__")
      : (envelopes.find((env) => !env.is_emergency_fund)?.id ??
          envelopes[0]?.id ??
          "__FREE__");

  const [isAddingPerson, setIsAddingPerson] = React.useState(false);
  const [newPersonName, setNewPersonName] = React.useState("");
  const [personError, setPersonError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: initialType,
      amount: "",
      description: "",
      date: todayIsoDate(),
      paymentMethod: "PIX_DEBIT",
      fromEnvelopeId: defaultExpenseEnvelope,
      toEnvelopeId: preset?.toEnvelopeId ?? "__FREE__",
      bankId: "",
      isThirdParty: Boolean(preset?.thirdPartyId),
      thirdPartyId: preset?.thirdPartyId ?? "",
    },
  });

  const txType = useWatch({ control, name: "type" });
  const amountInput = useWatch({ control, name: "amount" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const fromEnvelopeId = useWatch({ control, name: "fromEnvelopeId" });
  const toEnvelopeId = useWatch({ control, name: "toEnvelopeId" });
  const bankId = useWatch({ control, name: "bankId" });
  const dateValue = useWatch({ control, name: "date" });
  const isThirdParty = useWatch({ control, name: "isThirdParty" });
  const selectedThirdPartyId = useWatch({ control, name: "thirdPartyId" });

  const parsedCents = parseCentsInput(amountInput ?? "");
  const selectedThirdParty =
    isThirdParty && selectedThirdPartyId
      ? (thirdParties.find((tp) => tp.id === selectedThirdPartyId) ?? null)
      : null;

  const handleQuickAddPerson = async () => {
    setPersonError(null);
    const parsed = quickThirdPartySchema.safeParse({ name: newPersonName });
    if (!parsed.success) {
      setPersonError(parsed.error.issues[0]?.message ?? "Nome inválido.");
      return;
    }
    const created = await addThirdParty(parsed.data.name);
    setValue("isThirdParty", true);
    setValue("thirdPartyId", created.id, { shouldValidate: true });
    setNewPersonName("");
    setIsAddingPerson(false);
  };

  const onSubmit = async (values: TransactionFormValues) => {
    setServerError(null);
    const amountCents = parseCentsInput(values.amount);
    const activeThirdParty =
      values.isThirdParty && values.thirdPartyId
        ? (thirdParties.find((tp) => tp.id === values.thirdPartyId) ?? null)
        : null;

    const cleanDescription =
      values.description.trim() ||
      (values.type === "INCOME"
        ? "Recebimento registrado"
        : values.type === "TRANSFER"
          ? "Transferência entre caixinhas"
          : activeThirdParty
            ? `Compra para ${activeThirdParty.name}`
            : "Despesa registrada");

    const normalizeEnvId = (val: string) => (val === "__FREE__" ? null : val);

    try {
      if (values.type === "INCOME") {
        await addTransaction({
          type: "INCOME",
          amount_cents: amountCents,
          description: cleanDescription,
          date: values.date,
          payment_method: "PIX_DEBIT",
          status: "PAID",
          from_envelope_id: null,
          to_envelope_id: normalizeEnvId(values.toEnvelopeId),
          third_party_id: null,
          bank_id: values.bankId || null,
        });
      } else if (values.type === "TRANSFER") {
        await addTransaction({
          type: "TRANSFER",
          amount_cents: amountCents,
          description: cleanDescription,
          date: values.date,
          payment_method: "PIX_DEBIT",
          status: "PAID",
          from_envelope_id: normalizeEnvId(values.fromEnvelopeId),
          to_envelope_id: normalizeEnvId(values.toEnvelopeId),
          third_party_id: null,
          bank_id: null,
        });
      } else {
        const thirdPartyFlag = Boolean(activeThirdParty);
        const status =
          thirdPartyFlag || values.paymentMethod === "CREDIT"
            ? "PENDING"
            : "PAID";

        await addTransaction({
          type: "EXPENSE",
          amount_cents: amountCents,
          description: cleanDescription,
          date: values.date,
          payment_method: values.paymentMethod,
          status,
          from_envelope_id: thirdPartyFlag
            ? null
            : normalizeEnvId(values.fromEnvelopeId),
          to_envelope_id: null,
          third_party_id: activeThirdParty ? activeThirdParty.id : null,
          bank_id:
            values.paymentMethod === "PIX_DEBIT" && values.bankId
              ? values.bankId
              : null,
        });
      }
      onClose();
    } catch {
      setServerError("Não foi possível salvar a movimentação.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <DrawerHeader className="pb-2">
        <div>
          <DrawerTitle>Nova Movimentação</DrawerTitle>
          <DrawerDescription>
            Registre um gasto, recebimento ou transferência.
          </DrawerDescription>
        </div>
        <DrawerCloseButton onClick={onClose} />
      </DrawerHeader>

      <Tabs
        value={txType}
        onValueChange={(next) => {
          setServerError(null);
          clearErrors();
          const typed = next as TransactionType;
          setValue("type", typed);
          if (typed === "INCOME") {
            setValue("toEnvelopeId", "__FREE__");
          } else if (typed === "TRANSFER") {
            setValue("fromEnvelopeId", "__FREE__");
            setValue("toEnvelopeId", envelopes[0]?.id ?? "__FREE__");
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="EXPENSE">
            <ArrowUpRight size={15} weight="bold" />
            Gasto
          </TabsTrigger>
          <TabsTrigger value="INCOME">
            <ArrowDownLeft size={15} weight="bold" />
            Recebimento
          </TabsTrigger>
          <TabsTrigger value="TRANSFER">
            <ArrowsLeftRight size={15} weight="bold" />
            Transferir
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Value & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="tx-amount">Valor (R$)</Label>
          <div className="relative">
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={Boolean(errors.amount)}
              className="tabular-nums text-lg font-bold pl-11"
              autoFocus
              value={amountInput}
              onChange={(e) =>
                setValue("amount", maskCurrencyInput(e.target.value), {
                  shouldValidate: true,
                })
              }
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-secondary">
              R$
            </span>
          </div>
          {errors.amount ? (
            <p className="text-xs font-medium text-coral-text">
              {errors.amount.message}
            </p>
          ) : (
            amountInput.trim().length > 0 && (
              <span className="text-xs text-text-secondary tabular-nums">
                Interpretado como{" "}
                <strong className="text-primary">
                  {formatCents(parsedCents)}
                </strong>
              </span>
            )
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-date">Data</Label>
          <DatePicker
            id="tx-date"
            value={dateValue}
            onChange={(val) => setValue("date", val, { shouldValidate: true })}
          />
          {errors.date && (
            <p className="text-xs font-medium text-coral-text">
              {errors.date.message}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-desc">Descrição</Label>
        <Input
          id="tx-desc"
          aria-invalid={Boolean(errors.description)}
          placeholder={
            txType === "INCOME"
              ? "Ex: Salário, Freela, Reembolso..."
              : txType === "TRANSFER"
                ? "Ex: Reserva do mês..."
                : "Ex: Supermercado, Farmácia, Café..."
          }
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs font-medium text-coral-text">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* EXPENSE controls */}
      {txType === "EXPENSE" && (
        <div className="flex flex-col gap-4 rounded-2xl bg-canvas p-3.5 border border-border-subtle">
          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue("paymentMethod", "PIX_DEBIT")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                  paymentMethod === "PIX_DEBIT"
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border-subtle bg-surface text-primary hover:bg-surface-lavender/60"
                )}
              >
                <PixLogo size={17} weight="duotone" />
                Pix / Débito
              </button>
              <button
                type="button"
                onClick={() => setValue("paymentMethod", "CREDIT")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                  paymentMethod === "CREDIT"
                    ? "border-amber-text/30 bg-amber-bg text-amber-text shadow-sm"
                    : "border-border-subtle bg-surface text-primary hover:bg-surface-lavender/60"
                )}
              >
                <CreditCard size={17} weight="duotone" />
                Crédito (A Pagar)
              </button>
            </div>
          </div>

          {/* Third-party selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Para quem é este gasto?</Label>
              <button
                type="button"
                onClick={() => {
                  setPersonError(null);
                  setIsAddingPerson((prev) => !prev);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent cursor-pointer"
              >
                <UserPlus size={14} weight="bold" />
                Nova pessoa
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setValue("isThirdParty", false);
                  setValue("thirdPartyId", "", { shouldValidate: true });
                }}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  !isThirdParty
                    ? "border-primary bg-primary text-white"
                    : "border-border-subtle bg-surface text-primary hover:bg-surface-lavender"
                )}
              >
                <Wallet size={14} weight="duotone" />
                Meu orçamento
              </button>

              {thirdParties.map((person) => {
                const isSelected =
                  isThirdParty && selectedThirdPartyId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      setValue("isThirdParty", true);
                      setValue("thirdPartyId", person.id, {
                        shouldValidate: true,
                      });
                    }}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                      isSelected
                        ? "border-mauve-text/30 bg-mauve-bg text-mauve-text"
                        : "border-border-subtle bg-surface text-primary hover:bg-mauve-bg/50"
                    )}
                  >
                    <Users size={14} weight="duotone" />
                    {person.name}
                  </button>
                );
              })}
            </div>

            {errors.thirdPartyId && (
              <p className="text-xs font-medium text-coral-text">
                {errors.thirdPartyId.message}
              </p>
            )}

            {isAddingPerson && (
              <div className="mt-1 flex flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da pessoa..."
                    value={newPersonName}
                    onChange={(e) => {
                      setPersonError(null);
                      setNewPersonName(e.target.value);
                    }}
                    className="min-h-9 h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickAddPerson}
                    disabled={!newPersonName.trim()}
                  >
                    <Plus size={14} weight="bold" />
                    Salvar
                  </Button>
                </div>
                {personError && (
                  <p className="text-xs font-medium text-coral-text">
                    {personError}
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedThirdParty ? (
            <div className="rounded-2xl bg-mauve-bg/75 p-3 text-xs text-mauve-text leading-relaxed">
              <strong className="font-semibold">
                Compra para {selectedThirdParty.name}:
              </strong>{" "}
              não abate nenhuma caixinha sua e fica separada em{" "}
              <Badge variant="mauve" className="mx-0.5">
                A Receber
              </Badge>{" "}
              até você confirmar o pagamento.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-envelope">Qual caixinha abater?</Label>
              <Select
                id="tx-envelope"
                value={fromEnvelopeId}
                onChange={(e) => setValue("fromEnvelopeId", e.target.value)}
                options={[
                  {
                    value: "__FREE__",
                    label: `Saldo Livre — ${formatCents(snapshot.freeBalanceCents)}`,
                    icon: (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface-lavender text-primary">
                        <Wallet size={14} weight="duotone" />
                      </span>
                    ),
                  },
                  ...envelopes.map((env): SelectOptionItem => {
                    const style = getEnvelopeColorStyle(env.color);
                    const IconComp = getEnvelopeIcon(env.icon);
                    return {
                      value: env.id,
                      label: `${env.name} — ${formatCents(snapshot.envelopeBalances[env.id] ?? 0)}`,
                      icon: (
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-lg",
                            style.bgClass,
                            style.textClass
                          )}
                        >
                          <IconComp size={14} weight="duotone" />
                        </span>
                      ),
                    };
                  }),
                ]}
              />
            </div>
          )}

          {paymentMethod === "PIX_DEBIT" && banks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-bank">Banco utilizado (opcional)</Label>
              <Select
                id="tx-bank"
                value={bankId}
                onChange={(e) => setValue("bankId", e.target.value)}
                options={[
                  { value: "", label: "Não especificar banco" },
                  ...banks.map((bank): SelectOptionItem => ({
                    value: bank.id,
                    label: bank.name,
                    icon: <BankIcon name={bank.name} />,
                  })),
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* INCOME controls */}
      {txType === "INCOME" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-canvas p-3.5 border border-border-subtle">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="income-target">Onde o valor entra?</Label>
            <Select
              id="income-target"
              value={toEnvelopeId}
              onChange={(e) => setValue("toEnvelopeId", e.target.value)}
              options={[
                {
                  value: "__FREE__",
                  label: "Saldo Livre (“Sala de Espera” — recomendado)",
                  icon: (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface-lavender text-primary">
                      <Wallet size={14} weight="duotone" />
                    </span>
                  ),
                },
                ...envelopes.map((env): SelectOptionItem => {
                  const style = getEnvelopeColorStyle(env.color);
                  const IconComp = getEnvelopeIcon(env.icon);
                  return {
                    value: env.id,
                    label: `Direto para ${env.name}`,
                    icon: (
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-lg",
                          style.bgClass,
                          style.textClass
                        )}
                      >
                        <IconComp size={14} weight="duotone" />
                      </span>
                    ),
                  };
                }),
              ]}
            />
          </div>
          {banks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-bank">Banco de destino (opcional)</Label>
              <Select
                id="income-bank"
                value={bankId}
                onChange={(e) => setValue("bankId", e.target.value)}
                options={[
                  { value: "", label: "Não especificar banco" },
                  ...banks.map((bank): SelectOptionItem => ({
                    value: bank.id,
                    label: bank.name,
                    icon: <BankIcon name={bank.name} />,
                  })),
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* TRANSFER controls */}
      {txType === "TRANSFER" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-canvas p-3.5 border border-border-subtle">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-from">Sair de</Label>
            <Select
              id="transfer-from"
              value={fromEnvelopeId}
              onChange={(e) =>
                setValue("fromEnvelopeId", e.target.value, {
                  shouldValidate: true,
                })
              }
              options={[
                {
                  value: "__FREE__",
                  label: `Saldo Livre (${formatCents(snapshot.freeBalanceCents)})`,
                  icon: (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface-lavender text-primary">
                      <Wallet size={14} weight="duotone" />
                    </span>
                  ),
                },
                ...envelopes.map((env): SelectOptionItem => {
                  const style = getEnvelopeColorStyle(env.color);
                  const IconComp = getEnvelopeIcon(env.icon);
                  return {
                    value: env.id,
                    label: `${env.name} (${formatCents(snapshot.envelopeBalances[env.id] ?? 0)})`,
                    icon: (
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-lg",
                          style.bgClass,
                          style.textClass
                        )}
                      >
                        <IconComp size={14} weight="duotone" />
                      </span>
                    ),
                  };
                }),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-to">Ir para</Label>
            <Select
              id="transfer-to"
              value={toEnvelopeId}
              onChange={(e) =>
                setValue("toEnvelopeId", e.target.value, {
                  shouldValidate: true,
                })
              }
              options={[
                {
                  value: "__FREE__",
                  label: `Saldo Livre (${formatCents(snapshot.freeBalanceCents)})`,
                  icon: (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface-lavender text-primary">
                      <Wallet size={14} weight="duotone" />
                    </span>
                  ),
                },
                ...envelopes.map((env): SelectOptionItem => {
                  const style = getEnvelopeColorStyle(env.color);
                  const IconComp = getEnvelopeIcon(env.icon);
                  return {
                    value: env.id,
                    label: `${env.name} (${formatCents(snapshot.envelopeBalances[env.id] ?? 0)})`,
                    icon: (
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-lg",
                          style.bgClass,
                          style.textClass
                        )}
                      >
                        <IconComp size={14} weight="duotone" />
                      </span>
                    ),
                  };
                }),
              ]}
            />
          </div>
          {errors.toEnvelopeId && (
            <p className="sm:col-span-2 text-xs font-medium text-coral-text">
              {errors.toEnvelopeId.message}
            </p>
          )}
        </div>
      )}

      {serverError && (
        <p
          role="alert"
          className="rounded-2xl bg-coral-bg px-3.5 py-2.5 text-xs font-semibold text-coral-text"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar movimentação"}
        </Button>
      </div>
    </form>
  );
}
