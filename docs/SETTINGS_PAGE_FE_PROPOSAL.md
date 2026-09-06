# Settings Page - FE Implementation Proposal

## Summary

Build a responsive `/settings` page where an authenticated user can manage:

- Profile information and avatar
- Daily learning goal and timezone
- Password
- Session-level account actions such as logout

The page should use independent forms for each settings section. A profile
failure must not block learning-goal or password actions, and there should not
be one global Save button.

## Scope

### MVP

- Load the current profile and streak settings.
- Update username, email, and avatar.
- Update daily score target and timezone.
- Change password.
- Show email verification status.
- Log out from the current device.
- Support desktop and mobile layouts.

### Not in MVP

- Notification scheduling
- Theme synchronization across devices
- Application-language preference
- Resend email verification
- Active-device management or logout from all devices
- Export data
- Self-service account deletion

Do not render non-functional controls for deferred features.

## Route and Navigation

Add an authenticated route:

```text
/settings
```

Add a Settings entry to the authenticated user menu. Preserve the selected
section in the URL so navigation and browser history work:

```text
/settings?section=profile
/settings?section=learning
/settings?section=security
/settings?section=account
```

If the query value is absent or invalid, default to `profile`.

## Recommended Layout

Desktop:

```text
+-----------------------------------------------------------+
| Settings                                                  |
| Manage your profile and learning preferences              |
+-----------------+-----------------------------------------+
| Profile         | Section title                           |
| Learning goal   | Section description                     |
| Security        |                                         |
| Account         | Form/card content                       |
|                 |                                         |
|                 |                         Cancel   Save    |
+-----------------+-----------------------------------------+
```

Mobile:

- Use a compact section selector or tabs below the title.
- Render one section at a time.
- Keep actions visible at the bottom of the section, but do not cover fields
  when the keyboard is open.

Recommended content width: `720px` maximum. Use the existing application shell,
spacing scale, form controls, buttons, cards, toast system, and breakpoints.

## API Conventions

Base path:

```text
/api/v1
```

Authenticated requests require:

```http
Authorization: Bearer <access_token>
```

The backend wraps successful responses:

```ts
type ApiResponse<T> = {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
};
```

The examples below show the value inside `data`.

## FE Types

Keep API models separate from editable form models.

```ts
type UserRank = {
  key: string;
  title: string;
  description: string;
  level: number;
  minExp: number;
  maxExp: number | null;
};

type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  avatar: string;
  isEmailVerified: boolean;
  level: number;
  exp: number;
  streak: number;
  longestStreak: number;
  dailyScoreTarget: number;
  pendingDailyScoreTarget: number | null;
  targetEffectiveDate: string | null;
  timezone: string;
  lastActive: string | null;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  rank: UserRank;
};

type StreakStatus = {
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

type ProfileFormValues = {
  username: string;
  email: string;
  avatar: string;
};

type LearningGoalFormValues = {
  dailyTarget: number;
  timezone: string;
};

type PasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};
```

The exact `UserRank` properties should reuse the existing profile/auth type in
the FE if one already exists. Do not create a second incompatible user model.

## Initial Page Loading

Fetch profile and streak status in parallel:

```http
GET /api/v1/users/profile
GET /api/v1/streak
```

Recommended behavior:

- Show section-aware skeletons during the first load.
- Render a section when its own request succeeds; do not wait for the other
  request.
- Give each failed request its own Retry action.
- On `401`, run the existing refresh-token flow once. If refresh fails, clear
  auth state and redirect to login with a return URL for `/settings`.
- Do not refetch profile and streak on every section switch when cached data is
  still fresh.

Suggested query keys:

```ts
const settingsKeys = {
  profile: ['settings', 'profile'] as const,
  streak: ['settings', 'streak'] as const,
};
```

Adapt this convention to the FE data library already in use.

## Profile Section

### Content

- Avatar
- Username
- Email
- Email verification badge
- Read-only level, rank, EXP, and current streak summary

