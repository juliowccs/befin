"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  AirplaneTilt,
  Car,
  Coffee,
  Coins,
  FirstAid,
  GraduationCap,
  Heart,
  House,
  PiggyBank,
  ShieldCheck,
  ShoppingBag,
  Sparkle,
} from "@phosphor-icons/react";
import type { EnvelopeColor } from "@/lib/ledger";

export interface EnvelopeColorStyle {
  id: EnvelopeColor;
  label: string;
  bgClass: string;
  swatchHex: string;
  barHex: string;
  textClass: string;
}

export const ENVELOPE_COLORS: Record<EnvelopeColor, EnvelopeColorStyle> = {
  lavender: {
    id: "lavender",
    label: "Lavanda",
    bgClass: "bg-env-lavender",
    swatchHex: "#E6E0F8",
    barHex: "#9D8DF1",
    textClass: "text-primary",
  },
  mint: {
    id: "mint",
    label: "Menta",
    bgClass: "bg-env-mint",
    swatchHex: "#DCFCE7",
    barHex: "#34A867",
    textClass: "text-sage-text",
  },
  peach: {
    id: "peach",
    label: "Pêssego",
    bgClass: "bg-env-peach",
    swatchHex: "#FFEDD5",
    barHex: "#EA8C55",
    textClass: "text-amber-text",
  },
  sky: {
    id: "sky",
    label: "Azul-Pó",
    bgClass: "bg-env-sky",
    swatchHex: "#E0F2FE",
    barHex: "#4FA3D9",
    textClass: "text-sky-900",
  },
  butter: {
    id: "butter",
    label: "Manteiga",
    bgClass: "bg-env-butter",
    swatchHex: "#FEF9C3",
    barHex: "#D4A72C",
    textClass: "text-amber-text",
  },
  blush: {
    id: "blush",
    label: "Blush",
    bgClass: "bg-env-blush",
    swatchHex: "#FCE7F3",
    barHex: "#D96B98",
    textClass: "text-mauve-text",
  },
};

export const ENVELOPE_COLOR_LIST: EnvelopeColorStyle[] =
  Object.values(ENVELOPE_COLORS);

export interface EnvelopeIconOption {
  id: string;
  label: string;
  component: Icon;
}

export const ENVELOPE_ICONS: EnvelopeIconOption[] = [
  { id: "ShieldCheck", label: "Reserva", component: ShieldCheck },
  { id: "House", label: "Casa", component: House },
  { id: "Sparkle", label: "Lazer", component: Sparkle },
  { id: "AirplaneTilt", label: "Viagem", component: AirplaneTilt },
  { id: "ShoppingBag", label: "Compras", component: ShoppingBag },
  { id: "PiggyBank", label: "Cofrinho", component: PiggyBank },
  { id: "Car", label: "Transporte", component: Car },
  { id: "Coffee", label: "Café", component: Coffee },
  { id: "Heart", label: "Saúde", component: Heart },
  { id: "FirstAid", label: "Emergência", component: FirstAid },
  { id: "GraduationCap", label: "Estudos", component: GraduationCap },
  { id: "Coins", label: "Investir", component: Coins },
];

const ICON_MAP: Record<string, Icon> = Object.fromEntries(
  ENVELOPE_ICONS.map((item) => [item.id, item.component])
);

export function getEnvelopeIcon(iconName: string): Icon {
  return ICON_MAP[iconName] ?? PiggyBank;
}

export function getEnvelopeColorStyle(
  color: EnvelopeColor | string
): EnvelopeColorStyle {
  return ENVELOPE_COLORS[color as EnvelopeColor] ?? ENVELOPE_COLORS.lavender;
}
