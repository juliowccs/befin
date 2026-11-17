/**
 * Monetary utilities — all internal calculations operate exclusively on integer cents.
 * Formatting happens strictly at the presentation boundary.
 */

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlDecimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeSignedZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

/**
 * Formats an integer amount in cents as BRL currency (`pt-BR`).
 */
export function formatCents(cents: number): string {
  const safeCents = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  return brlFormatter.format(normalizeSignedZero(safeCents) / 100);
}

/**
 * Formats an integer amount in cents as a localized decimal string without currency symbol (`1.234,56`).
 */
export function formatCentsDecimal(cents: number): string {
  const safeCents = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  return brlDecimalFormatter.format(normalizeSignedZero(safeCents) / 100);
}

/**
 * Parses a PT-BR monetary string (e.g. `"1.234,56"`, `"R$ 2.500,00"`, `"0,99"`, `"100"`)
 * or numeric input into integer cents.
 */
export function parseCentsInput(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return 0;
    return normalizeSignedZero(Math.round(input * 100));
  }

  const trimmed = input.trim();
  if (!trimmed) return 0;

  const isNegative = trimmed.startsWith("-") || trimmed.includes(" -");
  const cleaned = trimmed.replace(/R\$/gi, "").replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;

  let cents = 0;

  if (cleaned.includes(",")) {
    const lastComma = cleaned.lastIndexOf(",");
    const rawInt = cleaned.slice(0, lastComma).replace(/[.,]/g, "");
    const rawDec = cleaned.slice(lastComma + 1).replace(/\D/g, "");
    const intDigits = rawInt ? parseInt(rawInt, 10) : 0;
    const decDigits = parseInt((rawDec + "00").slice(0, 2), 10);
    cents = intDigits * 100 + decDigits;
  } else if (cleaned.includes(".")) {
    const dotParts = cleaned.split(".");
    if (dotParts.length > 2) {
      // Multiple dots act as PT-BR thousand separators: "1.234.567" -> 1234567 reais
      const intDigits = parseInt(dotParts.join(""), 10) || 0;
      cents = intDigits * 100;
    } else {
      const [beforeDot, afterDot] = dotParts;
      const isThousandSeparator =
        beforeDot.length > 0 && beforeDot !== "0" && afterDot.length === 3;
      if (isThousandSeparator) {
        const intDigits = parseInt(`${beforeDot}${afterDot}`, 10) || 0;
        cents = intDigits * 100;
      } else {
        const intDigits = beforeDot ? parseInt(beforeDot, 10) : 0;
        const decDigits = parseInt((afterDot + "00").slice(0, 2), 10);
        cents = intDigits * 100 + decDigits;
      }
    }
  } else {
    const intDigits = parseInt(cleaned, 10) || 0;
    cents = intDigits * 100;
  }

  return normalizeSignedZero(isNegative ? -cents : cents);
}

/**
 * Distributes an integer cent amount across percentage weights using Hamilton's
 * Largest Remainder Method with exact BigInt arithmetic so no cent is ever lost or created.
 */
export function distributeByPercentages(
  totalCents: number,
  percentages: number[]
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("totalCents deve ser um inteiro não-negativo.");
  }
  if (percentages.length === 0) {
    return [];
  }

  for (const pct of percentages) {
    if (!Number.isFinite(pct) || pct < 0) {
      throw new Error("Percentuais devem ser números finitos não-negativos.");
    }
  }

  const SCALE = 10_000;
  const scaledWeights = percentages.map((pct) => Math.round(pct * SCALE));
  const scaledSum = scaledWeights.reduce((acc, w) => acc + w, 0);

  if (scaledSum > 100 * SCALE + 1) {
    throw new Error("A soma dos percentuais não pode exceder 100%.");
  }
  if (scaledSum === 0 || totalCents === 0) {
    return percentages.map(() => 0);
  }

  const isFullDistribution = Math.abs(scaledSum - 100 * SCALE) <= 1;
  const targetTotal = isFullDistribution
    ? totalCents
    : Math.round((totalCents * scaledSum) / (100 * SCALE));

  const denom = BigInt(scaledSum);
  const totalBig = BigInt(targetTotal);

  const items = scaledWeights.map((weight, index) => {
    const numerator = totalBig * BigInt(weight);
    const floorCents = Number(numerator / denom);
    const remainder = numerator % denom;
    return { index, floorCents, remainder };
  });

  const allocated = items.reduce((acc, item) => acc + item.floorCents, 0);
  let leftover = targetTotal - allocated;

  const sortedByRemainder = [...items].sort((a, b) => {
    if (b.remainder > a.remainder) return 1;
    if (b.remainder < a.remainder) return -1;
    return a.index - b.index;
  });

  const result = items.map((item) => item.floorCents);
  let cursor = 0;
  while (leftover > 0 && cursor < sortedByRemainder.length) {
    result[sortedByRemainder[cursor].index] += 1;
    leftover -= 1;
    cursor += 1;
  }

  return result;
}
