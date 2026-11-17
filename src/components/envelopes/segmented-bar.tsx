"use client";

import * as React from "react";
import { motion } from "motion/react";
import { getEnvelopeColorStyle } from "@/lib/envelope-styles";
import type { EnvelopeRecord } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { editorialSpring } from "@/lib/motion";

interface SegmentedBarProps {
  envelopes: EnvelopeRecord[];
  envelopeBalances: Record<string, number>;
  freeBalanceCents: number;
  includeFreeBalance?: boolean;
}

export function SegmentedBar({
  envelopes,
  envelopeBalances,
  freeBalanceCents,
  includeFreeBalance = true,
}: SegmentedBarProps) {
  const positiveEnvelopes = envelopes
    .map((env) => ({
      id: env.id,
      name: env.name,
      cents: Math.max(0, envelopeBalances[env.id] ?? 0),
      hex: getEnvelopeColorStyle(env.color).barHex,
    }))
    .filter((item) => item.cents > 0);

  const positiveFree = includeFreeBalance ? Math.max(0, freeBalanceCents) : 0;
  const totalPositive =
    positiveEnvelopes.reduce((sum, item) => sum + item.cents, 0) + positiveFree;

  if (totalPositive === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-full overflow-hidden rounded-full bg-surface-lavender" />
        <p className="text-xs text-text-secondary">
          Registre um recebimento ou distribua seu saldo para visualizar a
          proporção entre as caixinhas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-surface-lavender p-0.5"
        role="img"
        aria-label="Distribuição proporcional das caixinhas"
      >
        {positiveEnvelopes.map((segment) => {
          const pct = (segment.cents / totalPositive) * 100;
          return (
            <motion.div
              key={segment.id}
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${pct}%`, opacity: 1 }}
              transition={editorialSpring}
              title={`${segment.name}: ${formatCents(segment.cents)}`}
              style={{
                backgroundColor: segment.hex,
              }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          );
        })}
        {positiveFree > 0 && (
          <motion.div
            key="free-balance"
            layout
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: `${(positiveFree / totalPositive) * 100}%`,
              opacity: 1,
            }}
            transition={editorialSpring}
            title={`Saldo Livre: ${formatCents(positiveFree)}`}
            style={{
              backgroundColor: "#DCD8F5",
            }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {positiveEnvelopes.map((segment) => {
          const pct = Math.round((segment.cents / totalPositive) * 100);
          return (
            <div key={segment.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: segment.hex }}
              />
              <span className="font-medium text-primary">{segment.name}</span>
              <span className="text-text-secondary tabular-nums">{pct}%</span>
            </div>
          );
        })}
        {positiveFree > 0 && (
          <div className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: "#DCD8F5" }}
            />
            <span className="font-medium text-primary">Saldo Livre</span>
            <span className="text-text-secondary tabular-nums">
              {Math.round((positiveFree / totalPositive) * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
