# Flashcard Labels - FE Integration Proposal

## Summary

The backend now classifies flashcards asynchronously and attaches labels that
can be displayed and used for filtering.

Each flashcard can contain:

- Topic labels, such as `Technology` or `Travel`
- One CEFR level label, such as `A2` or `B1`
- Usage labels, such as `Formal` or `Conversational`
- User-created custom labels

Existing production flashcards have been backfilled. New flashcards are queued
for classification automatically unless they are created with
`autoLabel: false`.

## Backend Status

Available in production:

- Async labeling through SQS and Vertex AI
- Labels returned by flashcard endpoints
- Labels returned for flashcards embedded in book endpoints
- Label listing with flashcard counts
- Filtering flashcards by labels
- Replacing a flashcard's labels manually
- Retrying failed automatic labeling

## Label Types

```ts
type LabelType = "topic" | "level" | "usage" | "custom";
type LabelSource = "manual" | "gemini" | "system";
type LabelingStatus = "pending" | "processing" | "completed" | "failed";
```

## FE Types

```ts
type FlashcardLabel = {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  type: LabelType;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  source: LabelSource;
  confirmedByUser: boolean;
};

type FlashcardWithLabels = Flashcard & {
  labelingStatus: LabelingStatus;
  labelingVersion: number;
  labelingAttempts: number;
  labelingQueuedAt: string | null;
  labeledAt: string | null;
  labels: FlashcardLabel[];
};
```

All successful API responses use the existing envelope:

```ts
type ApiResponse<T> = {
  success: true;
  data: T;
  timestamp: string;
};
```

## Where Labels Are Returned

### Books list

```http
GET /api/v1/books
Authorization: Bearer <access_token>
```

Read labels from:

```ts
response.data[bookIndex].flashcards[flashcardIndex].labels;
```

### Book details

```http
GET /api/v1/books/:bookId
Authorization: Bearer <access_token>
```

Read labels from:

```ts
response.data.flashcards[flashcardIndex].labels;
```

### Flashcards list

```http
GET /api/v1/flashcards?bookId=:bookId
Authorization: Bearer <access_token>
```

Read labels from:

```ts
response.data[flashcardIndex].labels;
```

### One flashcard

```http
GET /api/v1/flashcards/:flashcardId
Authorization: Bearer <access_token>
```

Read labels from:

```ts
response.data.labels;
```

Example flashcard fields:

```json
{
  "id": "7da9c6ab-6fb7-4357-9aba-d12f0509a051",
  "word": "highlight",
  "labelingStatus": "completed",
  "labeledAt": "2026-09-05T14:31:38.496Z",
  "labels": [
    {
      "id": "label-id",
      "name": "Arts & Entertainment",
      "normalizedName": "arts & entertainment",
      "type": "topic",
      "color": null,
      "source": "gemini",
      "confirmedByUser": false
    },
    {
      "id": "level-id",
      "name": "B1",
      "normalizedName": "b1",
      "type": "level",
      "color": null,
      "source": "gemini",
      "confirmedByUser": false
    }
  ]
}
```

Do not read the internal `labelLinks` relationship. The public field is
`labels`.

## Recommended Flashcard UI

Display a compact label row below the word or translation:

```text
highlight
điểm sáng

[Arts & Entertainment] [B1] [Conversational]
```

Recommended visual hierarchy:

- Level: small high-contrast badge
- Topic: neutral or primary-tinted badge
- Usage: outlined badge
- Custom: use `label.color` when available

Keep label names readable and do not rely only on color to communicate type.

For compact cards:

- Show up to three labels.
- Show `+N` when more labels exist.
- Reveal the full list in details, a tooltip, or an accessible popover.
- Preserve the backend order or group by `level`, `topic`, `usage`, then
  `custom`.

## Async Labeling States

The create/update response may arrive before AI labels are available. Render
using `labelingStatus`:

| Status       | Recommended UI                                         |
| ------------ | ------------------------------------------------------ |
| `pending`    | Small `Labeling…` indicator                            |
| `processing` | Small spinner and `Generating labels…`                 |
| `completed`  | Display `labels`; show nothing when the array is empty |
| `failed`     | `Labels unavailable` and a Retry action                |

