import {
  type EnvelopeColor,
  type EnvelopeRecord,
  type TransactionRecord,
  isActive,
} from "./ledger";

export type AnalyticsPeriod = "1M" | "3M" | "6M" | "12M" | "ALL";

export interface MonthlyAnalyticsPoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Nov/26"
  incomeCents: number;
  expenseCents: number;
  creditCents: number;
  pixDebitCents: number;
  netCents: number;
  cumulativeNetCents: number;
}

export interface EnvelopeSpendingPoint {
  envelopeId: string;
  name: string;
  color: EnvelopeColor | "free";
  fill: string;
  amountCents: number;
  percentage: number;
}

export interface WeekdaySpendingPoint {
  weekdayIndex: number; // 0 (Dom) - 6 (Sáb)
  label: string;
  amountCents: number;
  count: number;
}

export interface AnalyticsSummary {
  totalExpenseCents: number;
  totalIncomeCents: number;
  netBalanceCents: number;
  savingsRatePercent: number;
  creditExpenseCents: number;
  pixDebitExpenseCents: number;
  creditSharePercent: number;
  averageTicketCents: number;
  expenseCount: number;
  monthlySeries: MonthlyAnalyticsPoint[];
  byEnvelope: EnvelopeSpendingPoint[];
  byWeekday: WeekdaySpendingPoint[];
  topExpenses: TransactionRecord[];
}

const ENVELOPE_HEX_MAP: Record<EnvelopeColor | "free", string> = {
  lavender: "#7C6CE0",
  mint: "#3B9B6D",
  peach: "#E07A5F",
  sky: "#3B82B6",
  butter: "#D98A2B",
  blush: "#A95CA3",
  free: "#6B6880",
};

const MONTH_SHORT_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const WEEKDAY_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatMonthLabel(yyyyMm: string): string {
  const [yearStr, monthStr] = yyyyMm.split("-");
  const monthIdx = Number(monthStr) - 1;
  const monthName = MONTH_SHORT_PT[monthIdx] ?? monthStr;
  return `${monthName}/${(yearStr ?? "").slice(-2)}`;
}

