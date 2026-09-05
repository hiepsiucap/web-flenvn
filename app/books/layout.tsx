import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function BooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
