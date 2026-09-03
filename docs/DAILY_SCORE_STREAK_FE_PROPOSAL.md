# Daily Score Streak Frontend Proposal

## Objective

Replace the old "complete any session to keep a streak" experience with a daily score goal. A user selects a target, scores accumulate across learning sessions during their local day, and the streak is protected only when the target is reached.

The frontend should make three things immediately clear:

- How many points the user has earned today
- How many points remain to protect the streak
- Whether the latest session completed the daily goal

## Backend behavior

- The default daily target is `100` points.
- Valid targets are integers from `10` through `1000`.
- Scores from flashcard and practice sessions accumulate for the current local day.
- The backend validates session scores before adding them.
- Reaching the target increments the streak once for that day.
- Later sessions continue earning EXP but cannot increment the streak again.
- Score above the target is displayed but does not carry into tomorrow.
- A target change becomes effective the following local day.
- Daily boundaries use the user's IANA timezone, such as `Asia/Bangkok`.
- Existing streak values are preserved during the transition.
- The backend is the source of truth for all streak calculations.

## API response envelope

The API uses the existing global response envelope:

```ts
interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}
```

If the shared HTTP helper already unwraps `data`, components should consume the inner payload and must not unwrap it a second time.

## Get streak status

```http
GET /api/v1/streak
Authorization: Bearer <access-token>
```

The existing route below returns the same streak status and remains supported:

```http
GET /api/v1/sessions/streak
Authorization: Bearer <access-token>
```

### Response data

```ts
interface StreakStatus {
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
}
```

Example:

```json
{
  "success": true,
  "data": {
    "currentStreak": 6,
    "longestStreak": 14,
    "dailyTarget": 100,
    "nextDailyTarget": null,
    "targetEffectiveDate": null,
    "todayScore": 70,
    "remainingScore": 30,
    "progressPercent": 70,
    "completedToday": false,
    "lastCompletedDate": "2026-09-01",
    "timezone": "Asia/Bangkok",
    "message": "Earn 30 more points today to protect your 6-day streak."
  },
  "timestamp": "2026-09-02T06:00:00.000Z"
}
```

## Update streak settings

```http
PATCH /api/v1/streak/settings
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request:

```ts
interface UpdateStreakSettingsRequest {
  dailyTarget?: number;
  timezone?: string;
}
```

Example:

```json
{
  "dailyTarget": 150,
  "timezone": "Asia/Bangkok"
}
```

Response data:

```ts
interface UpdateStreakSettingsResponse {
  dailyTarget: number;
  nextDailyTarget: number | null;
  effectiveDate: string | null;
  timezone: string;
}
```

Example:

```json
{
  "success": true,
  "data": {
    "dailyTarget": 100,
    "nextDailyTarget": 150,
    "effectiveDate": "2026-09-03",
    "timezone": "Asia/Bangkok"
  },
  "timestamp": "2026-09-02T06:00:00.000Z"
}
```

The frontend must continue showing `dailyTarget` as today's target. If `nextDailyTarget` is present, show it as a scheduled change.

## Session response integration

Both session-completion APIs now return an additive `streakProgress` object:

```http
POST /api/v1/sessions/flashcard/:flashcardId
POST /api/v1/sessions/practice
```

```ts
interface StreakProgress {
  scoreAdded: number;
  todayScore: number;
  dailyTarget: number;
  remainingScore: number;
  progressPercent: number;
  completedToday: boolean;
  justCompleted: boolean;
  previousStreak: number;
  currentStreak: number;
}
```

Example inner response from a session that crosses the target:

```json
{
  "message": "Session recorded successfully",
  "session": {},
  "streakProgress": {
    "scoreAdded": 40,
    "todayScore": 110,
    "dailyTarget": 100,
    "remainingScore": 0,
    "progressPercent": 100,
    "completedToday": true,
    "justCompleted": true,
    "previousStreak": 6,
    "currentStreak": 7
  }
}
```

Use `justCompleted`, not a frontend score comparison, to decide whether to show the streak celebration. The backend guarantees this is true only for the request that completes the goal.

## Recommended UI

### Daily streak card

Place the card on Home and optionally Profile:

```text
🔥 6-day streak

70 / 100 points today
[██████████████░░░░░░] 70%

30 more points to protect your streak
```

Use these response fields directly:

- Counter: `todayScore / dailyTarget`
- Progress width: `progressPercent`
- Supporting text: `message`
- Best streak: `longestStreak`

Do not calculate daily progress or streak continuity in the frontend.

### Incomplete state

- Show the current flame and streak count.
- Show the remaining score prominently.
- Use the normal progress color.
- Primary action: `Continue learning`.

### Completed state

```text
🔥 Daily goal complete

110 / 100 points
[████████████████████] 100%

