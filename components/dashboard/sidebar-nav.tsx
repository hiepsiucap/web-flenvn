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
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group/nav flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,transform,box-shadow] [transition-duration:var(--motion-quick)] [transition-timing-function:var(--ease-motion-out)] hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:translate-x-0 motion-reduce:transform-none",
              isActive &&
                "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-primary/20 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            )}
          >
            <Icon icon={ItemIcon} className="transition-transform duration-200 group-hover/nav:scale-110 motion-reduce:transform-none" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
