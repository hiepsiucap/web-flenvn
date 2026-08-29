# Practice Game Flow - FE Controlled Proposal

## Summary

The frontend will control practice game generation and runtime gameplay.

The backend should provide raw flashcard data and review/session endpoints. FE will use those fields to create multiple game mechanisms per flashcard before gameplay starts.

Main goal:

- Avoid runtime delay while the user is playing.
- Keep game mechanics easy to change in FE.
- Keep BE focused on data, due-card selection, sessions, and spaced repetition updates.

## Runtime Principle

Do not require a backend request between individual games.

Preferred flow:

1. User selects a book and number of due cards.
2. FE fetches due flashcards once.
3. FE optionally fetches a larger flashcard pool from the same book for quiz distractors.
4. FE generates all game steps locally.
5. FE preloads images/audio before or during the start screen.
6. User plays all games smoothly.
7. FE sends session/review updates in the background or after each flashcard.

Avoid this during gameplay:

```text
answer game -> wait for BE -> receive next game
```

Prefer this:

```text
fetch practice data -> generate games locally -> play without waiting -> sync results
```

## Required Flashcard Fields

FE needs these fields from BE for practice games:

```ts
type Flashcard = {
  id: string;
  word: string;
  translation?: string | null;
  definition?: string | null;
  pronunciation?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  example?: string | null;
  exampleTranslation?: string | null;
  exampleAudioUrl?: string | null;
  bookId: string;
  status?: "new" | "learning" | "reviewing" | "mastered";
};
```

Important:

- `audioUrl` is used for word listening.
- `exampleAudioUrl` is used for sentence/example listening or display.
- `imageUrl` and `audioUrl` are gathered into one media input game.
- `example` is used for blank-word quiz.
- `definition` is the main prompt for definition-to-word input.
- `translation` is shown as an optional subtitle beneath the definition.

## Current Practice Games

Each flashcard can produce up to 3 games.

### 1. Definition Input

Prompt:

- Show `definition` as the main prompt.
- Show `translation` beneath it as a subtitle when available.

Answer:

- User types `word`.

Mechanism:

```ts
"input"
```

Example:

```ts
{
  id: "definition-input",
  mechanism: "input",
  promptType: "definition",
  answerType: "word"
}
```

### 2. Example Blank Quiz

Prompt:

- Show `example`, but replace the target `word` with a blank.

Answer:

- User chooses from 4 options.

Mechanism:

```ts
"quiz"
```

Example:

```ts
{
  id: "example-blank-quiz",
  mechanism: "quiz",
  promptType: "example-blank",
  answerType: "word"
}
```

### 3. Media Input

Prompt:

- Show `imageUrl` and play `audioUrl` when both are available.
- Show or play the available medium when only one exists.

Answer:

- User types `word`.

Mechanism:

```ts
"input"
```

Example:

```ts
{
  id: "media-input",
  mechanism: "input",
  promptType: "media",
  answerType: "word"
}
```

## FE Game Model

FE can model game steps like this:

```ts
type GameMechanism = "input" | "quiz" | "buzz";

type PracticePromptType =
  | "definition"
  | "example-blank"
  | "media"
  | "example-audio";

type PracticeGame = {
  id: string;
  flashcardId: string;
  mechanism: GameMechanism;
  promptType: PracticePromptType;
  answer: string;
  acceptedAnswers?: string[];
  choices?: string[];
};
```

The game mechanism controls the UI:

- `input`: user types an answer.
- `quiz`: user chooses one answer from options.
- `buzz`: future mechanism for speed/tap-based answer flow.

The prompt type controls what the user sees or hears.

## Quiz Distractors

For `quiz` games, FE needs 4 choices:

- 1 correct answer.
- 3 distractors.

Initial FE-controlled approach:

1. Use other flashcards from the selected practice batch.
2. If not enough choices exist, use other flashcards from the same book.
3. If still not enough choices exist, skip that quiz game or fall back to input.

Recommended BE support:

- Existing book flashcard list is enough for Phase 1.
- No special quiz-generation endpoint is required yet.

Optional future BE endpoint:

```http
GET /api/v1/flashcards/distractors?bookId=<bookId>&excludeId=<flashcardId>&limit=3
Authorization: Bearer <access_token>
```

But this should be optional and preloaded before gameplay if added.

## Missing Data Rules

FE should only create games when the required source field exists.

```ts
definition-input requires definition
example-blank-quiz requires example
media-input requires imageUrl or audioUrl
example-audio games require exampleAudioUrl
```

If a field is missing, FE skips that game for the flashcard.

Example:

- Flashcard has neither `imageUrl` nor `audioUrl`.
- FE does not generate `media-input`.
- User still plays the other valid games.

## Answer Validation

Phase 1 validation can happen in FE.

Suggested normalization:

```ts
function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}
```

Correct when:

```ts
normalizeAnswer(userAnswer) === normalizeAnswer(card.word)
```

Future BE can add accepted answers if needed:

```ts
acceptedAnswers: ["run", "to run"]
```

## Session Recording

For every answered game, FE may record a session:

```http
POST /api/v1/sessions/flashcard/<flashcardId>
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "type": "practice",
  "result": "correct",
  "responseTime": 1200,
  "score": 10
}
```

Allowed result values:

```text
correct | incorrect | skipped
```

FE can send these requests in the background so gameplay does not block.

## Review Schedule Update

After all games for one flashcard are completed, FE updates the spaced repetition state:

```http
POST /api/v1/flashcards/<flashcardId>/review
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "quality": 4
}
```

Suggested mapping:

Quality is calculated from the percentage correct so it works consistently when a
flashcard produces fewer than 3 games.

Example:

```text
100% correct: 5
75%+ correct: 4
50%+ correct: 3
below 50%: 1
skipped: 0
```

## Backend Responsibilities

Backend should support:

1. Return due books with due review counts.
2. Return selected due flashcards with all required raw fields.
3. Return book flashcards if FE needs a distractor pool.
4. Record flashcard practice sessions.
5. Update flashcard review schedule.

Backend does not need to generate games in Phase 1.

## Frontend Responsibilities

Frontend will:

1. Generate game steps from raw flashcards.
2. Create quiz choices.
3. Skip games when required data is missing.
4. Preload images/audio.
5. Render reusable mechanisms:
   - input
   - quiz
   - buzz later
6. Track response time and correctness.
7. Submit sessions and review updates without blocking gameplay.

## Recommended Phase 1 API Contract

No new game endpoint is required.

Required existing/new fields in flashcard response:

```json
{
  "id": "flashcard-id",
  "word": "example",
  "partOfSpeech": "noun",
  "pronunciation": "...",
  "definition": "...",
  "translation": "...",
  "audioUrl": "...",
  "imageUrl": "...",
  "example": "...",
  "exampleTranslation": "...",
  "exampleAudioUrl": "...",
  "status": "new",
  "bookId": "book-id"
}
```

Key request:

```http
GET /api/v1/flashcards/review/due?bookId=<bookId>&limit=<number>
Authorization: Bearer <access_token>
```

Optional distractor source:

```http
GET /api/v1/flashcards?bookId=<bookId>
Authorization: Bearer <access_token>
```

## Future Backend-Controlled Option

If game rules become stable later, BE can provide a batched game payload:

```http
GET /api/v1/practice/games?bookId=<bookId>&limit=<number>
Authorization: Bearer <access_token>
```

Important:

- This endpoint must return all games upfront.
- FE should not call BE between individual games.
- Media URLs and choices must be included before gameplay starts.

This can be Phase 2 or Phase 3, not required for the first implementation.
