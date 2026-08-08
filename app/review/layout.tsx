import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
