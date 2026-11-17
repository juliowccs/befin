"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowsLeftRight,
  ArrowUpRight,
  PencilSimple,
  Plus,
  ShieldCheck,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { DistributeDialog } from "@/components/envelopes/distribute-dialog";
import { SegmentedBar } from "@/components/envelopes/segmented-bar";
import { useAppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBefinData } from "@/hooks/use-befin-data";
import { addEnvelope, deleteEnvelope, updateEnvelope } from "@/lib/db";
import {
  ENVELOPE_COLOR_LIST,
  ENVELOPE_ICONS,
  getEnvelopeColorStyle,
  getEnvelopeIcon,
} from "@/lib/envelope-styles";
import type { EnvelopeColor, EnvelopeRecord } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { editorialSpring, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function CaixinhasPage() {
  const { openNewTransaction } = useAppShell();
  const { isLoading, envelopes, transactions, snapshot } = useBefinData();

  const [isDistributeOpen, setIsDistributeOpen] = React.useState(false);
  const [distributeSessionKey, setDistributeSessionKey] = React.useState(0);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEnvelope, setEditingEnvelope] =
    React.useState<EnvelopeRecord | null>(null);
  const [formSessionKey, setFormSessionKey] = React.useState(0);

  const openCreateModal = () => {
    setEditingEnvelope(null);
    setFormSessionKey((k) => k + 1);
    setIsFormOpen(true);
  };

  const openEditModal = (env: EnvelopeRecord) => {
    setEditingEnvelope(env);
    setFormSessionKey((k) => k + 1);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-36 animate-pulse rounded-3xl bg-surface" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-44 animate-pulse rounded-3xl bg-surface" />
          <div className="h-44 animate-pulse rounded-3xl bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            Caixinhas Virtuais
          </h1>
          <p className="text-sm text-text-secondary">
            Saldos acumulativos que não resetam na virada do mês.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDistributeSessionKey((k) => k + 1);
              setIsDistributeOpen(true);
            }}
            disabled={snapshot.freeBalanceCents <= 0}
          >
            <Sparkle size={15} weight="duotone" />
            Distribuir ({formatCents(snapshot.freeBalanceCents)})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNewTransaction({ type: "TRANSFER" })}
          >
            <ArrowsLeftRight size={15} weight="bold" />
            Transferir
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus size={15} weight="bold" />
            Nova caixinha
          </Button>
        </div>
      </div>

      {/* Summary & Segmented Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <CardDescription>Total guardado nas caixinhas</CardDescription>
              <CardTitle className="mt-0.5 text-2xl sm:text-3xl tabular-nums">
                {formatCents(snapshot.totalEnvelopesCents)}
              </CardTitle>
            </div>
            <Badge variant="lavender" className="tabular-nums">
              Saldo Livre: {formatCents(snapshot.freeBalanceCents)}
            </Badge>
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

      {/* Envelopes List */}
      {envelopes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-text-secondary">
              Crie suas caixinhas para dividir o dinheiro que está nos bancos.
            </p>
            <Button onClick={openCreateModal}>
              <Plus size={16} weight="bold" />
              Criar primeira caixinha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {envelopes.map((env) => {
              const style = getEnvelopeColorStyle(env.color);
              const IconComp = getEnvelopeIcon(env.icon);
              const balance = snapshot.envelopeBalances[env.id] ?? 0;
              const envTxCount = transactions.filter(
                (tx) =>
                  tx.from_envelope_id === env.id || tx.to_envelope_id === env.id
              ).length;

              return (
                <motion.div
                  key={env.id}
                  layout
                  variants={staggerItem}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={editorialSpring}
                  className="h-full"
                >
                  <Card className="t-interactive-card flex h-full flex-col">
                <CardContent className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.bgClass} ${style.textClass}`}
                      >
                        <IconComp size={24} weight="duotone" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 font-display text-lg font-bold leading-snug text-primary">
                          {env.name}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {env.is_emergency_fund && (
                            <Badge variant="sage">
                              <ShieldCheck size={12} weight="fill" />
                              Reserva de Emergência
                            </Badge>
                          )}
                          <span className="text-xs text-text-secondary tabular-nums">
                            {envTxCount}{" "}
                            {envTxCount === 1 ? "movimentação" : "movimentações"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Editar ${env.name}`}
                        onClick={() => openEditModal(env)}
                      >
                        <PencilSimple size={16} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Excluir ${env.name}`}
                        onClick={() => void deleteEnvelope(env.id)}
                        className="text-coral-text hover:bg-coral-bg/70"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    <div className="rounded-2xl bg-canvas px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        Saldo disponível
                      </span>
                      <span
                        className={cn(
                          "font-display text-xl font-bold tabular-nums",
                          balance < 0 ? "text-coral-text" : "text-primary"
                        )}
                      >
                        {formatCents(balance)}
                      </span>
                    </div>

                    <div className="flex gap-2">
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
                  </div>
                  </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <DistributeDialog
        open={isDistributeOpen}
        onOpenChange={setIsDistributeOpen}
        freeBalanceCents={snapshot.freeBalanceCents}
        envelopes={envelopes}
        envelopeBalances={snapshot.envelopeBalances}
        sessionKey={distributeSessionKey}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <EnvelopeForm
          key={formSessionKey}
          envelope={editingEnvelope}
          onClose={() => setIsFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}

function EnvelopeForm({
  envelope,
  onClose,
}: {
  envelope: EnvelopeRecord | null;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(envelope?.name ?? "");
  const [color, setColor] = React.useState<EnvelopeColor>(
    envelope?.color ?? "lavender"
  );
  const [icon, setIcon] = React.useState(envelope?.icon ?? "PiggyBank");
  const [isEmergencyFund, setIsEmergencyFund] = React.useState(
    envelope?.is_emergency_fund ?? false
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      if (envelope) {
        await updateEnvelope(envelope.id, {
          name,
          color,
          icon,
          is_emergency_fund: isEmergencyFund,
        });
      } else {
        await addEnvelope({
          name,
          color,
          icon,
          is_emergency_fund: isEmergencyFund,
        });
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader className="pb-1">
        <div>
          <DialogTitle>
            {envelope ? "Editar Caixinha" : "Nova Caixinha"}
          </DialogTitle>
          <DialogDescription>
            Personalize nome, cor pastel e ícone da caixinha virtual.
          </DialogDescription>
        </div>
        <DialogCloseButton onClick={onClose} />
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="env-name">Nome da caixinha</Label>
        <Input
          id="env-name"
          placeholder="Ex: Mercado, Lazer, Reserva..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor pastel</Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ENVELOPE_COLOR_LIST.map((item) => {
            const active = color === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setColor(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border p-2 text-[11px] font-semibold transition-all cursor-pointer",
                  active
                    ? "border-primary bg-surface-lavender shadow-xs"
                    : "border-border-subtle bg-surface hover:border-accent-soft"
                )}
              >
                <span
                  className="h-6 w-6 rounded-full border border-primary/10"
                  style={{ backgroundColor: item.swatchHex }}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Ícone</Label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {ENVELOPE_ICONS.map((opt) => {
            const IconComp = opt.component;
            const active = icon === opt.id;
            const colorStyle = getEnvelopeColorStyle(color);
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                onClick={() => setIcon(opt.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-[10px] font-semibold transition-all cursor-pointer",
                  active
                    ? `border-primary ${colorStyle.bgClass} ${colorStyle.textClass}`
                    : "border-border-subtle bg-surface text-text-secondary hover:text-primary"
                )}
              >
                <IconComp size={20} weight="duotone" />
                <span className="truncate w-full text-center">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        onClick={() => setIsEmergencyFund((prev) => !prev)}
        className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-sage-bg/35 p-3.5 cursor-pointer"
      >
        <Checkbox
          checked={isEmergencyFund}
          onCheckedChange={(checked) => setIsEmergencyFund(checked)}
          aria-label="Marcar como Reserva de Emergência"
        />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-sage-text">
            Marcar como Reserva de Emergência
          </p>
          <p className="text-text-secondary">
            Sobras de rendimentos encontradas na Conciliação poderão ser
            enviadas para esta caixinha com 1 clique.
          </p>
        </div>
      </div>

      <DialogFooter className="mt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving || !name.trim()}>
          {isSaving
            ? "Salvando..."
            : envelope
              ? "Salvar alterações"
              : "Criar caixinha"}
        </Button>
      </DialogFooter>
    </form>
  );
}
