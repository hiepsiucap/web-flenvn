import type { Metadata } from "next";

export const metadata: Metadata = { title: "Books", description: "Browse and manage your FLENVN books." };

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
