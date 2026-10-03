"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import { RankProgressDialog } from "@/components/dashboard/rank-progress-dialog";
import { StreakProvider } from "@/components/streak/streak-provider";
import { StreakTopbar } from "@/components/streak/streak-topbar";
import { SuggestVocabularyDialog } from "@/components/vocabulary/suggest-vocabulary-dialog";
import penguinTopbar from "@/img/peguin-topbar.png";
import {
  CLIENT_DATA_CHANGED_EVENT,
  getBooksClient,
  getCachedBooksClient,
  getDashboardShellDataClient,
  type ClientDashboardShellData,
} from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";
import {
  IMMERSIVE_DASHBOARD_PADDING,
  IMMERSIVE_DASHBOARD_ROOT,
  isImmersiveDashboardRoute,
  shouldShowMobileDashboardNavigation,
} from "@/lib/dashboard-layout";
import { HttpError } from "@/lib/http";
import { cn } from "@/lib/utils";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/dashboard";
  const isImmersive = isImmersiveDashboardRoute(pathname);
  const [user, setUser] = useState<ClientDashboardShellData | null>(null);
  const [books, setBooks] = useState<Book[]>(() => getCachedBooksClient() ?? []);
  const [loadError, setLoadError] = useState("");
  const [loadKey, setLoadKey] = useState(0);
  const [suggestOpen, setSuggestOpen] = useState(false);

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
        setLoadError(nextUser.error ?? "");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
          window.location.replace("/login?reason=session-expired");
          return;
        }
        setLoadError("Unable to refresh your learning data. Check your connection and try again.");
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);

    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, [loadKey]);

  return (
    <StreakProvider initialStatus={user?.streakStatus ?? null}>
    <div
      className={cn(
        "bg-background text-foreground",
        isImmersive ? IMMERSIVE_DASHBOARD_ROOT : "min-h-screen",
      )}
    >
      <DashboardSidebar />

      <div className="lg:pl-64">
        <header className={cn("sticky top-0 z-(--z-layout-topbar) bg-background/80 pb-2.5 pt-[env(safe-area-inset-top)] backdrop-blur", !isHome && "hidden lg:block")}>
          <div className="relative bg-card shadow-sm shadow-foreground/5 ring-1 ring-foreground/5">
            <div className="relative flex min-h-14 items-center justify-between gap-2 px-3 py-2 sm:min-h-16 sm:gap-4 sm:px-6 sm:py-2.5 lg:min-h-18">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Image
                  src={penguinTopbar}
                  alt="FLEN penguin"
                  className="hidden size-12 shrink-0 object-contain lg:block"
                  priority
                />
                <Text as="div" className="truncate text-base font-extrabold tracking-normal lg:hidden">
                  Today&apos;s review
                </Text>
                {user ? (
                  <div className="hidden min-w-0 lg:block">
                  <Text className="truncate text-xs text-brand-700" weight="semibold">
                    Welcome back,
                  </Text>
                  <Text
                    as="div"
                    className="truncate text-base font-extrabold tracking-normal sm:text-xl"
                  >
                    {user.name} <span className="text-base sm:text-lg">👋</span>
                  </Text>
                  </div>
                ) : (
                  <div className="hidden min-w-0 gap-2 lg:grid" role="status" aria-label="Loading profile">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-24 sm:w-44" />
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {user ? (
                  <>
                    <RankProgressDialog
                      exp={user.exp}
                      level={user.level}
                      progress={user.progress}
                      rank={user.rank}
                    />

                    <StreakTopbar />
                  </>
                ) : (
                  <>
                    <Skeleton className="hidden h-11 w-80 rounded-2xl xl:block" />
                    <Skeleton className="h-11 w-12 rounded-xl xl:w-40" />
                  </>
                )}

                {user ? (
                  <ProfileMenu user={user} />
                ) : (
                  <Skeleton className="h-9 w-12 rounded-xl" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main
          className={cn(
            !isImmersive && "px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-6",
            !isHome && !isImmersive && "pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:pt-6",
            isImmersive && `overflow-hidden ${IMMERSIVE_DASHBOARD_PADDING}`,
          )}
        >
          {loadError ? (
            <Alert className="mb-4">
              <AlertTitle>Learning data unavailable</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {loadError}
                <Button type="button" size="sm" variant="outline" onClick={() => setLoadKey((key) => key + 1)}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {children}
        </main>
      </div>
      {shouldShowMobileDashboardNavigation(pathname) ? (
        <MobileNav onSuggestVocabulary={() => setSuggestOpen(true)} />
      ) : null}
      <SuggestVocabularyDialog books={books} open={suggestOpen} onOpenChange={setSuggestOpen} />
    </div>
    </StreakProvider>
  );
}
