"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartBar,
  CreditCard,
  Percent,
  Receipt,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useBefinData } from "@/hooks/use-befin-data";
import { type AnalyticsPeriod, computeAnalytics } from "@/lib/analytics";
import { todayIsoDate } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { staggerContainer, staggerItem } from "@/lib/motion";

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "1M", label: "Este mês" },
  { value: "3M", label: "3 meses" },
  { value: "6M", label: "6 meses" },
  { value: "12M", label: "1 ano" },
  { value: "ALL", label: "Tudo" },
];

const monthlyChartConfig = {
  incomeBrl: {
    label: "Receitas",
    color: "#3B9B6D",
  },
  expenseBrl: {
    label: "Gastos",
    color: "#D95D52",
  },
} satisfies ChartConfig;

const paymentChartConfig = {
  pixDebitBrl: {
    label: "Pix / Débito",
    color: "#7C6CE0",
  },
  creditBrl: {
    label: "Crédito",
    color: "#D98A2B",
  },
} satisfies ChartConfig;

const weekdayChartConfig = {
  amountBrl: {
    label: "Gasto",
    color: "#A95CA3",
  },
} satisfies ChartConfig;

const cumulativeChartConfig = {
  cumulativeNetBrl: {
    label: "Saldo acumulado",
    color: "#3B82B6",
  },
} satisfies ChartConfig;

const envelopeChartConfig = {
  amountBrl: {
    label: "Gasto",
    color: "#7C6CE0",
  },
} satisfies ChartConfig;

