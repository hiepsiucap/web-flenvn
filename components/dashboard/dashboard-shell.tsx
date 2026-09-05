import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass as Search } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { DailyGoalCarousel } from "@/components/dashboard/daily-goal-carousel";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { RankProgressDialog } from "@/components/dashboard/rank-progress-dialog";
import { StreakProvider } from "@/components/streak/streak-provider";
import { StreakTopbar } from "@/components/streak/streak-topbar";
import { SuggestVocabularyDialog } from "@/components/vocabulary/suggest-vocabulary-dialog";
import {
  SidebarNav,
  type SidebarNavItem,
} from "@/components/dashboard/sidebar-nav";
import logo from "@/img/new-logo.png";
import penguinTopbar from "@/img/peguin-topbar.png";
import { getBooks, getDashboardShellData } from "@/lib/dashboard-data";

const navItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Books", href: "/books", icon: "books" },
  { label: "Flashcards", href: "/flashcards", icon: "flashcards" },
  { label: "Flip cards", href: "/flip-flashcards", icon: "flip" },
  { label: "Review", href: "/review", icon: "review" },
  { label: "Support", href: "/support", icon: "support" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, books] = await Promise.all([getDashboardShellData(), getBooks()]);

  return (
    <StreakProvider initialStatus={user.streakStatus}>
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <Image
            src={logo}
            alt="FLEN logo"
            className="size-14"
            priority
          />
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

      <div className="lg:pl-64">
        <header className="sticky top-0 z-(--z-layout-topbar) bg-background/80 pb-2.5 backdrop-blur">
          <div className="relative border border-brand-200/80 bg-white">
            <div className="relative flex min-h-16 items-center justify-between gap-4 px-5 py-2.5 sm:px-6 lg:min-h-18">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={penguinTopbar}
                  alt="FLEN penguin"
                  className="size-12 shrink-0 object-contain"
                  priority
                />
                <div className="min-w-0">
                  <Text className="truncate text-xs text-brand-700" weight="semibold">
                    Welcome back,
                  </Text>
                  <Text
                    as="div"
                    className="truncate text-lg font-extrabold tracking-normal sm:text-xl"
                  >
                    {user.name} <span className="text-base sm:text-lg">👋</span>
                  </Text>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <RankProgressDialog
                  exp={user.exp}
                  level={user.level}
                  progress={user.progress}
                  rank={user.rank}
                />

                <StreakTopbar />

                <Button variant="outline" size="icon-sm" className="size-9 rounded-xl border-brand-200 bg-white">
                  <Icon icon={Search} className="size-4" />
                  <span className="sr-only">Search</span>
                </Button>

                <ProfileMenu user={user} />
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <SuggestVocabularyDialog books={books} />
    </div>
    </StreakProvider>
  );
}
