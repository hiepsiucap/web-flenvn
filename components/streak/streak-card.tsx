"use client";

import Link from "next/link";
import Image from "next/image";
import { GearSix } from "@phosphor-icons/react";

import { useStreak } from "@/components/streak/streak-provider";
import { StreakSettingsDialog } from "@/components/streak/streak-settings-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import streakImage from "@/img/streak.png";

export function StreakCard() {
  const { status, isLoading } = useStreak();
  if (!status) return isLoading ? null : null;

  const progress = Math.min(100, Math.max(0, status.progressPercent));
  const isNew = status.currentStreak === 0 && status.todayScore === 0 && !status.lastCompletedDate;
  const title = status.completedToday ? "Daily goal complete" : isNew ? "Start your first streak" : status.currentStreak === 0 ? "Start a new streak today" : `${status.currentStreak}-day streak`;
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card className="rounded-3xl border-brand-200/80 bg-card [--card-spacing:--spacing(5)]">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative grid size-10 place-items-center">
            <svg className="absolute inset-0 size-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--brand-100)" strokeWidth="3" />
              <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
            </svg>
            <Image src={streakImage} alt="" className="size-7 object-contain" />
          </span>
          <div><CardTitle className="text-lg font-extrabold">{title}</CardTitle><p className="text-xs font-semibold text-muted-foreground">Best: {status.longestStreak} days</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold">{status.todayScore} / {status.dailyTarget} points</span>
          <StreakSettingsDialog trigger={<Button type="button" variant="ghost" size="icon-sm" aria-label="Change daily goal"><Icon icon={GearSix} /></Button>} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="h-3 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Daily streak goal progress"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-muted-foreground">{status.message}</p><Link href="/review" className="text-sm font-extrabold text-primary hover:underline">{status.completedToday ? "Keep learning" : "Continue learning"}</Link></div>
        {status.nextDailyTarget && <p className="border-t border-border pt-3 text-xs font-semibold text-primary">{status.nextDailyTarget} points per day starting {status.targetEffectiveDate}.</p>}
      </CardContent>
    </Card>
  );
}
