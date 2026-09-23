import type { Metadata } from "next";

export const metadata: Metadata = { title: "Flashcards", description: "Browse and manage your FLENVN flashcards." };

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
