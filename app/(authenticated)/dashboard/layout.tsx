import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard", description: "View your FLENVN learning dashboard." };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
