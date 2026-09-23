"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Cards,
  Clock,
  GameController,
  Sparkle,
  Stack as Layers3,
  Star,
  Target,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { StreakCard } from "@/components/streak/streak-card";
import {
  CLIENT_DATA_CHANGED_EVENT,
  getDashboardPageDataClient,
  type ClientDashboardPageData,
} from "@/lib/client-api";
import { cn } from "@/lib/utils";
import emptyFolderImage from "@/img/empty-folder.png";
import penguinTopbar from "@/img/peguin-topbar.png";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<ClientDashboardPageData | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      void getDashboardPageDataClient()
        .then((data) => {
        if (active) setDashboard(data);
      })
      .catch(() => {
        if (active) setLoadError("Unable to load dashboard data.");
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, []);

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Dashboard data unavailable</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboard) {
    return <LoadingState title="Loading dashboard" description="Loading your latest learning progress." />;
  }
  const remainingPercent = Math.max(0, 100 - dashboard.masteredPercent);
  const remainingCards = Math.max(0, dashboard.totalCards - dashboard.masteredCards);
  const hasDashboardData = dashboard.activeDecks > 0 || dashboard.totalCards > 0;

  return (
    <div className="grid gap-10 motion-reduce-safe">
      {dashboard.error ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard data unavailable</AlertTitle>
          <AlertDescription>{dashboard.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="relative px-2 pt-2 motion-enter">
        <div className="relative z-(--z-dashboard-content) flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Text
                as="div"
                className="text-xl font-extrabold tracking-normal text-foreground sm:text-2xl"
              >
                Today&apos;s review
              </Text>
              <Icon icon={Sparkle} className="size-5 text-secondary" weight="fill" />
            </div>
            <Text className="mt-2 max-w-2xl text-xs text-brand-700" weight="semibold">
              Keep your spaced repetition queue warm and finish the cards due
              today.
            </Text>
          </div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-brand-800">
            <Icon icon={Target} className="size-5 text-primary" weight="duotone" />
            {remainingPercent}% left to master
          </div>
        </div>
      </section>

      {hasDashboardData ? (
        <>
        <section className="grid gap-5 motion-enter motion-delay-1 xl:grid-cols-2">
          <div className="grid content-start gap-5">
          <Card interactive className="relative min-h-[360px] justify-between rounded-3xl border border-brand-200/80 bg-white shadow-xl shadow-brand-800/8 ring-brand-200/80 [--card-spacing:--spacing(5)]">
            <CardHeader className="relative z-(--z-dashboard-content) gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <ColoredBookBadge />
                <CardDescription className="text-sm font-bold text-brand-700">
                  Next deck
                </CardDescription>
                <CardTitle className="mt-2 max-w-xl text-xl font-extrabold tracking-normal sm:text-2xl">
                  {dashboard.nextDeck?.title ?? "Build your first review deck"}
                </CardTitle>
              </div>
              <div className="grid min-w-44 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
                <Icon icon={Layers3} className="size-6 text-primary" weight="duotone" />
                <span className="text-sm font-extrabold">Total cards</span>
                <span className="text-2xl font-extrabold">
                  {dashboard.nextDeck?.totalCards ?? dashboard.totalCards}
                </span>
              </div>
            </CardHeader>

            <DeckIllustration />

            <CardContent className="relative z-(--z-dashboard-content)">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-extrabold">Mastery progress</span>
                  <span className="font-bold text-brand-700">
                    {dashboard.masteredPercent}% mastered
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--secondary)_0%,var(--brand-400)_45%,var(--primary)_100%)] motion-progress-enter"
                    style={{ width: `${dashboard.masteredPercent}%` }}
                  />
                </div>
                <Text className="text-sm text-brand-700" weight="semibold">
                  {dashboard.nextDeck
                    ? `${dashboard.nextDeck.title} has ${dashboard.nextDeck.totalCards} cards ready for your next session.`
                    : "Create or import a deck to start reviewing."}
                </Text>
              </div>
            </CardContent>
          </Card>
          <StreakCard />
          </div>

          <div className="relative grid gap-5 sm:grid-cols-2">
            <ReviewMascot />
            <DashboardStatCard
              label="Cards due"
              value={String(dashboard.cardsDue)}
              icon={BookOpen}
              variant="primary"
              className="relative z-(--z-dashboard-content) sm:col-span-2 xl:col-span-1"
            />
            <DashboardStatCard
              label="Active decks"
              value={String(dashboard.activeDecks)}
              icon={Layers3}
              variant="cool"
            />
            <DashboardStatCard
              label="All cards"
              value={String(dashboard.totalCards)}
              caption={`${dashboard.masteredPercent}% mastered across your full library.`}
              icon={Cards}
              variant="soft"
            />
            <DashboardStatCard
              label="Accuracy"
              value={`${dashboard.accuracy}%`}
              icon={Clock}
              variant="warm"
            />
          </div>
        </section>

        <section className="grid gap-5 motion-enter motion-delay-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)]">
          <Card interactive className="rounded-3xl border border-brand-200/80 bg-white [--card-spacing:--spacing(5)]">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold tracking-normal">
                Jump back in
              </CardTitle>
              <CardDescription className="text-sm font-semibold text-brand-700">
                Choose what you want to work on next.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <QuickAction
                href="/review"
                icon={GameController}
                title="Play review"
                description={`${dashboard.cardsDue} cards due`}
                cta="Start"
              />
              <QuickAction
                href="/books"
                icon={BookOpen}
                title="Books"
                description={`${dashboard.activeDecks} active decks`}
                cta="Open"
              />
              <QuickAction
                href="/flashcards"
                icon={Cards}
                title="Flashcards"
                description={`${dashboard.totalCards} total cards`}
                cta="Manage"
              />
            </CardContent>
          </Card>

          <Card interactive className="rounded-3xl border border-brand-200/80 bg-white [--card-spacing:--spacing(5)]">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold tracking-normal">
                Learning snapshot
              </CardTitle>
              <CardDescription className="text-sm font-semibold text-brand-700">
                Your library at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SnapshotRow label="Mastered cards" value={dashboard.masteredCards} />
              <SnapshotRow label="Still learning" value={remainingCards} />
              <SnapshotRow label="Weekly accuracy" value={`${dashboard.accuracy}%`} />
            </CardContent>
          </Card>
        </section>
        </>
      ) : (
        <section className="grid min-h-[520px] place-items-center rounded-3xl border border-brand-200 bg-white px-6 py-12 text-center shadow-xl shadow-brand-800/8 motion-enter">
          <div className="flex max-w-sm flex-col items-center">
            <Image
              src={emptyFolderImage}
              alt=""
              className="h-auto w-52"
              priority
            />
            <Text as="div" className="mt-6" size="xl" weight="semibold">
              No dashboard data yet
            </Text>
            <Text className="mt-2" size="sm" tone="muted">
              Create your first book to start building flashcards and tracking
              review progress.
            </Text>
            <div className="mt-6 flex justify-center">
              <CreateBookDialog />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: typeof BookOpen;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <article className="flex min-h-36 flex-col justify-between rounded-2xl border border-brand-200 bg-card p-4 transition-[transform,box-shadow,border-color] [transition-duration:var(--motion-standard)] [transition-timing-function:var(--ease-motion-out)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-brand-800/10 motion-reduce:transform-none">
      <div>
        <Icon icon={icon} className="size-6 text-primary" weight="duotone" />
        <Text as="div" className="mt-4 text-base font-extrabold tracking-normal">
          {title}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground" weight="semibold">
          {description}
        </Text>
      </div>
      <Link
        href={href}
        className="mt-4 inline-flex h-8 items-center justify-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {cta}
      </Link>
    </article>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brand-100 pb-3 last:border-b-0 last:pb-0">
      <Text className="text-sm text-muted-foreground" weight="semibold">
        {label}
      </Text>
      <Text as="div" className="text-base font-extrabold tracking-normal">
        {value}
      </Text>
    </div>
  );
}

