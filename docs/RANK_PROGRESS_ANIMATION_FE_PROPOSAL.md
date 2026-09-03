# Rank and Progress Animation - Frontend Proposal

## Goal

After a practice session is saved, refresh the user profile and compare the
profile from before the practice with the new profile. Use the difference to
show:

- XP gained
- level-up animation
- rank-up animation with the new badge

No additional backend endpoint is required. The existing profile response is
the source of truth.

## Available Backend API

```http
GET /api/users/profile
```

The Next.js route proxies to:

```http
GET /api/v1/users/profile
```

Relevant response shape:

```ts
export type UserRank = {
  slug: string;
  name: string;
  division: "III" | "II" | "I" | null;
  displayName: string;
  imageUrl: string;
  nextRank: string | null;
  progressPercent: number;
};

export type UserProfile = {
  id: string;
  email: string;
  username?: string | null;
  avatar?: string | null;
  streak?: number;
  level: number;
  exp: number;
  rank: UserRank;
};
```

Adding `rank` to `UserProfile` is required in `lib/dashboard-data.ts`.

## Current Practice Flow

Current code in `components/practice/practice-runner.tsx` does this:

```ts
await http.post("/api/sessions/practice", payload);
await http.get("/api/users/profile");
```

The second response is currently discarded. Keep both the profile before the
practice and the refreshed profile instead.

## Recommended Data Flow

```text
start practice
  -> fetch and store baseline profile
  -> play games locally
  -> POST completed practice
  -> GET refreshed profile
  -> compare baseline and refreshed profile
  -> immediately update local profile state
  -> play XP animation
  -> play level-up animation when level increased
  -> play rank-up animation when rank slug changed
  -> show normal practice summary
```

Fetch the baseline profile when `startPractice` runs, not after the last
answer. This ensures it represents the user's state before this practice.

The due-card request and baseline profile request can run in parallel:

```ts
const [cardsResponse, profileBefore] = await Promise.all([
  http.get<ApiEnvelope<Flashcard[]> | Flashcard[]>(
    "/api/flashcards/review/due",
    { query: { bookId, limit } }
  ),
  http.get<UserProfile>("/api/users/profile"),
]);

profileBeforeRef.current = profileBefore;
```

Use a ref so the baseline does not cause gameplay rerenders:

```ts
const profileBeforeRef = useRef<UserProfile | null>(null);
```

## Transition Model

Add a local transition type:

```ts
type ProgressTransition = {
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
```

Build it from the two profiles:

```ts
function createProgressTransition(
  previous: UserProfile,
  current: UserProfile
): ProgressTransition {
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
```

Do not compare `displayName` for rank changes. Division can change while the
rank badge stays the same. Use `rank.slug` to detect a real badge/rank change.

## Updated Finish Flow

```ts
const [practiceResponse, profileAfter] = await Promise.all([
  http.post("/api/sessions/practice", {
    bookId: selectedBook.bookId,
    durationMs: Math.round(getNow() - runStartedAt),
    flashcards,
  }),
  // Start only after POST succeeds if strict ordering is required.
]);
```

The profile refresh must happen after the practice POST has completed. The
actual implementation should therefore be sequential:

```ts
await http.post("/api/sessions/practice", {
  bookId: selectedBook.bookId,
  durationMs: Math.round(getNow() - runStartedAt),
  flashcards,
});

const profileAfter = await http.get<UserProfile>("/api/users/profile");
const profileBefore = profileBeforeRef.current;

if (profileBefore) {
  const transition = createProgressTransition(profileBefore, profileAfter);

  if (transition.xpEarned > 0) {
    setProgressTransition(transition);
  }
}

profileBeforeRef.current = profileAfter;
setSummary(nextSummary);
router.refresh();
```

Do not run POST practice and GET profile in parallel. The GET could finish
before the backend has saved the new EXP.

## Animation Sequence

Use one overlay component with internal phases:

