import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
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
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-sage-bg px-3 py-1 text-xs font-semibold text-sage-text">
            <ShieldCheck size={14} weight="fill" />
            LGPD • Lei nº 13.709/2018
          </div>
          <CardTitle className="text-2xl sm:text-3xl">
            Política de Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm leading-relaxed text-text-secondary">
          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              1. Minimização de Dados (Coleta Mínima)
            </h2>
            <p>
              O <strong>befin</strong> segue estritamente o princípio da
              necessidade da LGPD. Você pode usar o aplicativo inteiramente{" "}
              <strong>como convidado</strong> sem criar conta — nesse modo,
              nenhum dado sai do navegador do seu dispositivo.
            </p>
            <p>
              Ao optar por criar uma conta para sincronização entre
              dispositivos, coletamos apenas: <strong>e-mail</strong> e{" "}
              <strong>nome/apelido</strong> (fornecidos no cadastro ou via
              login com Google). Não solicitamos CPF, RG, telefone, endereço ou
              credenciais bancárias.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              2. Finalidade e Base Legal
            </h2>
            <p>
              Os dados da conta e os registros financeiros cadastrados por você
              (bancos, caixinhas, lançamentos, terceiros e conciliações) são
              tratados exclusivamente para{" "}
              <strong>execução do serviço</strong> (autenticação de sessão e
              sincronização multi-dispositivo). Nunca vendemos, alugamos ou
              compartilhamos seus dados com terceiros para publicidade ou
              análise de crédito.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              3. Cookies Essenciais
            </h2>
            <p>
              Utilizamos apenas cookies estritamente necessários para manter sua
              sessão autenticada com segurança via Better Auth. Não utilizamos
              cookies de rastreamento ou marketing.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-primary">
              4. Seus Direitos como Titular (Art. 18 da LGPD)
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Acesso e Portabilidade:</strong> Nas Configurações do
                app (aba <em>Dados</em>), você pode baixar uma cópia completa em
                JSON de todas as suas informações a qualquer momento.
              </li>
              <li>
                <strong>Eliminação Definitiva:</strong> Você pode excluir sua
                conta e todos os registros armazenados na nuvem e localmente em
                um clique na aba <em>Dados</em>.
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