### Load profile

```http
GET /api/v1/users/profile
```

### Update profile

```http
PUT /api/v1/users/profile
Content-Type: application/json
```

Request:

```ts
type UpdateProfileRequest = {
  username?: string;
  email?: string;
  avatar?: string;
};
```

Example:

```json
{
  "username": "bill",
  "email": "bill@example.com",
  "avatar": "https://bucket.s3.region.amazonaws.com/avatars/user-id/avatar.jpg"
}
```

Client validation:

- Username: 3-255 characters.
- Email: valid email, maximum 255 characters.
- Avatar: HTTPS URL, maximum 255 characters after upload.
- Trim username and email before comparing or submitting.
- Disable Save until the form is valid and dirty.

Submit only changed fields. When the email changes, the response will have
`isEmailVerified: false`. Update that badge immediately and explain that the new
address requires verification. Saving the same email does not reset the status.

### Avatar upload flow

Allow JPEG, PNG, and WebP images. Validate the selected file against the current
FE/backend upload-size policy before requesting an upload URL.

1. User selects a file.
2. FE validates MIME type and size.
3. FE creates an object URL for immediate local preview.
4. FE requests a presigned upload URL.
5. FE uploads the raw file with `PUT` to S3.
6. FE sends the returned `fileUrl` in the profile update.
7. FE replaces the local preview with the saved URL.

Presign request:

```http
POST /api/v1/uploads/presign-image
Content-Type: application/json
```

```json
{
  "contentType": "image/jpeg",
  "fileName": "avatar.jpg",
  "folder": "avatars"
}
```

Presign response data:

```ts
type PresignedImageUpload = {
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  expiresIn: number;
};
```

Upload request:

```ts
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file,
});
```

Do not attach the application bearer token to the S3 request. Revoke every
created object URL with `URL.revokeObjectURL` when it is replaced or the
component unmounts.

Avatar states:

- Idle
- Preview selected
- Uploading with progress/spinner
- Upload failed with Retry and Remove
- Uploaded but profile save pending
- Saved

If profile saving fails after upload, keep the uploaded `fileUrl` in form state
so the user can retry without uploading the file again.

### Cache and auth-state update

After a successful profile update:

- Replace the profile query cache with the returned user.
- Update the shared authenticated user used by the header/avatar.
- Reset the form's dirty baseline.
- Show a concise success toast.

Avoid a full page reload.

## Learning Goal Section

### Content

- Today's progress and current streak
- Current daily target
- Target presets: 50, 100, and 200
- Custom target input
- Timezone selector
- Pending target notice

### Load status

```http
GET /api/v1/streak
```

### Update settings

```http
PATCH /api/v1/streak/settings
Content-Type: application/json
```

```ts
type UpdateStreakSettingsRequest = {
  dailyTarget?: number;
  timezone?: string;
};

type UpdateStreakSettingsResponse = {
  dailyTarget: number;
  nextDailyTarget: number | null;
  effectiveDate: string | null;
  timezone: string;
};
```

Validation:

- Daily target must be an integer from 10 through 20,000.
- Timezone must be an IANA name, for example `Asia/Bangkok`.
- Use `Intl.supportedValuesOf("timeZone")` when available, with a maintained
  fallback list for older browsers.

Target changes become effective on the following day in the selected timezone.
After saving, show:

```text
Your target will change to 200 points on September 6.
```

Use `nextDailyTarget` and `effectiveDate` from the response rather than
calculating the date in the browser. Refetch streak status after the mutation so
the progress card and pending notice share one source of truth.

When the user only changes timezone, omit `dailyTarget` to avoid scheduling the
same target again.

## Security Section

### Change password

```http
POST /api/v1/users/change-password
Content-Type: application/json
```

```json
{
  "oldPassword": "currentSecret123",
  "newPassword": "newSecret123",
  "confirmPassword": "newSecret123"
}
```

