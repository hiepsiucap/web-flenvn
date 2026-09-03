import { describe, expect, it } from "vitest";

import type { UserProfile, UserRank } from "./dashboard-data";
import { createProgressTransition } from "./progress-transition";

const bronzeRank: UserRank = {
  slug: "bronze-iii",
  name: "Bronze",
  division: "III",
  displayName: "Bronze III",
  imageUrl: "https://example.com/bronze.png",
  nextRank: "bronze-ii",
  progressPercent: 20,
};

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    email: "learner@example.com",
    exp: 100,
    level: 2,
    rank: bronzeRank,
    ...overrides,
  };
}

describe("createProgressTransition", () => {
  it("calculates normal XP gain", () => {
    const transition = createProgressTransition(profile(), profile({ exp: 240 }));

    expect(transition).toMatchObject({
      xpEarned: 140,
      leveledUp: false,
      rankedUp: false,
    });
  });

  it("detects multiple levels gained", () => {
    const transition = createProgressTransition(
      profile({ level: 2 }),
      profile({ exp: 500, level: 5 })
    );

    expect(transition).toMatchObject({
      levelsGained: 3,
      leveledUp: true,
    });
  });

  it("detects a rank change by slug", () => {
    const silverRank = {
      ...bronzeRank,
      slug: "silver-iii",
      name: "Silver",
      displayName: "Silver III",
    };
    const transition = createProgressTransition(
      profile(),
      profile({ rank: silverRank })
    );

    expect(transition?.rankedUp).toBe(true);
  });

  it("does not treat a display-only division change as a rank change", () => {
    const renamedRank = {
      ...bronzeRank,
      division: "II" as const,
      displayName: "Bronze II",
    };
    const transition = createProgressTransition(
      profile(),
      profile({ rank: renamedRank })
    );

    expect(transition?.rankedUp).toBe(false);
  });

  it("clamps negative XP and level differences to zero", () => {
    const transition = createProgressTransition(
      profile({ exp: 500, level: 5 }),
      profile({ exp: 450, level: 4 })
    );

    expect(transition).toMatchObject({ xpEarned: 0, levelsGained: 0 });
  });

  it("returns null when progress data is incomplete", () => {
    expect(createProgressTransition(profile(), profile({ rank: undefined }))).toBeNull();
  });
});