Do not block flashcard creation, editing, or study while labeling is pending.

### Polling recommendation

After creating or updating a flashcard, poll only while its status is `pending`
or `processing`:

```text
GET /api/v1/flashcards/:id
```

Recommended schedule:

- Poll every 2 seconds.
- Stop when status becomes `completed` or `failed`.
- Stop after 30 seconds and show a quiet background-processing state.
- Refetch when the window regains focus or the user revisits the book.

Avoid polling the complete books collection every two seconds. Poll the single
flashcard endpoint, then merge the returned flashcard into local/query state.

## Retry Failed Labeling

```http
POST /api/v1/flashcards/:flashcardId/labels/retry
Authorization: Bearer <access_token>
```

The backend accepts retry only when `labelingStatus` is `failed`.

After a successful retry:

1. Change the local status to `pending` using the response.
2. Disable the Retry button.
3. Start single-flashcard polling.
4. Replace local labels when processing completes.

## List Labels and Counts

Use this endpoint to build filter controls:

```http
GET /api/v1/labels?includeCounts=true
Authorization: Bearer <access_token>
```

Example:

```json
{
  "success": true,
  "data": [
    {
      "id": "label-id",
      "name": "Technology",
      "type": "topic",
      "color": null,
      "totalCards": 8,
      "dueCards": 3
    }
  ]
}
```

Recommended filter UI:

- Group options by Topic, Level, Usage, and Custom.
- Display `totalCards` beside each option.
- Optionally display `dueCards` in review-entry screens.
- Keep selected label IDs in URL search parameters.
- Allow clearing all label filters.

## Filter Flashcards

Match any selected label:

```http
GET /api/v1/flashcards?bookId=:bookId&labelIds=:id1,:id2&labelMode=any
```

Require every selected label:

```http
GET /api/v1/flashcards?bookId=:bookId&labelIds=:id1,:id2&labelMode=all
```

```ts
type LabelFilterMode = "any" | "all";
```

Use `any` as the default. Encode IDs with `URLSearchParams` rather than manually
building query strings.

The same filters are supported for due-review cards:

```http
GET /api/v1/flashcards/review/due?bookId=:bookId&labelIds=:id1,:id2&labelMode=any
```

## Manual Label Editing

### List available labels

```http
GET /api/v1/labels
```

### Create a custom label

```http
POST /api/v1/labels
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "name": "Interview",
  "type": "custom",
  "color": "#2563EB"
}
```

### Replace labels on a flashcard

```http
PUT /api/v1/flashcards/:flashcardId/labels
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "labelIds": ["label-id-1", "label-id-2"]
}
```

Important behavior: this endpoint replaces the complete label selection for the
flashcard. FE must initialize the editor with all current label IDs and submit
the full selected set, not only newly added IDs.

After manual replacement, refetch the flashcard or replace its `labels` from the
mutation result. Treat returned labels as user-confirmed selections in the UI.

## Create and Update Behavior

Flashcard creation accepts:

```ts
type CreateFlashcardLabelFields = {
  labelIds?: string[];
  autoLabel?: boolean;
};
```

Recommended default:

```json
{
  "autoLabel": true
}
```

The backend already defaults `autoLabel` to `true`, so FE may omit it unless the
product explicitly gives users an opt-out.

If `labelIds` are supplied during creation, they are saved as manual labels.
Automatic labeling can still run when `autoLabel` is true.

Changes to classification-related flashcard content can trigger a new labeling
version. FE should replace stale label/status data with the update response and
poll if the new status is pending.

## Suggested Components

```text
FlashcardLabelBadges
|-- LabelBadge
`-- OverflowLabelPopover

LabelFilter
|-- LabelTypeGroup
|-- LabelFilterOption
`-- LabelModeControl

FlashcardLabelEditor
|-- SelectedLabelList
|-- LabelCombobox
`-- CreateCustomLabelDialog

LabelingStatus
`-- RetryLabelingButton
```

Suggested feature organization:

