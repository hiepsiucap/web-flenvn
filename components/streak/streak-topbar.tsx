"use client";

import Image from "next/image";

import { useStreak } from "@/components/streak/streak-provider";
import { StreakSettingsDialog } from "@/components/streak/streak-settings-dialog";
import { Button } from "@/components/ui/button";
import streakImage from "@/img/streak.png";

export function StreakTopbar() {
  const { status } = useStreak();
  const progress = Math.min(100, Math.max(0, status?.progressPercent ?? 0));
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <StreakSettingsDialog
      trigger={
        <Button type="button" variant="ghost" className="h-11 gap-2 rounded-xl px-2" aria-label={`${status?.currentStreak ?? 0}-day streak, ${status?.todayScore ?? 0} of ${status?.dailyTarget ?? 100} points today. Change daily goal.`}>
          <span className="relative grid size-10 place-items-center">
            <svg className="absolute inset-0 size-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--brand-100)" strokeWidth="3" />
              <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
            </svg>
            <Image src={streakImage} alt="" className="size-5 object-contain" />
          </span>
          <span className="hidden text-left xl:block"><span className="block text-xs font-extrabold">{status?.currentStreak ?? 0} day streak</span><span className="block text-[10px] font-semibold text-muted-foreground">{status?.todayScore ?? 0} / {status?.dailyTarget ?? 100} points</span></span>
        </Button>
      }
    />
  );
}
