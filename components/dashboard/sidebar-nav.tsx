"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Layers3, Settings, SquareStack } from "lucide-react";

import { cn } from "@/lib/utils";

export type SidebarNavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "books" | "flashcards" | "review" | "progress" | "settings";
};

const icons = {
  dashboard: Home,
  books: Layers3,
  flashcards: SquareStack,
  review: BookOpen,
  progress: BarChart3,
  settings: Settings,
};

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const Icon = icons[item.icon];
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
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
