export type StreakStatus = {
  currentStreak: number;
  longestStreak: number;
  dailyTarget: number;
  nextDailyTarget: number | null;
  targetEffectiveDate: string | null;
  todayScore: number;
  remainingScore: number;
  progressPercent: number;
  completedToday: boolean;
  lastCompletedDate: string | null;
  timezone: string;
  message: string;
};

export type StreakProgress = {
  scoreAdded: number;
  todayScore: number;
  dailyTarget: number;
  remainingScore: number;
  progressPercent: number;
  completedToday: boolean;
  justCompleted: boolean;
  previousStreak: number;
  currentStreak: number;
};

export type UpdateStreakSettingsRequest = {
  dailyTarget?: number;
  timezone?: string;
};

export type UpdateStreakSettingsResponse = {
  dailyTarget: number;
  nextDailyTarget: number | null;
  effectiveDate: string | null;
  timezone: string;
};

export type SessionResponse = {
  message: string;
  session: unknown;
  streakProgress?: StreakProgress;
};
