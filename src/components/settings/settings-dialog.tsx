"use client";

import { BankIcon } from "@/lib/bank-icons";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise,
  Bank,
  Check,
  Database,
  DownloadSimple,
  PencilSimple,
  Plus,
  SignOut,
  Trash,
  UserCircle,
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
  db,
  deleteBank,
  deleteThirdParty,
  resetDemoData,
  updateBank,
  updateThirdParty,
} from "@/lib/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { formatCents, formatCentsDecimal, parseCentsInput } from "@/lib/money";
import {
  type SetPasswordValues,
  setPasswordSchema,
} from "@/src/lib/schemas/auth";
import {
  type BankFormValues,
  bankFormSchema,
  type QuickThirdPartyValues,
  quickThirdPartySchema,
} from "@/src/lib/schemas/forms";
import { authClient, useSession } from "@/src/lib/auth-client";

export type SettingsTab = "banks" | "third_parties" | "data";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: SettingsTab;
  embedded?: boolean;
}

export function SettingsDialog({
  open,
  onOpenChange,
  defaultTab = "banks",
  embedded = false,
}: SettingsDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { banks, thirdParties, snapshot } = useBefinData();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(defaultTab);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = React.useState(false);
  const [isAccountBusy, setIsAccountBusy] = React.useState(false);
  const [accountError, setAccountError] = React.useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = React.useState<string | null>(
    null,
  );

  // Sync defaultTab when dialog opens
  const [lastDefaultTab, setLastDefaultTab] =
    React.useState<SettingsTab>(defaultTab);
  if (defaultTab !== lastDefaultTab) {
    setLastDefaultTab(defaultTab);
    setActiveTab(defaultTab);
  }

  // Banks state & forms
  const [editingBankId, setEditingBankId] = React.useState<string | null>(null);
  const addBankForm = useForm<BankFormValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: { name: "", balance: "" },
  });
  const editBankForm = useForm<BankFormValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: { name: "", balance: "" },
  });

  // Third parties state & forms
  const [editingPersonId, setEditingPersonId] = React.useState<string | null>(
    null
  );
  const addPersonForm = useForm<QuickThirdPartyValues>({
    resolver: zodResolver(quickThirdPartySchema),
    defaultValues: { name: "" },
  });
  const editPersonForm = useForm<QuickThirdPartyValues>({
    resolver: zodResolver(quickThirdPartySchema),
    defaultValues: { name: "" },
  });

  // Password form
  const passwordForm = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  const [confirmClear, setConfirmClear] = React.useState(false);

  const handleAddBank = async (values: BankFormValues) => {
    await addBank({
      name: values.name,
      balance_cents: parseCentsInput(values.balance),
    });
    addBankForm.reset();
  };

  const handleSaveBankEdit = async (id: string, values: BankFormValues) => {
    await updateBank(id, {
      name: values.name,
      balance_cents: parseCentsInput(values.balance),
    });
    setEditingBankId(null);
  };

  const handleAddPerson = async (values: QuickThirdPartyValues) => {
    await addThirdParty(values.name);
    addPersonForm.reset();
  };

  const handleSavePersonEdit = async (
    id: string,
    values: QuickThirdPartyValues
  ) => {
    await updateThirdParty(id, values.name);
    setEditingPersonId(null);
  };

  const handleExportJson = async () => {
    setAccountError(null);
    setIsAccountBusy(true);
    try {
      const [
        localBanks,
        localEnvelopes,
        localThirdParties,
        localTransactions,
        localReconciliations,
      ] = await Promise.all([
        db.banks.toArray(),
        db.envelopes.toArray(),
        db.third_parties.toArray(),
        db.transactions.toArray(),
        db.reconciliations.toArray(),
      ]);

      let cloudData: unknown = null;
      if (session?.user) {
        const res = await fetch("/api/account");
        if (res.ok) {
          cloudData = await res.json();
        }
      }

      const payload = {
        exported_at: new Date().toISOString(),
        mode: session?.user ? "authenticated" : "guest_local",
        profile: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
            }
          : null,
        local_data: {
          banks: localBanks,
          envelopes: localEnvelopes,
          third_parties: localThirdParties,
          transactions: localTransactions,
          reconciliations: localReconciliations,
        },
        cloud_data: cloudData,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "befin-dados-lgpd.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAccountError("Não foi possível exportar seus dados agora.");
    } finally {
      setIsAccountBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setAccountError(null);
    setIsAccountBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setAccountError("Não foi possível excluir sua conta no servidor.");
        return;
      }
      await clearAllLocalData();
      await authClient.signOut();
      setConfirmDeleteAccount(false);
      onOpenChange(false);
      router.push("/");
      router.refresh();
    } catch {
      setAccountError("Erro ao excluir conta. Tente novamente.");
    } finally {
      setIsAccountBusy(false);
    }
  };

  const tabsBody = (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as SettingsTab)}
      className={
        embedded
          ? "md:grid md:grid-cols-[230px_1fr] md:items-start md:gap-8"
          : undefined
      }
    >
      {/* Mobile tabs */}
      <TabsList className={embedded ? "md:hidden" : undefined}>
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

      {/* Desktop sidebar */}
      {embedded && (
        <aside className="hidden md:flex md:flex-col md:gap-1.5 md:sticky md:top-6 rounded-2xl border border-border-subtle bg-surface p-2">
          <button
            type="button"
            onClick={() => setActiveTab("banks")}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "banks"
                ? "bg-surface-lavender text-primary"
                : "text-text-secondary hover:bg-canvas hover:text-primary"
            }`}
          >
            <Bank size={17} weight="duotone" />
            Bancos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("third_parties")}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "third_parties"
                ? "bg-surface-lavender text-primary"
                : "text-text-secondary hover:bg-canvas hover:text-primary"
            }`}
          >
            <Users size={17} weight="duotone" />
            Terceiros
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "data"
                ? "bg-surface-lavender text-primary"
                : "text-text-secondary hover:bg-canvas hover:text-primary"
            }`}
          >
            <Database size={17} weight="duotone" />
            Dados &amp; Conta
          </button>
        </aside>
      )}

      <div className={embedded ? "min-w-0" : undefined}>

        <TabsContent value="banks" className="mt-2 flex flex-col gap-4">
          <form
            onSubmit={addBankForm.handleSubmit(handleAddBank)}
            noValidate
            className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5 border border-border-subtle"
          >
            <Label>Adicionar banco</Label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <div className="sm:col-span-3 flex flex-col gap-1">
                <Input
                  placeholder="Ex: Inter, Itaú, Nubank..."
                  aria-invalid={Boolean(addBankForm.formState.errors.name)}
                  {...addBankForm.register("name")}
                />
                {addBankForm.formState.errors.name && (
                  <p className="text-xs font-medium text-coral-text">
                    {addBankForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1">
                <Input
                  placeholder="Saldo R$"
                  inputMode="decimal"
                  aria-invalid={Boolean(addBankForm.formState.errors.balance)}
                  className="tabular-nums"
                  {...addBankForm.register("balance")}
                />
                {addBankForm.formState.errors.balance && (
                  <p className="text-xs font-medium text-coral-text">
                    {addBankForm.formState.errors.balance.message}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              className="self-end"
              disabled={addBankForm.formState.isSubmitting}
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
                      <form
                        onSubmit={editBankForm.handleSubmit((values) =>
                          handleSaveBankEdit(bank.id, values)
                        )}
                        noValidate
                        className="flex flex-col gap-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <Input
                              aria-label="Nome do banco"
                              aria-invalid={Boolean(
                                editBankForm.formState.errors.name
                              )}
                              {...editBankForm.register("name")}
                            />
                            {editBankForm.formState.errors.name && (
                              <p className="text-xs font-medium text-coral-text">
                                {editBankForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Input
                              inputMode="decimal"
                              className="tabular-nums"
                              aria-label="Saldo atual do banco"
                              aria-invalid={Boolean(
                                editBankForm.formState.errors.balance
                              )}
                              {...editBankForm.register("balance")}
                            />
                            {editBankForm.formState.errors.balance && (
                              <p className="text-xs font-medium text-coral-text">
                                {editBankForm.formState.errors.balance.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingBankId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={editBankForm.formState.isSubmitting}
                          >
                            <Check size={14} weight="bold" />
                            Salvar
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BankIcon name={bank.name} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-primary">
                              {bank.name}
                            </p>
                            <p className="text-xs text-text-secondary tabular-nums">
                              Saldo salvo: {formatCents(bank.balance_cents)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Editar ${bank.name}`}
                            onClick={() => {
                              setEditingBankId(bank.id);
                              editBankForm.reset({
                                name: bank.name,
                                balance: formatCentsDecimal(bank.balance_cents),
                              });
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
            onSubmit={addPersonForm.handleSubmit(handleAddPerson)}
            noValidate
            className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5 border border-border-subtle"
          >
            <Label htmlFor="new-third-party">Cadastrar pessoa</Label>
            <div className="flex gap-2">
              <Input
                id="new-third-party"
                placeholder="Nome da pessoa..."
                aria-invalid={Boolean(addPersonForm.formState.errors.name)}
                {...addPersonForm.register("name")}
              />
              <Button
                type="submit"
                disabled={addPersonForm.formState.isSubmitting}
              >
                <Plus size={16} weight="bold" />
                Adicionar
              </Button>
            </div>
            {addPersonForm.formState.errors.name && (
              <p className="text-xs font-medium text-coral-text">
                {addPersonForm.formState.errors.name.message}
              </p>
            )}
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
                      <form
                        onSubmit={editPersonForm.handleSubmit((values) =>
                          handleSavePersonEdit(person.id, values)
                        )}
                        noValidate
                        className="flex flex-1 flex-col gap-1"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            aria-label="Nome da pessoa"
                            aria-invalid={Boolean(
                              editPersonForm.formState.errors.name
                            )}
                            className="min-h-9 h-9"
                            {...editPersonForm.register("name")}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={editPersonForm.formState.isSubmitting}
                          >
                            <Check size={14} weight="bold" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPersonId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                        {editPersonForm.formState.errors.name && (
                          <p className="text-xs font-medium text-coral-text">
                            {editPersonForm.formState.errors.name.message}
                          </p>
                        )}
                      </form>
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
                              editPersonForm.reset({ name: person.name });
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
          {/* Account & LGPD Section */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCircle
                  size={22}
                  weight="duotone"
                  className="shrink-0 text-primary"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">
                    {session?.user
                      ? session.user.email
                      : "Modo Convidado (Local)"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {session?.user
                      ? "Conta conectada para sincronização na nuvem."
                      : "Dados salvos apenas neste dispositivo."}
                  </p>
                </div>
              </div>
              <Badge variant={session?.user ? "sage" : "outline"}>
                {session?.user ? "Conectado" : "Convidado"}
              </Badge>
            </div>

            {session?.user ? (
              <div className="flex flex-col gap-3">
                <form
                  onSubmit={passwordForm.handleSubmit(async (values) => {
                    setAccountError(null);
                    setPasswordMessage(null);
                    setIsAccountBusy(true);
                    try {
                      const res = await fetch("/api/account/password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          newPassword: values.newPassword,
                        }),
                      });
                      const data = (await res.json()) as { error?: string };
                      if (!res.ok) {
                        setAccountError(
                          data.error ?? "Não foi possível definir a senha.",
                        );
                        return;
                      }
                      passwordForm.reset();
                      setPasswordMessage(
                        "Senha definida! Agora você também pode entrar com e-mail e senha.",
                      );
                    } catch {
                      setAccountError("Erro ao salvar senha. Tente novamente.");
                    } finally {
                      setIsAccountBusy(false);
                    }
                  })}
                  noValidate
                  className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-canvas p-3"
                >
                  <Label htmlFor="settings-new-password">
                    Definir senha de acesso (para contas Google)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="settings-new-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      aria-invalid={Boolean(
                        passwordForm.formState.errors.newPassword
                      )}
                      {...passwordForm.register("newPassword")}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        isAccountBusy || passwordForm.formState.isSubmitting
                      }
                    >
                      Salvar
                    </Button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs font-medium text-coral-text">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                  {passwordMessage && (
                    <p className="text-xs font-medium text-sage-text">
                      {passwordMessage}
                    </p>
                  )}
                </form>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isAccountBusy}
                    onClick={async () => {
                      await authClient.signOut();
                      onOpenChange(false);
                      router.refresh();
                    }}
                  >
                    <SignOut size={15} weight="bold" />
                    Sair da conta
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link href="/login" onClick={() => onOpenChange(false)}>
                  <Button size="sm" variant="default">
                    Entrar para sincronizar
                  </Button>
                </Link>
                <Link href="/cadastro" onClick={() => onOpenChange(false)}>
                  <Button size="sm" variant="outline">
                    Criar conta grátis
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-surface-lavender p-4 text-sm text-primary">
            <p className="font-semibold">
              Privacidade &amp; Direitos LGPD
            </p>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              Todos os seus lançamentos, caixinhas, terceiros e conciliações
              ficam salvos com segurança no seu navegador. Você pode exportar
              uma cópia em JSON ou excluir seus dados a qualquer momento.{" "}
              <Link
                href="/privacidade"
                onClick={() => onOpenChange(false)}
                className="font-semibold text-primary underline"
              >
                Ver Política de Privacidade
              </Link>
              .
            </p>
          </div>

          {accountError && (
            <p
              role="alert"
              className="rounded-2xl bg-coral-bg/70 px-3.5 py-2.5 text-xs font-medium text-coral-text"
            >
              {accountError}
            </p>
          )}

          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle p-4">
            <Button
              variant="outline"
              disabled={isAccountBusy}
              onClick={handleExportJson}
              className="justify-start"
            >
              <DownloadSimple size={17} weight="bold" />
              Exportar meus dados (JSON - LGPD)
            </Button>

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

            {session?.user && (
              <>
                {!confirmDeleteAccount ? (
                  <Button
                    variant="coral"
                    disabled={isAccountBusy}
                    onClick={() => setConfirmDeleteAccount(true)}
                    className="justify-start"
                  >
                    <Trash size={17} weight="bold" />
                    Excluir minha conta e dados (LGPD)
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 rounded-2xl bg-coral-bg/80 p-3">
                    <p className="text-xs font-semibold text-coral-text">
                      Ação irreversível: isso excluirá permanentemente sua conta
                      e todos os seus dados na nuvem e neste navegador.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isAccountBusy}
                        onClick={() => setConfirmDeleteAccount(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        variant="coral"
                        disabled={isAccountBusy}
                        onClick={handleDeleteAccount}
                      >
                        {isAccountBusy
                          ? "Excluindo..."
                          : "Confirmar exclusão definitiva"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        </div>
      </Tabs>
  );

  if (embedded) {
    return tabsBody;
  }

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
      {tabsBody}
    </Dialog>
  );
}
