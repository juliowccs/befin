"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  LazyMotion,
  domAnimation,
  m,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  CreditCard,
  DeviceMobile,
  ArrowsLeftRight,
  ChartBar,
  Gear,
  House,
  PiggyBank,
  Plus,
  Receipt,
  Scales,
  ShieldCheck,
  Sparkle,
  Users,
} from "@phosphor-icons/react";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import { IPhone17ProMax } from "@/components/ui/apple-iphone-17-pro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/src/lib/auth-client";
import { staggerContainer, staggerItem } from "@/lib/motion";

const FEATURES = [
  {
    icon: PiggyBank,
    tone: "bg-surface-lavender text-primary",
    title: "Caixinhas que não resetam",
    description:
      "Receitas entram no Saldo Livre e são distribuídas em R$ ou % para suas metas sem perder um centavo sequer.",
  },
  {
    icon: CreditCard,
    tone: "bg-amber-bg text-amber-text",
    title: "Crédito sem ilusão de saldo",
    description:
      "Compras no crédito abatem a caixinha na hora, enquanto o dinheiro físico continua rendendo no banco até a fatura.",
  },
  {
    icon: Users,
    tone: "bg-mauve-bg text-mauve-text",
    title: "Compras de terceiros isoladas",
    description:
      "Emprestou o cartão para alguém? O valor não desconta suas caixinhas e fica separado em A Receber por pessoa.",
  },
  {
    icon: Scales,
    tone: "bg-sage-bg text-sage-text",
    title: "Equação da Verdade",
    description:
      "Concilie 2 ou 3 bancos de uma só vez. Sobrou rendimento? Envie para a Reserva de Emergência em um clique.",
  },
  {
    icon: DeviceMobile,
    tone: "bg-surface-lavender text-primary",
    title: "Local-First de verdade",
    description:
      "Use como convidado direto no navegador ou entre com sua conta para sincronizar entre celular, tablet e PC.",
  },
  {
    icon: ShieldCheck,
    tone: "bg-sage-bg text-sage-text",
    title: "Privacidade por padrão (LGPD)",
    description:
      "Coletamos apenas o mínimo necessário para sua conta. Exporte seus dados ou exclua tudo quando quiser.",
  },
] as const;