```ts
type CelebrationPhase =
  | "xp"
  | "level-up"
  | "rank-up"
  | "complete";
```

Recommended order:

1. `xp`: show `+{xpEarned} XP`; animate the progress bar.
2. `level-up`: show the new level when `leveledUp` is true.
3. `rank-up`: reveal the new badge when `rankedUp` is true.
4. `complete`: allow dismissal and show the practice summary.

Skip phases that do not apply.

### XP Phase

- Count from `previousExp` to `currentExp`.
- Show a short score pop such as `+240 XP`.
- Duration: approximately 600-900 ms.
- Do not count every integer for very large changes; use request animation
  frames with interpolation.

### Level-Up Phase

- Show `LEVEL UP` and `Level {currentLevel}`.
- If multiple levels were gained, display `+{levelsGained} levels` rather than
  blocking on one animation per level.
- Duration: approximately 900-1200 ms.

### Rank-Up Phase

- Fade/scale the previous badge down.
- Reveal `currentRank.imageUrl` with a glow and particles.
- Show `RANK UP` and `currentRank.displayName`.
- Duration: approximately 1400-1800 ms.
- Preload the new rank image before entering this phase.

## Suggested Components

```text
components/progress/
  progress-celebration.tsx
  xp-progress-bar.tsx
  level-up-panel.tsx
  rank-up-panel.tsx

lib/
  progress-transition.ts
```

`ProgressCelebration` should receive data and remain presentation-only:

```ts
type ProgressCelebrationProps = {
  transition: ProgressTransition;
  open: boolean;
  onComplete: () => void;
};
```

## Badge Images

Use the `imageUrl` returned by the API. Do not construct S3 URLs in FE.

If using `next/image`, ensure this host is allowed by `next.config`:

```text
flenvn.s3.ap-southeast-1.amazonaws.com
```

Preload the current badge before showing the overlay:

```ts
await new Promise<void>((resolve) => {
  const image = new Image();
  image.onload = () => resolve();
  image.onerror = () => resolve();
  image.src = transition.currentRank.imageUrl;
});
```

Animation must still work when the image fails; show the rank name and a
neutral fallback icon.

## Reduced Motion and Accessibility

- Respect `prefers-reduced-motion`.
- Reduced-motion mode should use simple opacity transitions.
- Give the overlay `role="dialog"` and an accessible title.
- Do not depend on color alone to communicate level/rank changes.
- Provide a Skip/Continue button.
- Do not autoplay a loud sound; use the existing sound preference if one is
  available.

## Error Handling

- If POST practice fails: keep the existing save-failed behavior.
- If POST succeeds but profile refresh fails: practice is still saved; show
  the normal summary and a non-blocking profile-refresh warning.
- If no baseline profile exists: do not guess level-up/rank-up; update the
  profile and skip the celebration for that run.
- Never replay a celebration merely because `router.refresh()` rerendered the
  page. Keep the transition in local component state and clear it on close.

## Acceptance Criteria

- `UserProfile` supports the backend `rank` object.
- A baseline profile is captured before practice begins.
- Profile is refreshed only after practice POST succeeds.
- XP gained equals `profileAfter.exp - profileBefore.exp`.
- Level animation appears only when the numeric level increases.
- Rank animation appears only when `rank.slug` changes.
- New badge uses the API-provided S3 URL.
- Practice summary and save behavior continue to work.
- Profile refresh failure does not mark a successfully saved practice as
  failed.
- Reduced-motion users receive a non-animated equivalent.

## Implementation Order

1. Extend `UserProfile` with `UserRank`.
2. Add `createProgressTransition` and unit tests.
3. Capture the baseline profile in `startPractice`.
4. Retain the refreshed profile in `finishPractice`.
5. Implement XP overlay.
6. Add level-up phase.
7. Add rank-up badge phase.
8. Add reduced-motion and failure fallbacks.
9. Test normal XP, level boundary, rank boundary, and refresh failure.
