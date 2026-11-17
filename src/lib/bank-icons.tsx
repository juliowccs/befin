import * as React from "react";
import { Bank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface BankVisual {
  bg: string;
  fg: string;
  renderMark: () => React.ReactNode;
}

const BANK_DICTIONARY: Array<{ keywords: string[]; visual: BankVisual }> = [
  {
    keywords: ["nubank", "nu bank", "nu pagamentos"],
    visual: {
      bg: "#820AD1",
      fg: "#FFFFFF",
      renderMark: () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M6.5 16.5V9.5C6.5 7.8 7.8 6.5 9.5 6.5C11.2 6.5 12 7.8 12 9.5V16.5M12 16.5V9.5C12 7.8 13.3 6.5 15 6.5C16.7 6.5 17.5 7.8 17.5 9.5V16.5"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  },
  {
    keywords: ["picpay", "pic pay"],
    visual: {
      bg: "#21C25E",
      fg: "#FFFFFF",
      renderMark: () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <rect
            x="6.5"
            y="6.5"
            width="11"
            height="11"
            rx="3"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      ),
    },
  },
  {
    keywords: ["c6", "c6 bank"],
    visual: {
      bg: "#1A1A1A",
      fg: "#FFFFFF",
      renderMark: () => (
        <span className="font-display text-[10px] font-extrabold leading-none tracking-tighter">
          C6
        </span>
      ),
    },
  },
  {
    keywords: ["inter", "banco inter"],
    visual: {
      bg: "#FF7A00",
      fg: "#FFFFFF",
      renderMark: () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M12 6.5V17.5M8.5 10.5L12 7L15.5 10.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  },
  {
    keywords: ["itau", "itaú"],
    visual: {
      bg: "#EC7000",
      fg: "#FFE000",
      renderMark: () => (
        <span className="font-display text-[10px] font-extrabold leading-none tracking-tight">
          Itaú
        </span>
      ),
    },
  },
  {
    keywords: ["bradesco"],
    visual: {
      bg: "#CC092F",
      fg: "#FFFFFF",
      renderMark: () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M7 15.5C9 10.5 15 10.5 17 15.5M9.5 12C10.5 8.5 13.5 8.5 14.5 12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  },
  {
    keywords: ["santander"],
    visual: {
      bg: "#EC0000",
      fg: "#FFFFFF",
      renderMark: () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M12 5.5C12 8.5 15.5 9.5 15.5 13C15.5 15.5 13.8 17.5 12 17.5C10.2 17.5 8.5 15.5 8.5 13C8.5 9.5 12 8.5 12 5.5Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
  },
  {
    keywords: ["banco do brasil", "bb"],
    visual: {
      bg: "#F8D117",
      fg: "#0038A8",
      renderMark: () => (
        <span className="font-display text-[10px] font-extrabold leading-none tracking-tighter">
          BB
        </span>
      ),
    },
  },
  {
    keywords: ["caixa", "cef"],
    visual: {
      bg: "#005CA9",
      fg: "#F39200",
      renderMark: () => (
        <span className="font-display text-[11px] font-extrabold leading-none">
          X
        </span>
      ),
    },
  },
  {
    keywords: ["mercado pago", "mercadopago"],
    visual: {
      bg: "#009EE3",
      fg: "#FFFFFF",
      renderMark: () => (
        <span className="font-display text-[10px] font-extrabold leading-none tracking-tighter">
          MP
        </span>
      ),
    },
  },
  {
    keywords: ["btg", "btg pactual"],
    visual: {
      bg: "#001E62",
      fg: "#FFFFFF",
      renderMark: () => (
        <span className="font-display text-[9px] font-extrabold leading-none tracking-tighter">
          BTG
        </span>
      ),
    },
  },
  {
    keywords: ["xp", "xp investimentos"],
    visual: {
      bg: "#111111",
      fg: "#FFD100",
      renderMark: () => (
        <span className="font-display text-[10px] font-extrabold leading-none tracking-tighter">
          XP
        </span>
      ),
    },
  },
  {
    keywords: ["pagbank", "pagseguro"],
    visual: {
      bg: "#00A859",
      fg: "#FFFFFF",
      renderMark: () => (
        <span className="font-display text-[10px] font-extrabold leading-none tracking-tighter">
          PB
        </span>
      ),
    },
  },
  {
    keywords: ["neon"],
    visual: {
      bg: "#00D7FF",
      fg: "#003B5C",
      renderMark: () => (
        <span className="font-display text-[11px] font-extrabold leading-none">
          N
        </span>
      ),
    },
  },
];

function normalizeBankName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function BankIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const normalized = normalizeBankName(name);
  const match = BANK_DICTIONARY.find((entry) =>
    entry.keywords.some((kw) => normalized.includes(kw))
  );

  if (!match) {
    return (
      <span
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-lavender text-primary",
          className
        )}
      >
        <Bank size={14} weight="duotone" />
      </span>
    );
  }

  return (
    <span
      style={{ backgroundColor: match.visual.bg, color: match.visual.fg }}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg shadow-2xs",
        className
      )}
    >
      {match.visual.renderMark()}
    </span>
  );
}
