"use client";

import * as React from "react";
import {
  ArrowCounterClockwise,
  Bank,
  Check,
  Database,
  PencilSimple,
  Plus,
  Trash,
  Users,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBefinData } from "@/hooks/use-befin-data";
import {
  addBank,
  addThirdParty,
  clearAllLocalData,
  deleteBank,
  deleteThirdParty,
  resetDemoData,
  updateBank,
  updateThirdParty,
} from "@/lib/db";
import { formatCents, formatCentsDecimal, parseCentsInput } from "@/lib/money";

export type SettingsTab = "banks" | "third_parties" | "data";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: SettingsTab;
}

export function SettingsDialog({
  open,
  onOpenChange,
  defaultTab = "banks",
}: SettingsDialogProps) {
  const { banks, thirdParties, snapshot } = useBefinData();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(defaultTab);

  // Sync defaultTab when dialog opens
  const [lastDefaultTab, setLastDefaultTab] =
    React.useState<SettingsTab>(defaultTab);
  if (defaultTab !== lastDefaultTab) {
    setLastDefaultTab(defaultTab);
    setActiveTab(defaultTab);
  }

  // Banks state
  const [newBankName, setNewBankName] = React.useState("");
  const [newBankBalance, setNewBankBalance] = React.useState("");
  const [editingBankId, setEditingBankId] = React.useState<string | null>(null);
  const [editBankName, setEditBankName] = React.useState("");
  const [editBankBalance, setEditBankBalance] = React.useState("");

  // Third parties state
  const [newPersonName, setNewPersonName] = React.useState("");
  const [editingPersonId, setEditingPersonId] = React.useState<string | null>(
    null
  );
  const [editPersonName, setEditPersonName] = React.useState("");

  const [confirmClear, setConfirmClear] = React.useState(false);

  const handleAddBank = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newBankName.trim()) return;
    await addBank({
      name: newBankName,
      balance_cents: parseCentsInput(newBankBalance),
    });
    setNewBankName("");
    setNewBankBalance("");
  };

  const handleSaveBankEdit = async (id: string) => {
    if (!editBankName.trim()) return;
    await updateBank(id, {
      name: editBankName,
      balance_cents: parseCentsInput(editBankBalance),
    });
    setEditingBankId(null);
  };

  const handleAddPerson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPersonName.trim()) return;
    await addThirdParty(newPersonName);
    setNewPersonName("");
  };

  const handleSavePersonEdit = async (id: string) => {
    if (!editPersonName.trim()) return;
    await updateThirdParty(id, editPersonName);
    setEditingPersonId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div>
          <DialogTitle>Bancos &amp; Terceiros</DialogTitle>
          <DialogDescription>
            Gerencie seus bancos físicos, pessoas de compras compartilhadas e
            dados locais.
          </DialogDescription>
        </div>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
      >
        <TabsList>
          <TabsTrigger value="banks">
            <Bank size={15} weight="duotone" />
            Bancos
          </TabsTrigger>
          <TabsTrigger value="third_parties">
            <Users size={15} weight="duotone" />
            Terceiros
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database size={15} weight="duotone" />
            Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banks" className="mt-2 flex flex-col gap-4">
          <form
            onSubmit={handleAddBank}
            className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5 border border-border-subtle"
          >
            <Label>Adicionar banco</Label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <Input
                placeholder="Ex: Inter, Itaú, Nubank..."
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="sm:col-span-3"
              />
              <Input
                placeholder="Saldo R$"
                inputMode="decimal"
                value={newBankBalance}
                onChange={(e) => setNewBankBalance(e.target.value)}
                className="sm:col-span-2 tabular-nums"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="self-end"
              disabled={!newBankName.trim()}
            >
              <Plus size={14} weight="bold" />
              Cadastrar banco
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            {banks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border-subtle p-4 text-center text-sm text-text-secondary">
                Nenhum banco cadastrado ainda.
              </p>
            ) : (
              banks.map((bank) => {
                const isEditing = editingBankId === bank.id;
                return (
                  <div
                    key={bank.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-3.5"
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={editBankName}
                            onChange={(e) => setEditBankName(e.target.value)}
                            aria-label="Nome do banco"
                          />
                          <Input
                            inputMode="decimal"
                            value={editBankBalance}
                            onChange={(e) => setEditBankBalance(e.target.value)}
                            className="tabular-nums"
                            aria-label="Saldo atual do banco"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingBankId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveBankEdit(bank.id)}
                          >
                            <Check size={14} weight="bold" />
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary">
                            {bank.name}
                          </p>
                          <p className="text-xs text-text-secondary tabular-nums">
                            Saldo salvo: {formatCents(bank.balance_cents)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Editar ${bank.name}`}
                            onClick={() => {
                              setEditingBankId(bank.id);
                              setEditBankName(bank.name);
                              setEditBankBalance(
                                formatCentsDecimal(bank.balance_cents)
                              );
                            }}
                          >
                            <PencilSimple size={16} />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Remover ${bank.name}`}
                            onClick={() => deleteBank(bank.id)}
                            className="text-coral-text hover:bg-coral-bg/60"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="third_parties"
          className="mt-2 flex flex-col gap-4"
        >
          <form
            onSubmit={handleAddPerson}
            className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5 border border-border-subtle"
          >
            <Label htmlFor="new-third-party">Cadastrar pessoa</Label>
            <div className="flex gap-2">
              <Input
                id="new-third-party"
                placeholder="Nome da pessoa..."
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
              />
              <Button type="submit" disabled={!newPersonName.trim()}>
                <Plus size={16} weight="bold" />
                Adicionar
              </Button>
            </div>
          </form>

          <div className="flex flex-col gap-2">
            {thirdParties.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border-subtle p-4 text-center text-sm text-text-secondary">
                Nenhuma pessoa cadastrada ainda.
              </p>
            ) : (
              thirdParties.map((person) => {
                const isEditing = editingPersonId === person.id;
                const receivable =
                  snapshot.receivablesByThirdParty[person.id] ?? 0;

                return (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-3.5"
                  >
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={editPersonName}
                          onChange={(e) => setEditPersonName(e.target.value)}
                          className="min-h-9 h-9"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSavePersonEdit(person.id)}
                        >
                          <Check size={14} weight="bold" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPersonId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mauve-bg text-mauve-text font-semibold text-sm">
                            {person.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-primary">
                              {person.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Badge
                                variant={receivable > 0 ? "mauve" : "outline"}
                                className="tabular-nums"
                              >
                                A Receber: {formatCents(receivable)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Renomear ${person.name}`}
                            onClick={() => {
                              setEditingPersonId(person.id);
                              setEditPersonName(person.name);
                            }}
                          >
                            <PencilSimple size={16} />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Remover ${person.name}`}
                            onClick={() => deleteThirdParty(person.id)}
                            className="text-coral-text hover:bg-coral-bg/60"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-2 flex flex-col gap-3">
          <div className="rounded-2xl bg-surface-lavender p-4 text-sm text-primary">
            <p className="font-semibold">Armazenamento Local-First ativo</p>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              Todos os seus lançamentos, caixinhas, terceiros e conciliações
              são gravados diretamente no IndexedDB do seu navegador (Dexie.js),
              com IDs UUIDv7 e timestamps preparados para sincronização futura.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle p-4">
            <Button
              variant="secondary"
              onClick={async () => {
                await resetDemoData();
                onOpenChange(false);
              }}
              className="justify-start"
            >
              <ArrowCounterClockwise size={17} weight="bold" />
              Restaurar dados iniciais de exemplo
            </Button>

            {!confirmClear ? (
              <Button
                variant="coral"
                onClick={() => setConfirmClear(true)}
                className="justify-start"
              >
                <Trash size={17} weight="bold" />
                Zerar todos os dados locais
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-2xl bg-coral-bg/70 p-3">
                <p className="text-xs font-semibold text-coral-text">
                  Tem certeza? Isso apagará todas as caixinhas, bancos e
                  lançamentos deste dispositivo.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="coral"
                    onClick={async () => {
                      await clearAllLocalData();
                      setConfirmClear(false);
                      onOpenChange(false);
                    }}
                  >
                    Confirmar limpeza total
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
