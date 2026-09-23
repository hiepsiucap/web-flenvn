# Frontend Proposal: FLEN App Motion System

## Objective

Create a consistent motion system that makes FLEN feel responsive, playful, and rewarding without distracting learners from reading and practice.

The app already includes isolated animations for flashcard flips, practice progress, errors, dialogs, loaders, and celebrations. The main problem is inconsistency: high-energy effects appear in a few learning flows, while navigation, page entry, lists, cards, and successful actions often feel static.

This proposal introduces shared motion rules first, then applies them to the highest-value product interactions.

## Design principles

1. **Respond immediately.** Every click, selection, and submission should show feedback within 100 ms.
2. **Explain state changes.** Motion should clarify where content came from, where it moved, or what changed.
3. **Reward meaningful progress.** Strong animation belongs to completed goals, streaks, rank changes, and mastered content.
4. **Keep study surfaces calm.** Reading, typing, and listening areas should not contain unnecessary continuous movement.
5. **Use one motion language.** Shared durations, easing curves, and movement distances should be used throughout the app.
6. **Respect accessibility.** Reduced-motion preferences must preserve state feedback while removing unnecessary movement.

## Current-state findings

Existing motion is concentrated in:

- Flashcard flipping and practice-card movement.
- Practice energy, flame, score, and confetti effects.
- Dialog and menu entry/exit animations.
- Loading spinners and skeletons.
- Error shaking on authentication forms.
- Progress-bar width transitions.

Areas that currently feel comparatively static:

- Page and route entry.
- Sidebar navigation changes.
- Dashboard data appearing after loading.
- Book and flashcard list insertion or removal.
- Form success states.
- Recent Shadowing item selection and reordering.
- Empty-state to populated-state transitions.

## Motion tokens

Add shared tokens to `app/globals.css` so components do not invent their own timings.

