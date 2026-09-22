"use client";

import Image from "next/image";
import Link from "next/link";

import { DailyGoalCarousel } from "@/components/dashboard/daily-goal-carousel";
import {
  SidebarNav,
  type SidebarNavItem,
} from "@/components/dashboard/sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import logo from "@/img/new-logo.png";

const navItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Books", href: "/books", icon: "books" },
  { label: "Flip cards", href: "/flip-flashcards", icon: "flip" },
  { label: "Review", href: "/review", icon: "review" },
  { label: "Shadowing", href: "/shadowing", icon: "shadowing" },
  { label: "Support", href: "/support", icon: "support" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function DashboardSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <Image src={logo} alt="FLEN logo" className="size-14" priority />
        <div>
          <Text size="lg" weight="bold" leading="none">
            FLEN
          </Text>
          <Text className="mt-1" size="xs" tone="muted">
            Flashcards
          </Text>
        </div>
      </Link>

      <Separator className="my-5" />
      <SidebarNav items={navItems} />
      <DailyGoalCarousel />
    </aside>
  );
}
