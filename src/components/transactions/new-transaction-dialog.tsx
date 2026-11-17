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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerCloseButton,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBefinData } from "@/hooks/use-befin-data";
import { addThirdParty, addTransaction, todayIsoDate } from "@/lib/db";
import type { PaymentMethod, TransactionType } from "@/lib/ledger";
import { formatCents, parseCentsInput } from "@/lib/money";
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
      ? preset.fromEnvelopeId
      : (envelopes.find((env) => !env.is_emergency_fund)?.id ??
          envelopes[0]?.id ??
          null);

  const [txType, setTxType] = React.useState<TransactionType>(initialType);
  const [amountInput, setAmountInput] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(todayIsoDate);
  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethod>("PIX_DEBIT");
  const [selectedThirdPartyId, setSelectedThirdPartyId] = React.useState<
    string | null
  >(preset?.thirdPartyId ?? null);
  const [fromEnvelopeId, setFromEnvelopeId] = React.useState<string | null>(
    defaultExpenseEnvelope
  );
  const [toEnvelopeId, setToEnvelopeId] = React.useState<string | null>(
    preset?.toEnvelopeId ?? null
  );
  const [bankId, setBankId] = React.useState<string>("");
  const [isAddingPerson, setIsAddingPerson] = React.useState(false);
  const [newPersonName, setNewPersonName] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const parsedCents = parseCentsInput(amountInput);
  const selectedThirdParty =
    thirdParties.find((tp) => tp.id === selectedThirdPartyId) ?? null;

  const handleQuickAddPerson = async () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    const created = await addThirdParty(trimmed);
    setSelectedThirdPartyId(created.id);
    setNewPersonName("");
    setIsAddingPerson(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (parsedCents <= 0) {
      setErrorMessage("Informe um valor maior que zero.");
      return;
    }

    const cleanDescription =
      description.trim() ||
      (txType === "INCOME"
        ? "Recebimento registrado"
        : txType === "TRANSFER"
          ? "Transferência entre caixinhas"
          : selectedThirdParty
            ? `Compra para ${selectedThirdParty.name}`
            : "Despesa registrada");

    if (txType === "TRANSFER" && fromEnvelopeId === toEnvelopeId) {
      setErrorMessage("Escolha origem e destino diferentes para transferir.");
      return;
    }

    setIsSaving(true);
    try {
      if (txType === "INCOME") {
        await addTransaction({
          type: "INCOME",
          amount_cents: parsedCents,
          description: cleanDescription,
          date,
          payment_method: "PIX_DEBIT",
          status: "PAID",
          from_envelope_id: null,
          to_envelope_id: toEnvelopeId,
          third_party_id: null,
          bank_id: bankId || null,
        });
      } else if (txType === "TRANSFER") {
        await addTransaction({
          type: "TRANSFER",
          amount_cents: parsedCents,
          description: cleanDescription,
          date,
          payment_method: "PIX_DEBIT",
          status: "PAID",
          from_envelope_id: fromEnvelopeId,
          to_envelope_id: toEnvelopeId,
          third_party_id: null,
          bank_id: null,
        });
      } else {
        const isThirdParty = selectedThirdPartyId != null;
        const status =
          isThirdParty || paymentMethod === "CREDIT" ? "PENDING" : "PAID";

        await addTransaction({
          type: "EXPENSE",
          amount_cents: parsedCents,
          description: cleanDescription,
          date,
          payment_method: paymentMethod,
          status,
          from_envelope_id: isThirdParty ? null : fromEnvelopeId,
          to_envelope_id: null,
          third_party_id: selectedThirdPartyId,
          bank_id: paymentMethod === "PIX_DEBIT" && bankId ? bankId : null,
        });
      }
      onClose();
    } catch {
      setErrorMessage("Não foi possível salvar a movimentação.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DrawerHeader className="pb-2">
        <div>
          <DrawerTitle>Nova Movimentação</DrawerTitle>
          <DrawerDescription>
            Salvo instantaneamente no dispositivo (Local-First).
          </DrawerDescription>
        </div>
        <DrawerCloseButton onClick={onClose} />
      </DrawerHeader>

      <Tabs
        value={txType}
        onValueChange={(next) => {
          setErrorMessage(null);
          const typed = next as TransactionType;
          setTxType(typed);
          if (typed === "INCOME") {
            setToEnvelopeId(null);
          } else if (typed === "TRANSFER") {
            setFromEnvelopeId(null);
            setToEnvelopeId(envelopes[0]?.id ?? null);
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
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="tabular-nums text-lg font-bold pl-11"
              autoFocus
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-secondary">
              R$
            </span>
          </div>
          {amountInput.trim().length > 0 && (
            <span className="text-xs text-text-secondary tabular-nums">
              Interpretado como{" "}
              <strong className="text-primary">
                {formatCents(parsedCents)}
              </strong>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-date">Data</Label>
          <Input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="tabular-nums"
          />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tx-desc">Descrição</Label>
        <Input
          id="tx-desc"
          placeholder={
            txType === "INCOME"
              ? "Ex: Salário, Freela, Reembolso..."
              : txType === "TRANSFER"
                ? "Ex: Reserva do mês..."
                : "Ex: Supermercado, Farmácia, Café..."
          }
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* EXPENSE controls */}
      {txType === "EXPENSE" && (
        <div className="flex flex-col gap-4 rounded-2xl bg-canvas p-3.5 border border-border-subtle">
          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("PIX_DEBIT")}
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
                onClick={() => setPaymentMethod("CREDIT")}
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
                onClick={() => setIsAddingPerson((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent cursor-pointer"
              >
                <UserPlus size={14} weight="bold" />
                Nova pessoa
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedThirdPartyId(null)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  selectedThirdPartyId === null
                    ? "border-primary bg-primary text-white"
                    : "border-border-subtle bg-surface text-primary hover:bg-surface-lavender"
                )}
              >
                <Wallet size={14} weight="duotone" />
                Meu orçamento
              </button>

              {thirdParties.map((person) => {
                const isSelected = selectedThirdPartyId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelectedThirdPartyId(person.id)}
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

            {isAddingPerson && (
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="Nome da pessoa..."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
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
                value={fromEnvelopeId ?? "__FREE__"}
                onChange={(e) =>
                  setFromEnvelopeId(
                    e.target.value === "__FREE__" ? null : e.target.value
                  )
                }
              >
                <option value="__FREE__">
                  Saldo Livre — {formatCents(snapshot.freeBalanceCents)}
                </option>
                {envelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name} —{" "}
                    {formatCents(snapshot.envelopeBalances[env.id] ?? 0)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {paymentMethod === "PIX_DEBIT" && banks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-bank">Banco utilizado (opcional)</Label>
              <Select
                id="tx-bank"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
              >
                <option value="">Não especificar banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </Select>
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
              value={toEnvelopeId ?? "__FREE__"}
              onChange={(e) =>
                setToEnvelopeId(
                  e.target.value === "__FREE__" ? null : e.target.value
                )
              }
            >
              <option value="__FREE__">
                Saldo Livre (&ldquo;Sala de Espera&rdquo; — recomendado)
              </option>
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  Direto para {env.name}
                </option>
              ))}
            </Select>
          </div>
          {banks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-bank">Banco de destino (opcional)</Label>
              <Select
                id="income-bank"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
              >
                <option value="">Não especificar banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </Select>
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
              value={fromEnvelopeId ?? "__FREE__"}
              onChange={(e) =>
                setFromEnvelopeId(
                  e.target.value === "__FREE__" ? null : e.target.value
                )
              }
            >
              <option value="__FREE__">
                Saldo Livre ({formatCents(snapshot.freeBalanceCents)})
              </option>
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name} (
                  {formatCents(snapshot.envelopeBalances[env.id] ?? 0)})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-to">Ir para</Label>
            <Select
              id="transfer-to"
              value={toEnvelopeId ?? "__FREE__"}
              onChange={(e) =>
                setToEnvelopeId(
                  e.target.value === "__FREE__" ? null : e.target.value
                )
              }
            >
              <option value="__FREE__">
                Saldo Livre ({formatCents(snapshot.freeBalanceCents)})
              </option>
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name} (
                  {formatCents(snapshot.envelopeBalances[env.id] ?? 0)})
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="rounded-2xl bg-coral-bg px-3.5 py-2.5 text-xs font-semibold text-coral-text">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar movimentação"}
        </Button>
      </div>
    </form>
  );
}
