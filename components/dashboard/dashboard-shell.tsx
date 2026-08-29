import Image from "next/image";
import Link from "next/link";
import {
  Fire as Flame,
  MagnifyingGlass as Search,
  Trophy,
} from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
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
  const [user, books] = await Promise.all([getDashboardShellData(), getBooks()]);

  return (
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

        <div className="mt-auto rounded-3xl bg-sidebar-accent p-4 text-sidebar-accent-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon icon={Trophy} />
            Daily Goal
          </div>
          <Text className="mt-2 leading-5" size="xs" tone="muted">
            Review 20 cards to keep today on track.
          </Text>
        </div>
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

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden w-44 xl:block">
                  <div className="mb-1 flex items-center justify-between text-xs font-extrabold text-brand-800">
                    <span>Progress</span>
                    <span>{user.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{ width: `${user.progress}%` }}
                    />
                  </div>
                </div>

                <Badge variant="secondary" className="h-9 rounded-full px-3.5 text-sm font-extrabold">
                  <Icon icon={Flame} className="text-primary" />
                  {user.streak} day
                </Badge>

                <Button variant="outline" size="icon-lg" className="size-9 rounded-2xl border-brand-200 bg-white">
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
  );
}
