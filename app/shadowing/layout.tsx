import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ShadowingLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
