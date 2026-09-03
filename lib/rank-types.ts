import type { UserRank } from "@/lib/dashboard-data";

export type RankStatus = "completed" | "current" | "locked";
export type RankDivision = "III" | "II" | "I";

export type RankCatalogItem = {
  slug: string;
  name: string;
  minLevel: number;
  maxLevel: number | null;
  title: string;
  subtitle: string;
  description: string;
  fomoText: string;
  imageUrl: string;
  divisions: RankDivision[];
  status: RankStatus;
  levelsRemaining: number;
  unlockText: string;
};

export type RankCatalogResponse = {
  systemVersion: number;
  xpPerLevel: number;
  ranks: RankCatalogItem[];
  currentUser: {
    level: number;
    exp: number;
    streak: number;
    currentRank: UserRank;
    currentLevelStartExp: number;
    nextLevelExp: number;
    levelProgressPercent: number;
    nextMilestoneText: string;
    streakText: string;
    standing: {
      position: number;
      totalUsers: number;
      topPercent: number;
      surpassedPercent: number;
      fomoText: string;
    };
  };
};