export default function LandingPage() {
  const { data: session } = useSession();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const leftCardY = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const rightCardY = useTransform(scrollYProgress, [0, 1], [0, -52]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 24]);

  const mouseX = useMotionValue(-999);
  const mouseY = useMotionValue(-999);
  const cursorMask = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`;

  return (
    <div
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
      className="relative min-h-dvh flex flex-col bg-canvas text-primary"
    >
      {/* Base dot-grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(109, 93, 122, 0.22) 1.25px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Cursor-reactive highlighted dot-grid */}
      <LazyMotion features={domAnimation}>
      <m.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(139, 92, 246, 0.55) 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: cursorMask,
          WebkitMaskImage: cursorMask,
        }}
      />
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border-subtle/80 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <BefinMark />
            <BefinWordmark />
          </Link>

          <nav
            aria-label="Ações da conta"
            className="flex items-center gap-2 sm:gap-3"
          >
            {session?.user ? (
              <Link href="/inicio">
                <Button size="sm">
                  Abrir meu painel
                  <ArrowRight size={15} weight="bold" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm">Criar conta</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Hero & Features */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-12 sm:gap-16"
        >
          {/* Hero */}
          <m.section
            ref={heroRef}
            variants={staggerItem}
            className="relative flex flex-col items-center overflow-hidden rounded-4xl border border-accent-soft/50 bg-surface-lavender/95 px-5 pt-8 pb-0 text-center shadow-sm sm:px-10 sm:pt-14"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(167, 139, 250, 0.16), transparent 70%)",
            }}
          >
            <div className="flex max-w-2xl flex-col items-center gap-4">
              <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-5xl sm:leading-[1.08]">
                Suas Caixinhas, finalmente em paz.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
                Divida o saldo entre bancos em envelopes acumulativos, isole
                compras de terceiros no cartão e concilie tudo em segundos.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {session?.user ? (
                <Link href="/inicio">
                  <Button size="lg">
                    Ir para minhas caixinhas
                    <ArrowRight size={18} weight="bold" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/cadastro">
                    <Button size="lg">
                      <Sparkle size={18} weight="duotone" />
                      Criar conta grátis
                    </Button>
                  </Link>
                  <Link href="/inicio">
                    <Button variant="outline" size="lg">
                      Usar como convidado
                      <ArrowRight size={16} weight="bold" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <p className="mt-3 text-xs text-text-secondary">
              Modo convidado direto no navegador. Crie uma conta quando quiser
              sincronizar na nuvem.
            </p>

            {/* Phone Mockup + Floating Envelope Cards */}
            <div className="relative mt-8 flex w-full max-w-4xl items-end justify-center pt-2 sm:mt-10">
              {/* Left Floating Card */}
              <m.div
                style={{ y: leftCardY }}
                className="pointer-events-none absolute bottom-16 left-2 z-20 hidden w-60 -rotate-3 rounded-3xl border border-border-subtle bg-surface/95 p-4 text-left shadow-lg backdrop-blur-sm lg:block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-secondary">
                    Saldo Livre → Caixinhas
                  </span>
                  <span className="rounded-full bg-sage-bg px-2 py-0.5 text-[10px] font-semibold text-sage-text">
                    Distribuído
                  </span>
                </div>
                <p className="mt-1.5 font-display text-xl font-bold text-primary tabular-nums">
                  + R$ 3.500,00
                </p>
                <div className="mt-2.5 flex gap-1.5">
                  <span className="h-1.5 flex-1 rounded-full bg-accent" />
                  <span className="h-1.5 w-12 rounded-full bg-sage-text/70" />
                  <span className="h-1.5 w-8 rounded-full bg-amber-text/70" />
                </div>
              </m.div>

              {/* Right Floating Card */}
              <m.div
                style={{ y: rightCardY }}
                className="pointer-events-none absolute right-2 bottom-24 z-20 hidden w-60 rotate-3 rounded-3xl border border-border-subtle bg-surface/95 p-4 text-left shadow-lg backdrop-blur-sm lg:block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-secondary">
                    Equação da Verdade
                  </span>
                  <span className="rounded-full bg-amber-bg px-2 py-0.5 text-[10px] font-semibold text-amber-text">
                    3 bancos
                  </span>
                </div>
                <p className="mt-1.5 font-display text-lg font-bold text-primary tabular-nums">
                  Diferença: R$ 0,00
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">
                  Rendimento de R$ 42,18 pronto para a Reserva.
                </p>
              </m.div>

              {/* Cropped iPhone 17 Pro Max Mockup */}
              <m.div style={{ y: phoneY }} className="-mb-24 sm:-mb-28">
                <IPhone17ProMax
                  frameColor="graphite"
                  dynamicIslandSize="default"
                  time="9:41"
                  batteryLevel={94}
                  signalStrength={3}
                  className="p-0"
                  dynamicIslandContent={
                    <div className="flex h-full w-full items-center justify-between gap-2.5 px-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-bg text-sage-text">
                          <PiggyBank size={15} weight="duotone" />
                        </span>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-[10px] text-white/80">
                            Rendimento Nubank
                          </p>
                          <p className="truncate text-xs font-semibold text-white">
                            + R$ 42,18
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-sage-bg px-2.5 py-1 text-[10px] font-semibold text-sage-text">
                        Reserva
                      </span>
                    </div>
                  }
                >
                  <div className="flex flex-1 flex-col justify-between bg-canvas text-left">
                    {/* App Top Header (faithful to AppShell) */}
                    <div className="flex items-center justify-between px-4 pt-2 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <BefinMark />
                        <span className="font-display text-xs font-bold text-primary">
                          befin
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary">
                          <ChartBar size={12} weight="bold" />
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary">
                          <Gear size={12} weight="bold" />
                        </span>
                      </div>
                    </div>

                    {/* Screen Body */}
                    <div className="flex-1 overflow-hidden px-3.5 py-1">
                      <div className="flex flex-col gap-2">
                        <div>
                          <p className="font-display text-sm font-bold text-primary leading-tight">
                            Caixinhas Virtuais
                          </p>
                          <p className="text-[9px] text-text-secondary">
                            Saldos acumulativos que não resetam na virada do mês.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-lavender px-2 py-0.5 text-[9px] font-semibold text-primary">
                            <Sparkle size={9} weight="duotone" />
                            Distribuir (R$ 840,00)
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[9px] font-semibold text-primary">
                            <ArrowsLeftRight size={9} weight="bold" />
                            Transferir
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-canvas">
                            + Nova caixinha
                          </span>
                        </div>

                        {/* Total guardado card */}
                        <div className="rounded-2xl border border-border-subtle bg-surface p-2.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-text-secondary">
                              Total guardado nas caixinhas
                            </span>
                            <span className="rounded-full bg-surface-lavender px-1.5 py-0.5 text-[8px] font-semibold text-primary">
                              Saldo Livre: R$ 840,00
                            </span>
                          </div>
                          <p className="mt-0.5 font-display text-base font-bold text-primary tabular-nums">
                            R$ 3.835,00
                          </p>
                          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full gap-0.5">
                            <span className="w-[43%] rounded-l-full bg-emerald-500" />
                            <span className="w-[29%] bg-violet-400" />
                            <span className="w-[10%] bg-orange-400" />
                            <span className="w-[18%] rounded-r-full bg-surface-lavender" />
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] text-text-secondary">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Reserva 43%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                              Essenciais 29%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                              Lazer 10%
                            </span>
                          </div>
                        </div>

                        {/* Reserva de Emergência card */}
                        <div className="rounded-2xl border border-border-subtle bg-surface p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sage-bg text-sage-text">
                              <ShieldCheck size={14} weight="duotone" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-bold text-primary">
                                Reserva de Emergência
                              </p>
                              <span className="inline-block rounded-full bg-sage-bg px-1.5 py-0.2 text-[8px] font-semibold text-sage-text">
                                Reserva de Emergência
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between rounded-xl bg-canvas px-2.5 py-1.5">
                            <span className="text-[9px] text-text-secondary">
                              Saldo disponível
                            </span>
                            <span className="font-display text-xs font-bold text-primary tabular-nums">
                              R$ 2.000,00
                            </span>
                          </div>
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                            <span className="rounded-xl bg-surface-lavender py-1 text-center text-[9px] font-semibold text-primary">
                              ↗ Gastar
                            </span>
                            <span className="rounded-xl border border-border-subtle bg-surface py-1 text-center text-[9px] font-semibold text-primary">
                              ⇄ Transferir
                            </span>
                          </div>
                        </div>

                        {/* Essenciais & Casa card */}
                        <div className="rounded-2xl border border-border-subtle bg-surface p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-surface-lavender text-primary">
                              <House size={14} weight="duotone" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-bold text-primary">
                                Essenciais & Casa
                              </p>
                              <span className="text-[8px] text-text-secondary">
                                2 movimentações
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between rounded-xl bg-canvas px-2.5 py-1.5">
                            <span className="text-[9px] text-text-secondary">
                              Saldo disponível
                            </span>
                            <span className="font-display text-xs font-bold text-primary tabular-nums">
                              R$ 1.370,00
                            </span>
                          </div>
                        </div>

                        {/* Lazer & Cuidados card */}
                        <div className="rounded-2xl border border-border-subtle bg-surface p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary">
                              Lazer & Cuidados
                            </span>
                            <span className="font-display text-xs font-bold text-primary tabular-nums">
                              R$ 465,00
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* App Bottom Navigation Bar (faithful to AppShell) */}
                    <div className="relative mx-2 mb-5 flex items-center justify-around rounded-2xl border border-border-subtle bg-surface px-2 py-1.5 shadow-xs">
                      <span className="flex flex-col items-center gap-0.5 text-[8px] text-text-secondary">
                        <House size={13} weight="regular" />
                        Início
                      </span>
                      <span className="flex flex-col items-center gap-0.5 rounded-xl bg-surface-lavender px-2 py-0.5 text-[8px] font-semibold text-primary">
                        <PiggyBank size={13} weight="fill" />
                        Caixinhas
                      </span>
                      <span className="-mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-canvas shadow-md">
                        <Plus size={14} weight="bold" />
                      </span>
                      <span className="flex flex-col items-center gap-0.5 text-[8px] text-text-secondary">
                        <Receipt size={13} weight="regular" />
                        Extrato
                      </span>
                      <span className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-0.5 text-[8px] text-text-secondary">
                        <Scales size={13} weight="regular" />
                        Conciliar
                      </span>
                    </div>
                  </div>
                </IPhone17ProMax>
              </m.div>
            </div>
          </m.section>

          {/* Features Grid */}
          <m.section
            variants={staggerItem}
            aria-labelledby="features-heading"
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="features-heading"
                className="font-display text-2xl font-bold text-primary sm:text-3xl"
              >
                Pensado para a vida real em 2 ou 3 bancos
              </h2>
              <p className="text-sm text-text-secondary sm:text-base">
                Sem planilhas quebradas, sem ajuste automático que esconde erro
                e sem pedir dados que não precisamos.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feat, index) => {
                const IconComp = feat.icon;
                return (
                  <m.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                  >
                    <Card className="h-full border-border-subtle bg-surface/90 backdrop-blur-xs transition-transform duration-200 hover:-translate-y-0.5">
                      <CardContent className="flex flex-col gap-3 p-5">
                        <span
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${feat.tone}`}
                        >
                          <IconComp size={22} weight="duotone" />
                        </span>
                        <h3 className="font-display text-base font-bold text-primary">
                          {feat.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-text-secondary">
                          {feat.description}
                        </p>
                      </CardContent>
                    </Card>
                  </m.div>
                );
              })}
            </div>
          </m.section>
        </m.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-subtle bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <BefinWordmark />
            <span>• Envelope budgeting local-first</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacidade" className="hover:text-primary underline">
              Política de Privacidade (LGPD)
            </Link>
            <Link href="/termos" className="hover:text-primary underline">
              Termos de Uso
            </Link>
            <Link href="/login" className="hover:text-primary">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-primary">
              Criar conta
            </Link>
          </div>
        </div>
      </footer>
      </LazyMotion>
    </div>
  );
}