function DashboardStatCard({
  label,
  value,
  caption,
  icon,
  variant,
  className,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: typeof BookOpen;
  variant: "primary" | "cool" | "soft" | "warm";
  className?: string;
}) {
  const styles = {
    primary:
      "min-h-44 bg-[linear-gradient(135deg,var(--primary),var(--brand-700))] text-primary-foreground ring-primary/20",
    cool: "min-h-44 bg-[linear-gradient(135deg,#ffffff,var(--brand-100))] text-foreground ring-brand-200",
    soft: "min-h-44 bg-[linear-gradient(135deg,var(--brand-50),#ffffff)] text-foreground ring-brand-200",
    warm: "min-h-44 bg-[linear-gradient(135deg,#fff7f7,#ffdfe3)] text-foreground ring-destructive/15",
  };
  const iconStyles = {
    primary: "text-white",
    cool: "text-primary",
    soft: "text-primary",
    warm: "text-destructive",
  };

  return (
    <Card
      interactive
      className={cn(
        "relative justify-between rounded-3xl border-0 shadow-xl shadow-brand-800/8 [--card-spacing:--spacing(4)]",
        styles[variant],
        className
      )}
    >
      <CardHeader className="relative z-(--z-dashboard-content)">
        <CardDescription
          className={cn(
            "text-sm font-bold",
            variant === "primary" ? "text-white/90" : "text-brand-700"
          )}
        >
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "mt-2 text-2xl font-extrabold tracking-normal",
            variant === "primary" ? "text-white" : "text-foreground"
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-(--z-dashboard-content) flex items-end justify-between gap-4">
        <Icon icon={icon} className={cn("size-7", iconStyles[variant])} weight="duotone" />
        {caption ? (
          <Text className="max-w-48 text-brand-700" size="sm" weight="semibold">
            {caption}
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ColoredBookBadge() {
  return (
    <div className="mb-4 h-10 w-9">
      <div className="relative h-10 w-9">
        <div className="absolute left-1 top-1 h-8 w-7 rounded-lg bg-brand-100" />
        <div className="absolute left-0 top-2 h-8 w-7 rounded-lg bg-brand-300" />
        <div className="absolute left-1 top-1 h-8 w-7 rounded-lg bg-primary" />
        <div className="absolute left-2 top-1 h-4 w-2 rounded-b-sm bg-secondary" />
        <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/30" />
        <Icon
          icon={Star}
          className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-secondary"
          weight="fill"
        />
      </div>
    </div>
  );
}

function ReviewMascot() {
  return (
    <div className="pointer-events-none absolute left-6 top-0 z-(--z-dashboard-base) hidden size-32 -translate-y-[78%] xl:block">
      <Image
        src={penguinTopbar}
        alt=""
        className="size-full object-contain"
        priority
      />
      <Icon icon={Star} className="absolute -left-10 top-20 size-4 text-secondary" weight="fill" />
      <Icon icon={Sparkle} className="absolute -right-8 top-8 size-4 text-brand-400" weight="fill" />
    </div>
  );
}

function DeckIllustration() {
  return (
    <div className="pointer-events-none absolute bottom-28 right-8 hidden h-44 w-80 lg:block">
      <div className="absolute bottom-1 right-0 h-28 w-52 rotate-[-3deg] rounded-3xl bg-brand-100" />
      <div className="absolute bottom-4 right-5 h-28 w-52 rotate-[-7deg] rounded-3xl bg-brand-200" />
      <div className="absolute bottom-8 right-10 grid h-28 w-52 rotate-3 place-items-center rounded-3xl bg-white text-primary">
        <span className="text-5xl font-extrabold">Aa</span>
      </div>
      <Icon icon={Star} className="absolute bottom-8 left-2 size-10 text-secondary" weight="fill" />
      <Icon icon={Sparkle} className="absolute right-2 top-2 size-6 text-brand-400" weight="fill" />
    </div>
  );
}
