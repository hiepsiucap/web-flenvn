import type { Metadata } from "next";

import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your FLEN profile, learning goal, and account security.",
};

export default function Page() {
  return <SettingsPage />;
}
