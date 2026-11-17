"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { GearSix } from "@phosphor-icons/react";
import {
  SettingsDialog,
  type SettingsTab,
} from "@/components/settings/settings-dialog";

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab: SettingsTab =
    rawTab === "third_parties" || rawTab === "data" ? rawTab : "banks";

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-lavender text-primary">
          <GearSix size={22} weight="duotone" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
            Configurações
          </h1>
          <p className="text-sm text-text-secondary">
            Gerencie seus bancos, pessoas de compras compartilhadas e dados da
            conta.
          </p>
        </div>
      </header>

      <SettingsDialog
        open
        onOpenChange={() => {}}
        defaultTab={initialTab}
        embedded
      />
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <React.Suspense fallback={null}>
      <ConfiguracoesContent />
    </React.Suspense>
  );
}