Your 7-day streak is protected
```

- Show a completed checkmark.
- Keep displaying actual `todayScore`, including score above the target.
- Cap only the visual progress bar at `100%` using `progressPercent`.
- Replace the urgent CTA with a neutral `Keep learning` action.

### New-user state

When `currentStreak` and `todayScore` are both `0`:

```text
Start your first streak
Earn 100 points today
```

### Expired state

When `currentStreak` is `0` but a previous completion exists:

```text
Start a new streak today
Every comeback begins with one session
```

Use the server-provided `message` as the supporting copy when possible.

## Daily target settings

Recommended presets:

| Label | Target |
| --- | ---: |
| Light | 50 |
| Regular | 100 |
| Serious | 200 |
| Intense | 300 |

Also allow a custom integer between `10` and `1000`.

After a successful update, show:

```text
Your 150-point daily goal starts tomorrow.
Today's goal remains 100 points.
```

When status returns a pending target, display:

```text
150 points per day starting Sep 3
```

Do not optimistically replace today's target with the new value.

For timezone selection, use IANA timezone identifiers. Prefer automatically detecting the browser timezone as the initial suggestion:

```ts
const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

The user should confirm before saving a detected timezone that differs from the saved value.

## Goal-completion animation

Show the animation only when:

```ts
streakProgress.justCompleted === true
```

Recommended sequence:

1. Animate the progress bar to `100%`.
2. Briefly scale the flame icon.
3. Count from `previousStreak` to `currentStreak`.
4. Display the completion message.
5. Provide `Continue learning` and `Done` actions.

Example:

```text
DAILY GOAL COMPLETE

🔥 7-day streak
100 / 100 points

You protected your streak!
```

If `previousStreak === currentStreak`, the user completed the goal on a migration/transition day and the streak was already credited. Celebrate goal completion without animating the streak number upward.

## State management and refresh rules

- Fetch streak status after authentication succeeds.
- Refetch when Home or Profile becomes active.
- Update cached streak status from `streakProgress` immediately after a session.
- Optionally refetch in the background after applying the session response.
- Invalidate streak status after updating settings.
- Refetch when the app returns to the foreground after crossing midnight.
- Treat the backend's timezone and date boundaries as authoritative.
- A streak-status failure must not block learning or result submission.

Suggested query keys:

```ts
['streak', 'status']
['streak', 'settings']
```

## Session cache update example

```ts
function applyStreakProgress(
  previous: StreakStatus,
  progress: StreakProgress,
): StreakStatus {
  return {
    ...previous,
    currentStreak: progress.currentStreak,
    todayScore: progress.todayScore,
    dailyTarget: progress.dailyTarget,
    remainingScore: progress.remainingScore,
    progressPercent: progress.progressPercent,
    completedToday: progress.completedToday,
  };
}
```

Do not update `longestStreak` locally from this object because it is not included in `streakProgress`. Refetch status after the optimistic cache update to obtain the authoritative longest streak.

## Error handling

- `400`: show the validation message for an invalid target or timezone.
- `401`: use the existing refresh-token or login flow.
- Network failure while loading status: hide the detailed progress state or show the last cached value.
- Network failure while changing settings: retain the previous settings and allow retry.
- Session submission success with UI refresh failure: keep the session result and retry only the status fetch.

## Suggested component structure

```text
StreakCard
├── StreakHeader
├── DailyGoalProgress
├── StreakMessage
└── ContinueLearningButton

StreakSettingsDialog
├── TargetPresetSelector
├── CustomTargetInput
├── TimezoneSelector
└── ScheduledTargetNotice

StreakCompletionDialog
├── GoalCompletionAnimation
├── StreakCounter
└── CompletionActions
```

Use the existing shared components from `components/ui`, request helpers from `lib/http.ts`, and theme tokens from `app/globals.css`. Keep the presentation clean and avoid introducing one-off gradients, heavy glow effects, or hard-coded brand colors.

## Rollout order

1. Add API types and client methods.
2. Replace old streak status usage with `GET /api/v1/streak`.
3. Add the daily streak card.
4. Consume `streakProgress` from both session completion flows.
5. Add the one-time goal-completion animation.
6. Add daily target and timezone settings.
7. Add foreground/midnight refresh behavior.

## Acceptance criteria

- The user can choose a daily target from `10` to `1000`.
- A changed target is clearly shown as effective tomorrow.
- Scores from multiple sessions accumulate in the daily UI.
- Completing a low or zero-score session does not automatically earn a streak.
- The celebration appears only when `justCompleted` is true.
- The streak cannot visually increment twice on the same day.
- Progress displays score above the target while the bar remains capped at `100%`.
- Both flashcard and practice session flows update streak progress.
- Timezone comes from the server and can be updated with an IANA identifier.
- Existing learning flows remain usable when the streak request fails.
- No rank or profile response changes are required for this integration.
