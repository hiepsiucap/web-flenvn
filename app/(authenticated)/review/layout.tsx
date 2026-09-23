import type { Metadata } from "next";

export const metadata: Metadata = { title: "Review", description: "Review your due flashcards and strengthen your memory." };

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
