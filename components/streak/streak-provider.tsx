"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { ApiEnvelope } from "@/lib/auth-types";
import { http } from "@/lib/http";
import type { StreakProgress, StreakStatus } from "@/lib/streak-types";

type StreakContextValue = {
  status: StreakStatus | null;
  isLoading: boolean;
  refreshStreak: () => Promise<void>;
  applyStreakProgress: (progress: StreakProgress) => void;
};

const StreakContext = createContext<StreakContextValue | null>(null);

function unwrap<T>(response: ApiEnvelope<T> | T) {
  return typeof response === "object" && response !== null && "data" in response
    ? response.data
    : response;
}

export function StreakProvider({ initialStatus, children }: { initialStatus: StreakStatus | null; children: React.ReactNode }) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const localDateRef = useRef("");

  const refreshStreak = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await http.get<ApiEnvelope<StreakStatus> | StreakStatus>("/api/streak", { cache: "no-store" });
      setStatus(unwrap(response));
    } catch {
      // Streak status is supplementary and must not block learning.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyStreakProgress = useCallback((progress: StreakProgress) => {
    setStatus((current) => current ? {
      ...current,
      currentStreak: progress.currentStreak,
      todayScore: progress.todayScore,
      dailyTarget: progress.dailyTarget,
      remainingScore: progress.remainingScore,
      progressPercent: progress.progressPercent,
      completedToday: progress.completedToday,
    } : null);
  }, []);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshStreak();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [refreshStreak]);

  useEffect(() => {
    if (!status?.timezone) return;
    const getLocalDate = () => new Intl.DateTimeFormat("en-CA", {
      timeZone: status.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    localDateRef.current = getLocalDate();
    const interval = window.setInterval(() => {
      const nextDate = getLocalDate();
      if (nextDate !== localDateRef.current) {
        localDateRef.current = nextDate;
        void refreshStreak();
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [refreshStreak, status?.timezone]);

  const value = useMemo(() => ({ status, isLoading, refreshStreak, applyStreakProgress }), [status, isLoading, refreshStreak, applyStreakProgress]);
  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const context = useContext(StreakContext);
  if (!context) throw new Error("useStreak must be used inside StreakProvider");
  return context;
}