Client validation:

- All fields are required.
- Each value must contain at least eight characters.
- New password and confirmation must match.
- New password must differ from the current password.
- Do not trim password values.

UX requirements:

- Use `autocomplete="current-password"` for the current password.
- Use `autocomplete="new-password"` for both new-password fields.
- Provide accessible show/hide buttons.
- Clear all password values after success.
- Never store password values in global state, URL state, analytics, or logs.
- Map an incorrect current password to the current-password field.

Success message:

```text
Password changed successfully.
```

## Account Section

MVP content:

- Current email
- Verified or Not verified badge
- Current-device Logout button
- Terms and Privacy links when their destinations exist
- Application version if it is already exposed by the FE build

Logout should use the existing auth logout action. Clear credentials and
sensitive cached queries, then navigate to the login screen. Do not add a
Delete Account button: the current deletion endpoint is admin-only.

## Component Breakdown

Names are illustrative and should follow the frontend repository conventions.

```text
SettingsPage
|-- SettingsHeader
|-- SettingsSectionNav
|-- ProfileSettingsSection
|   |-- AvatarUploader
|   |-- ProfileForm
|   `-- LearningIdentitySummary
|-- LearningGoalSettingsSection
|   |-- DailyProgressSummary
|   |-- DailyTargetPicker
|   `-- TimezoneSelect
|-- SecuritySettingsSection
|   `-- ChangePasswordForm
`-- AccountSettingsSection
    |-- VerificationStatus
    `-- LogoutAction
```

Shared building blocks:

- `SettingsSectionCard`
- `FormActions`
- `FieldError`
- `SaveStatus`
- `ConfirmDiscardDialog`

Keep API hooks/services outside presentational components.

## State Ownership

Use server state for profile and streak responses, local form state for edits,
and the existing auth store for the current user/token.

Do not copy server responses into a new global settings store. Initialize each
form when its query succeeds, and reset its baseline after a mutation succeeds.

Track avatar upload state separately from profile mutation state:

```ts
type AvatarUploadState =
  | { status: 'idle' }
  | { status: 'preview'; previewUrl: string; file: File }
  | { status: 'uploading'; previewUrl: string }
  | { status: 'uploaded'; previewUrl: string; fileUrl: string }
  | { status: 'error'; previewUrl: string; message: string };
```

## Error Handling

Normalize backend errors in the API layer and expose a user-facing message plus
status code.

| Condition                         | FE behavior                                              |
| --------------------------------- | -------------------------------------------------------- |
| `400` validation error            | Show field error when identifiable; otherwise form alert |
| `401`                             | Refresh once, then log out if refresh fails              |
| `409` duplicate email             | Attach `Email is already in use` to email field          |
| Presign failure                   | Keep local preview and offer Retry                       |
| S3 upload failure                 | Keep selected file and offer Retry/Remove                |
| Profile save failure after upload | Keep uploaded URL and offer Save again                   |
| Network offline                   | Preserve form values and show retryable error            |
| Unexpected `5xx`                  | Form alert plus non-destructive Retry                    |

Avoid showing raw stack traces or opaque transport messages.

## Unsaved Changes

- Warn before internal section navigation when the current form is dirty.
- Warn before browser navigation/refresh when a form is dirty or an avatar is
  uploading.
- Cancel resets the active form to the latest successful server value.
- Do not warn after a successful save.
- Password fields should be cleared when the user confirms leaving Security.

## Accessibility

- Use a single page-level `h1` and logical section headings.
- Associate every input with a visible label and its error description.
- Ensure section navigation is keyboard accessible and exposes active state.
- Announce save success and form errors through an `aria-live` region.
- Avatar controls must have text labels, not icon-only meaning.
- Do not rely on color alone for verification, error, or success states.
- Move focus to the first invalid field after submit.

## Responsive and Visual States

Implement and review these states:

- Initial skeleton
- Loaded and unchanged
- Dirty form
- Saving
- Save success
- Field validation failure
- API failure
- Avatar upload in progress/failure
- Pending daily target
- Verified and unverified email
- Auth session expired
- Empty username using a safe display fallback

## Analytics

If the project already has product analytics, recommended events are:

```text
settings_opened                 { section }
settings_section_changed        { from, to }
profile_update_succeeded        { changedFields[] }
profile_update_failed           { statusCode }
avatar_upload_succeeded         { mimeType, sizeBucket }
learning_goal_update_succeeded  { usedPreset, timezoneChanged }
password_change_succeeded
```

Never include email addresses, usernames, passwords, signed upload URLs, or raw
error bodies in analytics.

## Suggested File Organization

Adapt paths to the FE framework:

```text
features/settings/
|-- api/
|   |-- settings.api.ts
|   `-- settings.types.ts
|-- components/
|   |-- AvatarUploader.tsx
|   |-- DailyTargetPicker.tsx
|   |-- ProfileSettingsSection.tsx
|   |-- LearningGoalSettingsSection.tsx
|   |-- SecuritySettingsSection.tsx
|   `-- AccountSettingsSection.tsx
|-- hooks/
|   |-- useProfileSettings.ts
|   |-- useStreakSettings.ts
|   `-- useAvatarUpload.ts
|-- validation/
|   `-- settings.schemas.ts
`-- SettingsPage.tsx
```

