import type { Metadata } from "next";

import { ShadowingPlayer } from "@/components/shadowing/shadowing-player";

export const metadata: Metadata = {
  title: "YouTube Shadowing",
  description: "Practice English by listening to and repeating short YouTube transcript segments.",
  alternates: { canonical: "/shadowing" },
};

export default function ShadowingPage() {
  return <ShadowingPlayer />;
}