export function getPeriodStartIso(
  period: AnalyticsPeriod,
  referenceDate: Date = new Date(),
): string | null {
  if (period === "ALL") return null;

  const monthsBack =
    period === "1M" ? 0 : period === "3M" ? 2 : period === "6M" ? 5 : 11;

  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - monthsBack,
    1,
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function computeAnalytics(
  transactions: TransactionRecord[],
  envelopes: EnvelopeRecord[],
  period: AnalyticsPeriod,
  referenceDate: Date = new Date(),
): AnalyticsSummary {
  const startIso = getPeriodStartIso(period, referenceDate);
  const envelopesById = new Map(
    envelopes.filter(isActive).map((env) => [env.id, env]),
  );

  const activeTx = transactions.filter((tx) => {
    if (!isActive(tx)) return false;
    if (startIso && tx.date < startIso) return false;
    return true;
  });

  // Guardrail: third_party_id != null expenses are receivables, not user spending
  const userExpenses = activeTx.filter(
    (tx) => tx.type === "EXPENSE" && tx.third_party_id == null,
  );
  const userIncomes = activeTx.filter((tx) => tx.type === "INCOME");

  let totalExpenseCents = 0;
  let totalIncomeCents = 0;
  let creditExpenseCents = 0;
  let pixDebitExpenseCents = 0;

  const monthlyMap = new Map<
    string,
    {
      incomeCents: number;
      expenseCents: number;
      creditCents: number;
      pixDebitCents: number;
    }
  >();

  const envelopeSpendMap = new Map<string, number>();
  const weekdayMap = new Map<number, { amountCents: number; count: number }>();
  for (let i = 0; i < 7; i += 1) {
    weekdayMap.set(i, { amountCents: 0, count: 0 });
  }

  for (const tx of userIncomes) {
    const amount = Math.trunc(tx.amount_cents);
    totalIncomeCents += amount;

    const monthKey = tx.date.slice(0, 7);
    const bucket = monthlyMap.get(monthKey) ?? {
      incomeCents: 0,
      expenseCents: 0,
      creditCents: 0,
      pixDebitCents: 0,
    };
    bucket.incomeCents += amount;
    monthlyMap.set(monthKey, bucket);
  }

  for (const tx of userExpenses) {
    const amount = Math.trunc(tx.amount_cents);
    totalExpenseCents += amount;

    if (tx.payment_method === "CREDIT") {
      creditExpenseCents += amount;
    } else {
      pixDebitExpenseCents += amount;
    }

    const monthKey = tx.date.slice(0, 7);
    const bucket = monthlyMap.get(monthKey) ?? {
      incomeCents: 0,
      expenseCents: 0,
      creditCents: 0,
      pixDebitCents: 0,
    };
    bucket.expenseCents += amount;
    if (tx.payment_method === "CREDIT") {
      bucket.creditCents += amount;
    } else {
      bucket.pixDebitCents += amount;
    }
    monthlyMap.set(monthKey, bucket);

    const envKey = tx.from_envelope_id ?? "__FREE__";
    envelopeSpendMap.set(envKey, (envelopeSpendMap.get(envKey) ?? 0) + amount);

    const parsedDate = new Date(`${tx.date}T12:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      const wd = parsedDate.getDay();
      const wdBucket = weekdayMap.get(wd) ?? { amountCents: 0, count: 0 };
      wdBucket.amountCents += amount;
      wdBucket.count += 1;
      weekdayMap.set(wd, wdBucket);
    }
  }

  const netBalanceCents = totalIncomeCents - totalExpenseCents;
  const savingsRatePercent =
    totalIncomeCents > 0
      ? Math.round((netBalanceCents / totalIncomeCents) * 100)
      : 0;
  const creditSharePercent =
    totalExpenseCents > 0
      ? Math.round((creditExpenseCents / totalExpenseCents) * 100)
      : 0;
  const averageTicketCents =
    userExpenses.length > 0
      ? Math.round(totalExpenseCents / userExpenses.length)
      : 0;

  const sortedMonths = Array.from(monthlyMap.keys()).sort();
  let runningNet = 0;
  const monthlySeries: MonthlyAnalyticsPoint[] = sortedMonths.map((month) => {
    const bucket = monthlyMap.get(month)!;
    const netCents = bucket.incomeCents - bucket.expenseCents;
    runningNet += netCents;
    return {
      month,
      label: formatMonthLabel(month),
      incomeCents: bucket.incomeCents,
      expenseCents: bucket.expenseCents,
      creditCents: bucket.creditCents,
      pixDebitCents: bucket.pixDebitCents,
      netCents,
      cumulativeNetCents: runningNet,
    };
  });

  const byEnvelope: EnvelopeSpendingPoint[] = Array.from(
    envelopeSpendMap.entries(),
  )
    .map(([envId, amountCents]) => {
      if (envId === "__FREE__") {
        return {
          envelopeId: "__FREE__",
          name: "Saldo Livre",
          color: "free" as const,
          fill: ENVELOPE_HEX_MAP.free,
          amountCents,
          percentage:
            totalExpenseCents > 0
              ? Math.round((amountCents / totalExpenseCents) * 100)
              : 0,
        };
      }
      const env = envelopesById.get(envId);
      const color = env?.color ?? "lavender";
      return {
        envelopeId: envId,
        name: env?.name ?? "Caixinha removida",
        color,
        fill: ENVELOPE_HEX_MAP[color],
        amountCents,
        percentage:
          totalExpenseCents > 0
            ? Math.round((amountCents / totalExpenseCents) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);

  // Order Seg -> Dom (1..6, 0) for Brazilian weekly reading
  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
  const byWeekday: WeekdaySpendingPoint[] = weekdayOrder.map((idx) => {
    const bucket = weekdayMap.get(idx) ?? { amountCents: 0, count: 0 };
    return {
      weekdayIndex: idx,
      label: WEEKDAY_SHORT_PT[idx] ?? "",
      amountCents: bucket.amountCents,
      count: bucket.count,
    };
  });

  const topExpenses = [...userExpenses]
    .sort((a, b) => b.amount_cents - a.amount_cents)
    .slice(0, 5);

  return {
    totalExpenseCents,
    totalIncomeCents,
    netBalanceCents,
    savingsRatePercent,
    creditExpenseCents,
    pixDebitExpenseCents,
    creditSharePercent,
    averageTicketCents,
    expenseCount: userExpenses.length,
    monthlySeries,
    byEnvelope,
    byWeekday,
    topExpenses,
  };
}
