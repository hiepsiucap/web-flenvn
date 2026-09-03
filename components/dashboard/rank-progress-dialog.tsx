"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CaretLeft, CaretRight, CheckCircle, LockSimple, Medal, Sparkle, Star } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RankLevelProgress } from "@/components/dashboard/rank-level-progress";
import { Modal, ModalBody, ModalCancelButton, ModalContent, ModalFooter, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import type { ApiEnvelope } from "@/lib/auth-types";
import type { UserRank } from "@/lib/dashboard-data";
import { http } from "@/lib/http";
import type { RankCatalogItem, RankCatalogResponse } from "@/lib/rank-types";
import { cn } from "@/lib/utils";
import rankMascot from "@/img/moscot.png";
import rankTreasure from "@/img/treasure.png";

type Props = { exp: number; level: number; progress: number; rank: UserRank | null };

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function levelRange(rank: RankCatalogItem) {
  return rank.maxLevel === null ? `Level ${rank.minLevel}+` : `Levels ${rank.minLevel}–${rank.maxLevel}`;
}

function RankCard({ rank }: { rank: RankCatalogItem }) {
  const current = rank.status === "current";
  const completed = rank.status === "completed";

  return (
    <article className={cn(
      "relative grid h-52 min-w-0 content-start justify-items-center gap-1 rounded-2xl border border-border px-2.5 py-2.5 text-center",
      current && "border-primary ring-1 ring-primary/20",
      rank.status === "locked" && "opacity-75"
    )}>
      {rank.imageUrl ? (
        <Image src={rank.imageUrl} alt={`${rank.name} rank badge`} width={104} height={104}
          className={cn("size-16 object-contain", rank.status === "locked" && "grayscale opacity-60")} />
      ) : (
        <Icon icon={Medal} className="size-14 text-primary" weight="duotone" />
      )}
      <h3 className="text-sm font-extrabold text-foreground">{rank.name}</h3>
      <p className="text-xs font-semibold text-muted-foreground">{levelRange(rank)}</p>
      {rank.divisions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p>Divisions</p>
          <p className="mt-0.5 font-semibold">{rank.divisions.join(" · ")}</p>
        </div>
      )}
      <span className={cn(
        "mt-auto inline-flex w-full items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold",
        current && "border-primary bg-primary text-primary-foreground",
        completed && "border-secondary/40 text-foreground",
        rank.status === "locked" && "border-border text-muted-foreground"
      )}>
        {completed && <Icon icon={CheckCircle} className="size-3.5" weight="fill" />}
        {rank.status === "locked" && <Icon icon={LockSimple} className="size-3.5" />}
        {current ? "Current" : completed ? "Completed" : "Locked"}
      </span>
    </article>
  );
}

