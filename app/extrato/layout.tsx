import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extrato",
};

export default function ExtratoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
