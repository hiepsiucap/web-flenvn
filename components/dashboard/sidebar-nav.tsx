"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Cards,
  ChartBar as BarChart3,
  GearSix as Settings,
  House as Home,
  Lifebuoy,
  Stack as Layers3,
  SquaresFour as SquareStack,
  Waveform,
} from "@phosphor-icons/react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type SidebarNavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "books" | "flashcards" | "flip" | "review" | "shadowing" | "progress" | "support" | "settings";
};

const icons = {
  dashboard: Home,
  books: Layers3,
  flashcards: SquareStack,
  flip: Cards,
  review: BookOpen,
  shadowing: Waveform,
  progress: BarChart3,
  support: Lifebuoy,
  settings: Settings,
};

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const ItemIcon = icons[item.icon];
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            )}
          >
            <Icon icon={ItemIcon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
