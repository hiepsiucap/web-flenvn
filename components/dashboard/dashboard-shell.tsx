import Image from "next/image";
import Link from "next/link";
import { Flame, Search, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import {
  SidebarNav,
  type SidebarNavItem,
} from "@/components/dashboard/sidebar-nav";
import logo from "@/app/logo.png";
import { getDashboardShellData } from "@/lib/dashboard-data";

const navItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Books", href: "/dashboard/books", icon: "books" },
  { label: "Flashcards", href: "/flashcard", icon: "flashcards" },
  { label: "Review", href: "/review", icon: "review" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getDashboardShellData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <Image
            src={logo}
            alt="FLEN logo"
            className="size-12 rounded-2xl bg-white p-1.5 shadow-sm"
            priority
          />
          <div>
            <p className="text-lg font-bold leading-none">FLEN</p>
            <p className="mt-1 text-xs text-muted-foreground">Flashcards</p>
          </div>
        </Link>

        <Separator className="my-5" />

        <SidebarNav items={navItems} />

        <div className="mt-auto rounded-3xl bg-sidebar-accent p-4 text-sidebar-accent-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="size-4" />
            Daily Goal
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Review 20 cards to keep today on track.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src={logo}
                alt="FLEN logo"
                className="size-11 rounded-2xl bg-white p-1.5 shadow-sm lg:hidden"
                priority
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">
                  Welcome back
                </p>
                <h1 className="truncate text-xl font-semibold sm:text-2xl">
                  {user.name}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden min-w-40 sm:block">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{user.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${user.progress}%` }}
                  />
                </div>
              </div>

              <Badge variant="secondary" className="h-8 rounded-2xl px-3">
                <Flame className="size-4 text-primary" />
                {user.streak} day
              </Badge>

              <Button variant="outline" size="icon-lg" className="rounded-2xl">
                <Search className="size-4" />
                <span className="sr-only">Search</span>
              </Button>

              <ProfileMenu user={user} />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