```css
:root {
  --motion-instant: 120ms;
  --motion-quick: 180ms;
  --motion-standard: 280ms;
  --motion-celebration: 600ms;

  --ease-motion-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-motion-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-motion-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

| Motion level | Duration | Intended use |
| --- | ---: | --- |
| Instant | 100–140 ms | Button presses, checkboxes, small icons |
| Quick | 160–200 ms | Hover feedback, menus, tabs |
| Standard | 240–320 ms | Cards, list changes, page content |
| Celebration | 450–800 ms | Goals, streaks, rank changes |

Default movement distances should remain small:

- Page or panel entrance: 8 px.
- List-item entrance: 6 px.
- Interactive-card hover: 2 px.
- Button press: 1–2 percent scale or 1 px downward translation.

## Shared motion utilities

Create reusable CSS utilities or focused UI components for:

- `motion-enter`: fade in and move upward 8 px.
- `motion-pop`: spring from approximately 94 percent scale.
- `motion-list-item`: fade and move upward 6 px.
- `motion-exit`: short fade and scale down.
- `motion-success`: checkmark or confirmation pop.
- `motion-highlight`: temporary background-color emphasis after an update.

Prefer CSS and the existing `tw-animate-css` dependency for the first implementation. Do not add a general animation library until a feature requires layout-aware shared-element transitions that CSS cannot express cleanly.

## Phase 1: Shared foundation

### Global motion

Update `app/globals.css` with:

- Motion duration and easing tokens.
- Reusable entrance, pop, list, and success keyframes.
- Reduced-motion overrides.
- A consistent approach to animation fill mode and transform origin.

### Buttons

Update `components/ui/button.tsx`:

- Apply a subtle hover lift to primary actions on pointer devices.
- Compress buttons slightly while pressed.
- Allow icons to move 2 px in the action direction where meaningful.
- Keep disabled and loading buttons visually stable.
- Avoid hover movement on touch-only devices.

### Cards

Update `components/ui/card.tsx` with an opt-in interactive variant:

- Move upward 2 px on hover.
- Increase border emphasis and shadow slightly.
- Return quickly on pointer leave.
- Keep informational cards static by default.

### Inputs, checkboxes, tabs, and progress

- Animate checkbox indicators when checked.
- Smooth tab active-state changes.
- Animate progress values with the standard easing curve.
- Expand validation messages instead of making them appear abruptly.
- Crossfade loading and success labels inside buttons.

## Phase 2: Navigation and page structure

### Dashboard shell

Target files:

- `components/dashboard/dashboard-shell.tsx`
- `components/dashboard/dashboard-sidebar.tsx`
- `components/dashboard/sidebar-nav.tsx`
- `components/dashboard/profile-menu.tsx`

Implement:

- Smooth active-navigation background and icon changes.
- A 2 px icon movement on hover.
- Animated mobile-sidebar entry and exit.
- Crossfades when profile, streak, or rank data finishes loading.
- Stable header geometry during loading and route changes.

### Page entry

Authenticated pages should use a short coordinated entrance:

1. Page heading fades and moves upward.
2. Main content follows approximately 40–60 ms later.
3. Secondary panels appear together instead of every child receiving a large stagger.

Page transitions should finish within 320 ms and must not delay route navigation.

## Phase 3: Product interactions

### Dashboard

Target `app/(authenticated)/dashboard/page.tsx` and related dashboard components.

- Animate numeric values from their previous value when feasible.
- Grow progress bars from the previous value rather than from zero after every render.
- Reveal dashboard sections with a restrained stagger.
- Play a small completion pop when the daily goal is reached.
- Trigger a mascot reaction once when a streak or rank changes.

### Books

Target:

- `components/books/books-grid.tsx`
- `components/books/create-book-dialog.tsx`

Implement:

- Short stagger when the first book result set appears.
- Animate a newly created book into its final grid position.
- Collapse deleted cards before removing their space.
- Use the shared interactive-card motion for selectable book cards.

### Flashcards and review

Target:

- `components/flashcards/flashcard-grid.tsx`
- `components/flashcards/flip-flashcard-reviewer.tsx`
- `components/practice/practice-runner.tsx`
- `components/practice/sentence-puzzle.tsx`

Implement:

- Refine the flip timing so the first half is quick and the landing is soft.
- Show correct-answer feedback with a restrained pop.
- Shake an incorrect answer once, then return to rest.
- Animate score changes without shifting surrounding layout.
- Move sentence-puzzle tokens to their new state when selected or returned.
- Keep continuous flame and energy animations subtle and pause them under reduced motion.

### Shadowing

Target `components/shadowing/shadowing-player.tsx`.

Implement:

- Reveal a prepared player with a short fade and upward movement.
- Morph the selected recent-video play control into its loading state.
- Animate successful recent-video reordering.
- Briefly highlight the active transcript segment.
- Animate sentence progress over approximately 250 ms.
- Provide a subtle preview highlight before autoplay moves to the next sentence.
- Give the header penguin a single entrance animation on page load.

Do not continuously animate the mascot while the learner is watching or repeating a sentence.

### Forms and dialogs

Target shared form controls and feature dialogs.

- Preserve existing dialog fade and scale behavior.
- Animate validation-message height and opacity.
- Use error shake only after a failed submission.
- Show a brief success confirmation before closing when the server request succeeds.
- Crossfade button states such as `Save`, loading, and `Saved`.

## Phase 4: Achievement motion

Reserve strong animation for:

- Daily goal completion.
- Streak milestones.
- Rank promotion.
- Practice-session completion.
- A flashcard becoming mastered.

Use the smallest celebration that communicates the achievement:

| Achievement | Recommended feedback |
| --- | --- |
| Correct answer | Score pop or brief highlight |
| Daily goal complete | Badge pop and short mascot reaction |
| Flashcard mastered | Card accent and mastery badge entrance |
| Streak milestone | Flame reaction and compact celebration panel |
| Rank promotion | Rank panel, controlled particles, optional confetti |

Confetti should play once and stop. It should not appear for routine saves or navigation.

## Reduced-motion behavior

All new motion must support `prefers-reduced-motion: reduce`.

Under reduced motion:

- Remove translation, scaling, rotation, bobbing, and confetti.
- Keep immediate opacity or color changes when they communicate state.
- Preserve loading indicators in a reduced form.
- Show final progress values without animated travel.
- Keep focus and validation feedback visible.

Suggested global rule:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Review this rule against loaders before adoption. Some loaders may need a separate accessible static state instead of being globally shortened.

## Performance constraints

- Prefer `transform` and `opacity` animations.
- Avoid animating width, height, top, or left when a transform can produce the same result.
- Use height animation only for small validation or disclosure regions.
- Avoid large blurred shadows during continuous animation.
- Do not animate large lists simultaneously.
- Cap initial list staggers at approximately six visible items.
- Pause or remove offscreen continuous animations.
- Test low-width mobile layouts and CPU-throttled development builds.

## Delivery plan

### PR 1: Motion foundation

- Add tokens and shared keyframes.
- Add reduced-motion behavior.
- Improve buttons, interactive cards, checkboxes, and progress bars.
- Add Storybook examples for shared component states.

### PR 2: Navigation and dashboard

- Add navigation feedback and mobile-sidebar motion.
- Add coordinated page entrances.
- Animate dashboard values and progress updates.

### PR 3: Learning interactions

- Refine flashcards, review feedback, sentence puzzles, and Shadowing.
- Add list insertion, deletion, and reordering feedback.

### PR 4: Achievements

- Consolidate streak, XP, rank, and completion celebrations.
- Ensure large effects play only once per qualifying event.

## Verification plan

For every phase:

1. Run ESLint, TypeScript, and the production build.
2. Review interactive states in Storybook where stories exist.
3. Test keyboard navigation and visible focus during animation.
4. Test with reduced motion enabled at the operating-system level.
5. Check mobile, tablet, and desktop widths.
6. Verify that content does not shift when loading states resolve.
7. Confirm that repeated renders do not replay entrance or celebration effects.
8. Inspect performance while throttling the CPU in browser developer tools.

## Acceptance criteria

- Every direct user action provides visible feedback within 100 ms.
- Page and panel transitions finish within 320 ms.
- Motion does not delay navigation, form submission, or data updates.
- Loading, success, failure, insertion, and removal have distinct feedback.
- Repeated actions do not replay large page-entry effects.
- Continuous animation is limited to loaders and small ambient elements.
- New animations use shared timing and easing tokens.
- Reduced-motion users receive clear state changes without unnecessary movement.
- Mobile layouts remain stable and responsive during transitions.
- Animation does not introduce measurable layout shift.

## Recommended starting scope

Begin with the shared foundation, Dashboard, and Shadowing. This creates visible improvement quickly and establishes reusable patterns before changing the more complex flashcard and practice flows.