export function RankProgressDialog({ exp, level, progress, rank }: Props) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<RankCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [carouselStart, setCarouselStart] = useState(0);
  const requestId = useRef(0);
  const user = catalog?.currentUser;
  const shownRank = user?.currentRank ?? rank;
  const shownExp = user?.exp ?? exp;
  const shownLevel = user?.level ?? level;
  const shownProgress = clampProgress(user?.levelProgressPercent ?? progress);
  const earnedXp = user ? Math.max(0, user.exp - user.currentLevelStartExp) : null;
  const requiredXp = user ? Math.max(0, user.nextLevelExp - user.currentLevelStartExp) : null;
  const ranksPerView = 5;
  const maxCarouselStart = Math.max(0, (catalog?.ranks.length ?? 0) - ranksPerView);
  const visibleRanks = catalog?.ranks.slice(carouselStart, carouselStart + ranksPerView) ?? [];

  async function loadRanks() {
    const id = ++requestId.current;
    setIsLoading(true);
    setError("");
    try {
      const response = await http.get<ApiEnvelope<RankCatalogResponse> | RankCatalogResponse>("/api/ranks", { cache: "no-store" });
      if (id === requestId.current) {
        setCatalog("data" in response ? response.data : response);
        setCarouselStart(0);
      }
    } catch {
      if (id === requestId.current) setError("We couldn't load the full rank journey. Please try again.");
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void loadRanks();
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger render={
        <Button type="button" variant="ghost" className="hidden h-auto items-center gap-2 rounded-2xl px-2 py-1.5 text-left xl:flex" aria-label="Open rank and experience details">
          {shownRank?.imageUrl ? <Image src={shownRank.imageUrl} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" /> : <Icon icon={Medal} className="size-10 text-primary" weight="duotone" />}
            <div className="block w-64">
              <span className="mb-1 flex items-center justify-between text-xs font-extrabold text-brand-800">
                <span>{shownRank?.displayName ?? "Mastery progress"}</span>
                <span>{shownProgress}%</span>
              </span>
              <RankLevelProgress
                progress={shownProgress}
                xpLabel={earnedXp !== null && requiredXp !== null
                  ? `${earnedXp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`
                  : `${shownExp.toLocaleString()} XP`}
                compact
                showStart={false}
              />
            </div>
        </Button>
      } />

      <ModalContent className="sm:max-w-4xl sm:px-6 sm:py-5">
        <ModalTitle className="text-xl">Your rank journey</ModalTitle>

        <ModalBody className="gap-4 overflow-x-hidden overflow-y-hidden" aria-live="polite">
          <section className="grid h-52 gap-3">
            <div className="grid items-center gap-3 sm:grid-cols-[110px_minmax(0,1fr)_210px]">
              <div className="mx-auto flex w-28 flex-col items-center">
                {shownRank?.imageUrl ? (
                  <Image src={shownRank.imageUrl} alt={`${shownRank.displayName} rank badge`} width={112} height={112} className="relative z-10 size-24 object-contain" />
                ) : <Icon icon={Medal} className="relative z-10 size-20 text-primary" weight="duotone" />}
                <div className="relative -mt-2 h-4 w-20 rounded-[50%] border border-secondary/45 bg-secondary/25 shadow-[0_0_16px_var(--secondary)]">
                  <div className="absolute inset-x-2 top-0 h-1.5 rounded-[50%] bg-secondary/60 blur-[1px]" />
                </div>
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary">Current rank</p>
                <p className="mt-2 text-xl font-extrabold text-primary">{shownRank?.displayName ?? "Not ranked yet"}</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Level {shownLevel} · {shownExp.toLocaleString()} total XP</p>
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold">
                  <Icon icon={Star} className="size-4 text-secondary" weight="fill" />
                  {user?.nextMilestoneText ?? "Keep earning XP to reach your next rank."}
                </div>
                <div className="mt-3 grid w-full gap-1">
                  <p className="text-[11px] font-bold">Level progress</p>
                  <RankLevelProgress
                    progress={shownProgress}
                    xpLabel={earnedXp !== null && requiredXp !== null
                      ? `${earnedXp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`
                      : `${shownProgress}%`}
                  />
                </div>
              </div>
              <div className="hidden min-h-44 place-items-center sm:grid">
                <Image
                  src={rankMascot}
                  alt="Celebrating learning mascot"
                  className="h-48 w-auto object-contain"
                  priority
                />
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            {isLoading && !catalog && <p className="rounded-2xl border border-border p-5 text-sm text-muted-foreground">Loading your rank journey…</p>}
            {error && !catalog && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4"><p className="text-sm text-muted-foreground">{error}</p><Button type="button" variant="outline" size="sm" onClick={() => void loadRanks()}>Try again</Button></div>}
            {catalog && (
              <div className="relative mx-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 bg-background shadow-sm"
                  disabled={carouselStart === 0}
                  aria-label="Show previous ranks"
                  onClick={() => setCarouselStart((value) => Math.max(0, value - 1))}
                >
                  <Icon icon={CaretLeft} />
                </Button>
                <div className="grid grid-cols-5 gap-2.5 overflow-hidden">
                  {visibleRanks.map((item) => (
                    <RankCard key={item.slug} rank={item} />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="absolute -right-4 top-1/2 z-20 -translate-y-1/2 bg-background shadow-sm"
                  disabled={carouselStart >= maxCarouselStart}
                  aria-label="Show next ranks"
                  onClick={() => setCarouselStart((value) => Math.min(maxCarouselStart, value + 1))}
                >
                  <Icon icon={CaretRight} />
                </Button>
              </div>
            )}
          </section>

        </ModalBody>

        <ModalFooter className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5">
          <div className="relative flex min-h-16 items-center rounded-2xl border border-border px-4 pr-32">
            <Icon icon={Sparkle} className="mr-3 size-6 shrink-0 text-primary" weight="duotone" />
            <div>
              <p className="text-sm font-extrabold text-primary">Keep learning, keep growing!</p>
              <p className="text-xs text-muted-foreground">Every word brings you closer to the next rank.</p>
            </div>
            <Image
              src={rankTreasure}
              alt=""
              className="absolute bottom-[-5px] right-4 h-24 w-auto object-contain"
            />
          </div>
          <ModalCancelButton className="h-12 min-w-32 bg-primary text-primary-foreground hover:bg-primary/80">
            Close
          </ModalCancelButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
