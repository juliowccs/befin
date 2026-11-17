import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caixinhas",
};

export default function CaixinhasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
