import type { UserProfile, UserRank } from "./dashboard-data";

export type ProgressTransition = {
  xpEarned: number;
  previousExp: number;
  currentExp: number;
  previousLevel: number;
  currentLevel: number;
  levelsGained: number;
  leveledUp: boolean;
  previousRank: UserRank;
  currentRank: UserRank;
  rankedUp: boolean;
};

export function createProgressTransition(
  previous: UserProfile,
  current: UserProfile
): ProgressTransition | null {
  if (
    previous.exp === undefined ||
    current.exp === undefined ||
    previous.level === undefined ||
    current.level === undefined ||
    !previous.rank ||
    !current.rank
  ) {
    return null;
  }

  return {
    xpEarned: Math.max(0, current.exp - previous.exp),
    previousExp: previous.exp,
    currentExp: current.exp,
    previousLevel: previous.level,
    currentLevel: current.level,
    levelsGained: Math.max(0, current.level - previous.level),
    leveledUp: current.level > previous.level,
    previousRank: previous.rank,
    currentRank: current.rank,
    rankedUp: current.rank.slug !== previous.rank.slug,
  };
}