## Implementation Sequence

1. Add API types, response unwrapping, and settings API functions.
2. Add the authenticated route and responsive settings shell.
3. Implement profile query/form without avatar upload.
4. Implement avatar presign/upload/save flow.
5. Implement streak query and learning-goal form.
6. Implement password form.
7. Implement account details and logout.
8. Add dirty-navigation protection and error mapping.
9. Add unit/component tests and end-to-end happy paths.
10. Perform responsive and accessibility QA.

## Test Plan

### Unit/component tests

- Maps API responses into form defaults.
- Disables Save when a form is unchanged or invalid.
- Submits only changed profile fields.
- Rejects invalid email, username, avatar file, target, and timezone.
- Resets verification UI after changed email response.
- Does not reset verification when email is unchanged.
- Displays pending target/effective date from the server.
- Does not submit target when only timezone changed.
- Clears password fields after success.
- Maps duplicate email and wrong current password to their fields.

### Avatar integration tests

- Presign -> S3 PUT -> profile update succeeds.
- Presign failure can be retried.
- Upload failure can be retried without choosing the file again.
- Profile save failure can be retried without uploading again.
- Bearer token is not sent to the S3 URL.

### End-to-end tests

- Authenticated user opens `/settings` and sees profile data.
- User changes username and sees it update in the application header.
- User uploads and saves a new avatar.
- User changes email and sees Not verified status.
- User schedules a new daily target and sees its effective date.
- User changes timezone.
- User changes password and receives success feedback.
- User logs out from the account section.
- Expired authentication follows the refresh or logout flow.

## Definition of Done

- `/settings` is protected and reachable from authenticated navigation.
- Profile and streak data load independently with retry states.
- Username, email, and avatar can be updated.
- Header/auth user data updates without a page reload.
- Daily target and timezone can be updated with pending-target messaging.
- Password can be changed without exposing secret values.
- Current-device logout works and clears sensitive cache.
- Dirty forms are protected from accidental navigation.
- Mobile, desktop, keyboard, loading, error, and success states are verified.
- Automated tests cover primary success flows and recoverable failures.

## Backend Readiness

Available now:

- `GET /api/v1/users/profile`
- `PUT /api/v1/users/profile`, including HTTPS avatar URL
- `POST /api/v1/uploads/presign-image`
- `GET /api/v1/streak`
- `PATCH /api/v1/streak/settings`
- `POST /api/v1/users/change-password`

Backend work required only for deferred features such as resend verification,
notifications, logout-all, export, and self-service account deletion.
