import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function FlipFlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
