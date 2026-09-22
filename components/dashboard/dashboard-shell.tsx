"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MagnifyingGlass as Search } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { RankProgressDialog } from "@/components/dashboard/rank-progress-dialog";
import { StreakProvider } from "@/components/streak/streak-provider";
import { StreakTopbar } from "@/components/streak/streak-topbar";
import { SuggestVocabularyDialog } from "@/components/vocabulary/suggest-vocabulary-dialog";
import penguinTopbar from "@/img/peguin-topbar.png";
import {
  CLIENT_DATA_CHANGED_EVENT,
  getBooksClient,
  getDashboardShellDataClient,
  type ClientDashboardShellData,
} from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";

const initialUser: ClientDashboardShellData = {
  name: "FLEN learner",
  email: "",
  avatar: null,
  initials: "FL",
  progress: 0,
  exp: 0,
  level: 1,
  rank: null,
  streak: 0,
  streakStatus: null,
  error: null,
};

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<ClientDashboardShellData>(initialUser);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    if (!window.localStorage.getItem("accessToken")) {
      window.location.replace("/?auth=login");
      return;
    }

    let active = true;
    const load = () => {
      void Promise.all([getDashboardShellDataClient(), getBooksClient()])
        .then(([nextUser, nextBooks]) => {
        if (!active) return;
        setUser(nextUser);
        setBooks(nextBooks);
      })
      .catch(() => {
        if (active) window.location.replace("/?auth=login");
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);

    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, []);

  return (
    <StreakProvider initialStatus={user.streakStatus}>
    <div className="min-h-screen bg-background text-foreground">
      <DashboardSidebar />

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
