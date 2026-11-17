import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-primary"
        >
          <ArrowLeft size={14} weight="bold" />
          Voltar ao início
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <BefinMark />
          <BefinWordmark />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">Termos de Uso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm leading-relaxed text-text-secondary">
          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              1. Sobre o Serviço
            </h2>
            <p>
              O <strong>befin</strong> é uma ferramenta pessoal de organização
              financeira por envelopes (*envelope budgeting*) e conciliação
              manual de saldos bancários. O aplicativo não realiza movimentações
              financeiras reais nem possui integração direta com instituições
              bancárias.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              2. Modo Convidado e Conta na Nuvem
            </h2>
            <p>
              No modo convidado, os dados ficam armazenados exclusivamente no
              navegador do dispositivo utilizado (IndexedDB). Ao criar uma
              conta, você habilita o armazenamento na nuvem vinculado ao seu
              usuário para acesso em múltiplos dispositivos.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              3. Responsabilidade e Encerramento
            </h2>
            <p>
              Você mantém total propriedade sobre os dados que registra e pode
              exportá-los ou encerrar sua conta a qualquer momento pelas
              Configurações do aplicativo, conforme descrito na nossa{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-primary underline"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
