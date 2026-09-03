# Rank Progression Frontend Proposal

## Objective

Create a motivating rank experience that shows the user's current rank, progress, global standing, unlocked achievements, and upcoming milestones. The frontend can also use the response to display one-time level-up, division-promotion, and rank-unlock celebrations.

The existing profile APIs remain unchanged. This feature uses the dedicated rank catalog endpoint.

## API

```http
GET /api/v1/ranks
Authorization: Bearer <access-token>
```

The endpoint requires an authenticated user.

## Response contract

```ts
type RankStatus = 'completed' | 'current' | 'locked';
type RankDivision = 'III' | 'II' | 'I';

interface RankCatalogResponse {
  systemVersion: number;
  xpPerLevel: number;

  ranks: Array<{
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
  }>;

  currentUser: {
    level: number;
    exp: number;
    streak: number;

    currentRank: {
      slug: string;
      name: string;
      division: RankDivision | null;
      displayName: string;
      imageUrl: string;
      nextRank: string | null;
      progressPercent: number;
    };

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
}
```

## Recommended UI

### Current-rank summary

Display this card at the top of the Profile, Leaderboard, or Rank Journey page:

- Current rank badge from `currentRank.imageUrl`
- `currentRank.displayName`
- Current level
- EXP progress toward the next level
- `nextMilestoneText`
- `standing.fomoText`

Example:

```text
CHALLENGER II
Level 14

750 / 1,000 XP
███████████████░░░░░ 75%

Only 6 levels left to unlock Achiever.
You are among the top 8% of active FLEN learners.
```

Calculate the displayed EXP values as follows:

```ts
const earnedXp =
  currentUser.exp - currentUser.currentLevelStartExp;

const requiredXp =
  currentUser.nextLevelExp - currentUser.currentLevelStartExp;
```

Use `currentUser.levelProgressPercent` directly as the progress-bar width.

### Rank journey

Render the `ranks` array in the order returned by the API.

| Status | Presentation |
| --- | --- |
| `completed` | Full-color badge with an unlocked checkmark |
| `current` | Highlighted badge with a glow or subtle pulse |
| `locked` | Dimmed badge with a lock icon |

Each rank card should show:

- Badge image
- Rank name
- Level range
- Title and subtitle
- Description
- Unlock message
- FOMO text when appropriate

When `maxLevel` is `null`, display the range as `Level 100+`.

### Rank details modal

Selecting a rank opens a detail modal. For example:

```text
Grandmaster

Among the elite

Very few learning journeys reach this level of commitment.

Levels 70–99
One final ascent remains before FLEN Legend.
```

For locked ranks, provide a `Continue Learning` action.

## Progress celebration flow

After the user completes a learning session:

1. Retain the rank state from before the session.
2. Submit the result through the existing API.
3. Fetch `GET /api/v1/ranks` again.
4. Compare the previous state with the latest state.
5. Show the highest-priority applicable celebration.

```ts
const previous = previousRank.currentUser;
const latest = latestRank.currentUser;

const didLevelUp = latest.level > previous.level;

const didChangeDivision =
  latest.currentRank.division !== previous.currentRank.division;

const didUnlockRank =
  latest.currentRank.slug !== previous.currentRank.slug;
```

Celebration priority:

```text
New rank unlocked
      ↓
New division reached
      ↓
Level increased
      ↓
Normal EXP progress
```

### New-rank animation

Recommended sequence:

1. Fade in a dark overlay.
2. Shrink or fade the previous badge.
3. Display a light burst.
4. Scale the new badge from `0.5` to `1.1`, then settle at `1`.
5. Display the new rank's title and subtitle.
6. Animate the level counter upward.
7. Show `View Rank` and `Continue Learning` actions.

Example:

```text
NEW RANK UNLOCKED

ACHIEVER III
Momentum looks good on you

You have built progress worth protecting.
```

### Division-promotion animation

Use a smaller celebration:

```text
DIVISION PROMOTION

Challenger III → Challenger II
```

### Level-up animation

```text
LEVEL UP

Level 14 → Level 15
Only 5 levels left to unlock Achiever.
```

## Prevent duplicate celebrations

Persist the last celebrated state locally:

```ts
interface StoredRankState {
  systemVersion: number;
  level: number;
  rankSlug: string;
  division: RankDivision | null;
}
```

Suggested storage key:

```text
flen:last-celebrated-rank:<userId>
```

Only show a celebration when the newest server state is higher than the stored state. Update the stored value after the user dismisses the animation.

If `systemVersion` changes, replace the stored state without showing a celebration based on stale rank rules.

## Integration rules

- Treat the API response as the source of truth.
- Do not duplicate rank thresholds or EXP formulas in frontend code.
- Use the titles, descriptions, images, unlock messages, and FOMO messages returned by the backend.
- Refetch ranks after a completed learning session.
- Refetch when opening Profile, Leaderboard, or Rank Journey.
- Handle `401 Unauthorized` through the existing authentication flow.
- Cached data may be shown immediately and refreshed in the background.
- A rank API failure must not block the learning result screen.
- Use `systemVersion` to invalidate incompatible cached rank state.

## Suggested component structure

```text
RankPage
├── CurrentRankHero
├── LevelProgressBar
├── GlobalStandingCard
├── RankJourney
│   └── RankCard
├── RankDetailsModal
└── RankCelebrationModal
```

## Acceptance criteria

- All eight ranks appear in the order returned by the API.
- Current, completed, and locked ranks have distinct visual states.
- Rank images are loaded from `imageUrl`.
- Progress bars use backend-provided percentages.
- The user's real leaderboard standing is displayed.
- A promotion celebration is displayed only once per promotion.
- Rank data refreshes after a completed learning session.
- Existing profile and learning flows continue working.
- Rank API failures do not prevent users from completing a session.