function centsToBrlNumber(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function formatBrlFromNumber(value: number): string {
  return formatCents(Math.round(value * 100));
}

const emptySubscribe = () => () => {};

export default function RelatoriosPage() {
  const { isLoading, envelopes, transactions } = useBefinData();
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("6M");
  const todayIso = React.useSyncExternalStore(
    emptySubscribe,
    todayIsoDate,
    () => null,
  );
  const referenceDate = React.useMemo(
    () => (todayIso ? new Date(`${todayIso}T12:00:00`) : null),
    [todayIso],
  );

  const analytics = React.useMemo(
    () =>
      referenceDate
        ? computeAnalytics(transactions, envelopes, period, referenceDate)
        : null,
    [transactions, envelopes, period, referenceDate],
  );

  const envelopesById = React.useMemo(
    () => Object.fromEntries(envelopes.map((e) => [e.id, e])),
    [envelopes],
  );

  const monthlyData = React.useMemo(
    () =>
      (analytics?.monthlySeries ?? []).map((m) => ({
        label: m.label,
        incomeBrl: centsToBrlNumber(m.incomeCents),
        expenseBrl: centsToBrlNumber(m.expenseCents),
        pixDebitBrl: centsToBrlNumber(m.pixDebitCents),
        creditBrl: centsToBrlNumber(m.creditCents),
        cumulativeNetBrl: centsToBrlNumber(m.cumulativeNetCents),
      })),
    [analytics],
  );

  const envelopeData = React.useMemo(
    () =>
      (analytics?.byEnvelope ?? []).map((item) => ({
        name: item.name,
        amountBrl: centsToBrlNumber(item.amountCents),
        fill: item.fill,
        percentage: item.percentage,
      })),
    [analytics],
  );

  const weekdayData = React.useMemo(
    () =>
      (analytics?.byWeekday ?? []).map((wd) => ({
        label: wd.label,
        amountBrl: centsToBrlNumber(wd.amountCents),
        count: wd.count,
      })),
    [analytics],
  );

  if (isLoading || !analytics) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-24 animate-pulse rounded-3xl bg-surface-lavender" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-28 animate-pulse rounded-3xl bg-surface" />
          <div className="h-28 animate-pulse rounded-3xl bg-surface" />
          <div className="h-28 animate-pulse rounded-3xl bg-surface" />
          <div className="h-28 animate-pulse rounded-3xl bg-surface" />
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-surface" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Header + Period Pills */}
      <motion.section
        variants={staggerItem}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            Relatórios &amp; KPIs
          </h1>
          <p className="text-sm text-text-secondary">
            Entenda para onde foi seu dinheiro ao longo dos meses (compras de
            terceiros não entram como gasto seu).
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Período do relatório"
          className="flex flex-wrap gap-1.5 rounded-2xl border border-border-subtle bg-surface p-1"
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-secondary hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* 4 Colorful KPI Cards */}
      <motion.section
        variants={staggerItem}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
      >
        <Card className="border-coral-text/15 bg-coral-bg/45">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-coral-text/90">
                Total Gasto
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-coral-bg text-coral-text">
                <ArrowUpRight size={17} weight="bold" />
              </span>
            </div>
            <p className="font-display text-2xl font-bold text-coral-text tabular-nums">
              {formatCents(analytics.totalExpenseCents)}
            </p>
            <p className="text-xs text-coral-text/80 tabular-nums">
              Ticket médio: {formatCents(analytics.averageTicketCents)} (
              {analytics.expenseCount}x)
            </p>
          </CardContent>
        </Card>

        <Card className="border-sage-text/15 bg-sage-bg/45">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sage-text/90">
                Total Recebido
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sage-bg text-sage-text">
                <ArrowDownLeft size={17} weight="bold" />
              </span>
            </div>
            <p className="font-display text-2xl font-bold text-sage-text tabular-nums">
              {formatCents(analytics.totalIncomeCents)}
            </p>
            <p className="text-xs text-sage-text/80 tabular-nums">
              Saldo do período: {formatCents(analytics.netBalanceCents)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent-soft/50 bg-surface-lavender">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                Taxa de Economia
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-primary">
                <Percent size={17} weight="bold" />
              </span>
            </div>
            <p className="font-display text-2xl font-bold text-primary tabular-nums">
              {analytics.savingsRatePercent}%
            </p>
            <p className="text-xs text-text-secondary">
              {analytics.savingsRatePercent >= 20
                ? "Ótimo ritmo de reserva"
                : analytics.savingsRatePercent > 0
                  ? "Positivo no período"
                  : "Atenção aos gastos"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-text/15 bg-amber-bg/45">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-text/90">
                Uso do Crédito
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-bg text-amber-text">
                <CreditCard size={17} weight="duotone" />
              </span>
            </div>
            <p className="font-display text-2xl font-bold text-amber-text tabular-nums">
              {analytics.creditSharePercent}%
            </p>
            <p className="text-xs text-amber-text/80 tabular-nums">
              {formatCents(analytics.creditExpenseCents)} no cartão
            </p>
          </CardContent>
        </Card>
      </motion.section>

      {/* 6 Interactive Charts Grid */}
      <motion.section
        variants={staggerItem}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Chart 1: AreaChart Receitas vs Gastos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2 text-lg">
              <ChartBar size={18} weight="duotone" className="text-primary" />
              1. Evolução Mensal (Receitas vs Gastos)
            </CardTitle>
            <CardDescription>
              Comparativo mês a mês entre entradas e saídas pessoais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ChartContainer
                config={monthlyChartConfig}
                className="h-[260px] w-full aspect-auto"
              >
                <AreaChart data={monthlyData} margin={{ left: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B9B6D" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#3B9B6D" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D95D52" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#D95D52" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={formatBrlFromNumber}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="incomeBrl"
                    name="incomeBrl"
                    stroke="#3B9B6D"
                    strokeWidth={2.5}
                    fill="url(#gradIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenseBrl"
                    name="expenseBrl"
                    stroke="#D95D52"
                    strokeWidth={2.5}
                    fill="url(#gradExpense)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Donut Chart — Onde você mais gastou */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              2. Onde você mais gastou
            </CardTitle>
            <CardDescription>
              Proporção dos gastos por caixinha no período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {envelopeData.length === 0 ? (
              <EmptyChartState />
            ) : (
              <div className="flex flex-col gap-3">
                <ChartContainer
                  config={envelopeChartConfig}
                  className="h-[230px] w-full aspect-auto"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          valueFormatter={formatBrlFromNumber}
                        />
                      }
                    />
                    <Pie
                      data={envelopeData}
                      dataKey="amountBrl"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={3}
                      strokeWidth={2}
                    >
                      {envelopeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-2 justify-center">
                  {envelopeData.map((entry) => (
                    <span
                      key={entry.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-canvas px-2.5 py-1 text-xs"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="font-medium text-primary">
                        {entry.name}
                      </span>
                      <span className="text-text-secondary tabular-nums">
                        {entry.percentage}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: Horizontal BarChart — Ranking de Caixinhas */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              3. Ranking por Caixinha
            </CardTitle>
            <CardDescription>
              Valores absolutos gastos em cada caixinha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {envelopeData.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ChartContainer
                config={envelopeChartConfig}
                className="h-[260px] w-full aspect-auto"
              >
                <BarChart
                  data={envelopeData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={96}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={formatBrlFromNumber}
                      />
                    }
                  />
                  <Bar dataKey="amountBrl" name="amountBrl" radius={8}>
                    {envelopeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Stacked BarChart — Pix/Débito vs Crédito */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              4. Pix/Débito vs Crédito por Mês
            </CardTitle>
            <CardDescription>
              Como você pagou suas despesas ao longo dos meses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ChartContainer
                config={paymentChartConfig}
                className="h-[240px] w-full aspect-auto"
              >
                <BarChart data={monthlyData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={formatBrlFromNumber}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="pixDebitBrl"
                    name="pixDebitBrl"
                    stackId="pay"
                    fill="#7C6CE0"
                    radius={[0, 0, 6, 6]}
                  />
                  <Bar
                    dataKey="creditBrl"
                    name="creditBrl"
                    stackId="pay"
                    fill="#D98A2B"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 5: Weekday Spending BarChart */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              5. Gastos por Dia da Semana
            </CardTitle>
            <CardDescription>
              Descubra em quais dias da semana você gasta mais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.expenseCount === 0 ? (
              <EmptyChartState />
            ) : (
              <ChartContainer
                config={weekdayChartConfig}
                className="h-[240px] w-full aspect-auto"
              >
                <BarChart data={weekdayData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={formatBrlFromNumber}
                      />
                    }
                  />
                  <Bar
                    dataKey="amountBrl"
                    name="amountBrl"
                    fill="#A95CA3"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 6: Cumulative Net Balance LineChart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              6. Saldo Líquido Acumulado
            </CardTitle>
            <CardDescription>
              Curva acumulada (Receitas − Gastos) ao longo do período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ChartContainer
                config={cumulativeChartConfig}
                className="h-[240px] w-full aspect-auto"
              >
                <LineChart data={monthlyData} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={formatBrlFromNumber}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeNetBrl"
                    name="cumulativeNetBrl"
                    stroke="#3B82B6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#3B82B6" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Top 5 Maiores Gastos */}
      <motion.section variants={staggerItem}>
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2 text-lg">
              <Receipt size={18} weight="duotone" className="text-primary" />
              Top 5 Maiores Gastos do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topExpenses.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                Nenhuma despesa pessoal encontrada neste período.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {analytics.topExpenses.map((tx, idx) => {
                  const env = tx.from_envelope_id
                    ? envelopesById[tx.from_envelope_id]
                    : null;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-canvas px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-surface-lavender text-xs font-bold text-primary">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary">
                            {tx.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                            <span>{tx.date}</span>
                            <span>•</span>
                            <Badge variant="outline">
                              {env ? env.name : "Saldo Livre"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <span className="font-display text-sm sm:text-base font-bold text-coral-text tabular-nums shrink-0">
                        {formatCents(tx.amount_cents)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-border-subtle text-sm text-text-secondary">
      Sem lançamentos suficientes neste período.
    </div>
  );
}