```text
features/labels/
|-- api/labels.api.ts
|-- api/labels.types.ts
|-- components/FlashcardLabelBadges.tsx
|-- components/FlashcardLabelEditor.tsx
|-- components/LabelFilter.tsx
|-- components/LabelingStatus.tsx
`-- hooks/useFlashcardLabelPolling.ts
```

Adapt names to the existing FE structure instead of creating a second component
architecture.

## State and Cache Updates

- Cache the label catalog separately from books and flashcards.
- Invalidate label counts after creating/deleting a label or replacing card
  labels.
- Merge completed single-card polling results into the relevant book and
  flashcard caches.
- Do not keep a second global copy of labels when the query cache is already the
  source of truth.
- Clear label filters that reference a deleted label.

Suggested query keys:

```ts
const labelKeys = {
  all: ["labels"] as const,
  catalog: (includeCounts: boolean) =>
    ["labels", "catalog", { includeCounts }] as const,
  flashcard: (id: string) => ["flashcards", id] as const,
};
```

## Error Handling

| Condition                           | FE behavior                                           |
| ----------------------------------- | ----------------------------------------------------- |
| Labels missing but status completed | Render no badges; do not treat as request failure     |
| Status pending/processing           | Show non-blocking progress state                      |
| Retry rejected                      | Refetch flashcard because its status may have changed |
| Invalid/deleted label ID            | Refresh label catalog and preserve valid selections   |
| Label belongs to another user       | Show a generic invalid-selection message              |
| Network failure during polling      | Stop aggressive polling and retry on focus            |
| Unauthorized                        | Use the existing refresh-token/logout flow            |

## Accessibility

- Give each badge readable text.
- Do not communicate label type using color alone.
- Label the overflow control as `Show N more labels`.
- Announce async completion without moving focus.
- Make filter groups and mode controls keyboard accessible.
- Provide text alternatives for pending, completed, and failed states.

## Analytics

If analytics already exists, recommended events are:

```text
label_filter_applied       { labelType, mode, selectedCount }
label_filter_cleared
label_editor_opened
manual_labels_saved       { selectedCount }
labeling_retry_requested
labeling_completed        { labelCount, elapsedBucket }
```

Do not send label IDs, flashcard words, definitions, translations, or signed
URLs to analytics.

## Implementation Order

1. Extend the shared flashcard type with labeling fields and `labels`.
2. Verify response unwrapping for `/books` and `/flashcards`.
3. Render read-only label badges on book-detail flashcards.
4. Add async labeling status and single-card polling.
5. Fetch the label catalog with counts.
6. Add label filtering to flashcard/book views.
7. Add retry for failed jobs.
8. Add manual label editor and custom-label creation.
9. Add component and integration tests.
10. Validate responsive and accessible states.

## Test Plan

### Component tests

- Renders topic, level, usage, and custom labels.
- Shows only three compact labels and a correct overflow count.
- Handles an empty `labels` array.
- Renders each labeling status correctly.
- Retry is available only for failed labeling.
- Filter mode defaults to `any`.
- Manual editor submits the complete selected ID set.

### Integration tests

- `/books` response renders `flashcards[].labels`.
- Newly created pending flashcard polls until completed.
- Polling stops on completed, failed, or timeout.
- Label filters produce correct `labelIds` and `labelMode` parameters.
- Replacing labels refreshes flashcard and label counts.
- Failed polling recovers when the view regains focus.

### End-to-end tests

- User sees AI labels on an existing flashcard.
- User creates a flashcard and sees labels appear asynchronously.
- User filters a book by one or multiple labels.
- User retries a failed classification.
- User creates a custom label and assigns it to a flashcard.

## Definition of Done

- Embedded flashcards from `/books` display their `labels` field.
- Flashcard cards and details display accessible label badges.
- Pending/processing states never block study actions.
- Failed labeling provides a working retry action.
- Users can filter flashcards using `any` and `all` modes.
- Manual label selection submits the complete selected set safely.
- Cache updates keep books, flashcards, and label counts consistent.
- Primary success, empty, pending, failed, and network-error states are tested.
