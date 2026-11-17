"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowsLeftRight,
  ArrowUpRight,
  Trash,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  EnvelopeRecord,
  ThirdPartyRecord,
  TransactionRecord,
} from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { editorialSpring, fastTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  transaction: TransactionRecord;
  envelopesById: Record<string, EnvelopeRecord>;
  thirdPartiesById: Record<string, ThirdPartyRecord>;
  selectable?: boolean;
  selected?: boolean;
  onRowClick?: (
    tx: TransactionRecord,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
  onCheckboxToggle?: (tx: TransactionRecord, shiftKey: boolean) => void;
  onDelete?: (tx: TransactionRecord) => void;
}

function formatDateBr(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const TransactionRow = React.forwardRef<
  HTMLDivElement,
  TransactionRowProps
>(function TransactionRow(
  {
    transaction,
    envelopesById,
    thirdPartiesById,
    selectable = false,
    selected = false,
    onRowClick,
    onCheckboxToggle,
    onDelete,
  },
  ref
) {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const isIncome = transaction.type === "INCOME";
  const isTransfer = transaction.type === "TRANSFER";
  const isThirdParty = transaction.third_party_id != null;
  const thirdParty = transaction.third_party_id
    ? thirdPartiesById[transaction.third_party_id]
    : undefined;

  const fromEnvelope = transaction.from_envelope_id
    ? envelopesById[transaction.from_envelope_id]
    : undefined;
  const toEnvelope = transaction.to_envelope_id
    ? envelopesById[transaction.to_envelope_id]
    : undefined;

  const IconComp = isIncome
    ? ArrowDownLeft
    : isTransfer
      ? ArrowsLeftRight
      : ArrowUpRight;

  const iconBgClass = isIncome
    ? "bg-sage-bg text-sage-text"
    : isTransfer
      ? "bg-surface-lavender text-primary"
      : isThirdParty
        ? "bg-mauve-bg text-mauve-text"
        : "bg-amber-bg/70 text-amber-text";

  const amountPrefix = isIncome ? "+" : isTransfer ? "" : "-";

  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: editorialSpring }}
      exit={{ opacity: 0, scale: 0.98, transition: fastTransition }}
      onClick={(event) => onRowClick?.(transaction, event)}
      className={cn(
        "group flex items-start sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-[background-color,border-color,box-shadow] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)]",
        selected
          ? "border-accent bg-surface-lavender/65 shadow-xs"
          : "border-border-subtle bg-surface hover:border-accent-soft",
        onRowClick && "cursor-pointer select-none"
      )}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {selectable && (
          <div
            className="pt-1 sm:pt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              aria-label={`Selecionar ${transaction.description}`}
              onClick={(e) => {
                e.stopPropagation();
                onCheckboxToggle?.(transaction, e.shiftKey);
              }}
            />
          </div>
        )}

        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            iconBgClass
          )}
        >
          <IconComp size={18} weight="bold" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-primary">
              {transaction.description}
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-secondary tabular-nums">
              {formatDateBr(transaction.date)}
            </span>

            {isIncome && (
              <Badge variant="sage">
                {toEnvelope ? toEnvelope.name : "Saldo Livre"}
              </Badge>
            )}

            {isTransfer && (
              <Badge variant="lavender">
                {fromEnvelope ? fromEnvelope.name : "Saldo Livre"} →{" "}
                {toEnvelope ? toEnvelope.name : "Saldo Livre"}
              </Badge>
            )}

            {transaction.type === "EXPENSE" && !isThirdParty && (
              <Badge variant="lavender">
                {fromEnvelope ? fromEnvelope.name : "Saldo Livre"}
              </Badge>
            )}

            {isThirdParty && (
              <Badge variant="mauve">
                Terceiro: {thirdParty ? thirdParty.name : "Pessoa removida"}
              </Badge>
            )}

            {transaction.type === "EXPENSE" &&
              transaction.payment_method === "CREDIT" && (
                <Badge
                  variant={
                    transaction.status === "PENDING" ? "amber" : "outline"
                  }
                >
                  {transaction.status === "PENDING"
                    ? "Crédito: A Pagar"
                    : "Crédito: Pago"}
                </Badge>
              )}

            {isThirdParty &&
              transaction.payment_method === "PIX_DEBIT" &&
              transaction.status === "PENDING" && (
                <Badge variant="amber">A Receber</Badge>
              )}

            {isThirdParty && transaction.status === "PAID" && (
              <Badge variant="sage">Reembolsado</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            "text-sm sm:text-base font-bold tabular-nums",
            isIncome
              ? "text-sage-text"
              : isTransfer
                ? "text-primary"
                : isThirdParty
                  ? "text-mauve-text"
                  : "text-primary"
          )}
        >
          {amountPrefix}
          {formatCents(transaction.amount_cents)}
        </span>

        {onDelete && (
          <button
            type="button"
            aria-label={`Excluir ${transaction.description}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteOpen(true);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-coral-bg hover:text-coral-text transition-all cursor-pointer"
          >
            <Trash size={15} weight="bold" />
          </button>
        )}
      </div>

      {onDelete && (
        <Dialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          className="sm:max-w-md"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Excluir movimentação?</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir{" "}
                <span className="font-semibold text-primary">
                  {transaction.description}
                </span>{" "}
                ({amountPrefix}
                {formatCents(transaction.amount_cents)})? Esta ação não pode ser
                desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="coral"
                onClick={() => {
                  onDelete(transaction);
                  setIsDeleteOpen(false);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </motion.div>
  );
});
