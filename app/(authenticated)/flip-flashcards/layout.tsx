import type { Metadata } from "next";

export const metadata: Metadata = { title: "Flip Cards", description: "Review your vocabulary with interactive flip cards." };

export default function FlipCardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
