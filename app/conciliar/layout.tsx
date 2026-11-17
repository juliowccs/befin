import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conciliar",
};

export default function ConciliarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
