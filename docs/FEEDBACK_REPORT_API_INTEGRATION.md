# Feedback and report API integration

Backend source: local `FLENVN/src/submissions/`. This contract is implemented locally and has **not been deployed to staging**. The backend needs the `CreateSubmissions1723260000000` and `AddSubmissionEvidenceAndStatus1723270000000` migrations before these routes can persist submissions.

## Authentication and response shape

All routes below are under `/api/v1` and require the normal JWT bearer token. The frontend `http` helper in `lib/http.ts` adds that token and maps `/api/...` to `/api/v1/...`. The Nest response interceptor wraps successful responses as:

```json
{ "success": true, "data": {}, "timestamp": "2026-10-17T00:00:00.000Z" }
```

Read the value from `response.data`. Do not send a user ID; the backend uses the authenticated account.

## Upload evidence image directly to S3

1. Validate the selected file in the browser: JPEG, PNG, or WebP. The presign route checks content type. Keep files within 5 MB as a product rule; the presigned S3 PUT currently does not enforce a size limit.
2. Request a presigned upload:

```http
POST /api/v1/submissions/evidence-image
Content-Type: application/json
Authorization: Bearer <token>

{ "contentType": "image/png", "fileName": "screenshot.png" }
```

`data` contains `{ "uploadUrl": "...", "fileUrl": "...", "objectKey": "...", "expiresIn": 3600 }`. The server fixes the folder to `images/submissions/<authenticated-user-id>/`.

3. Upload the file to `uploadUrl` with a direct `PUT` request from the browser. Set `Content-Type` to the same value passed in step 2 and use the file as the request body. Do **not** attach the app bearer token to this S3 request. Treat non-2xx as a failed upload. S3 bucket CORS must allow the web app origin, `PUT`, and the `Content-Type` header.
4. After the PUT succeeds, send `fileUrl` as `evidenceImageUrl` when creating feedback or a report. The backend checks that this URL belongs to the signed-in user's evidence folder. Evidence is optional; one image is supported per submission.

The existing `uploadCover` flow in `components/books/edit-book-dialog.tsx` is the closest client-side example. Use `/api/submissions/evidence-image` with `http.post` for this feature. The current helper calls the API directly from the browser, so staging CORS must allow the web origin.

## Create a submission

```http
POST /api/v1/feedback
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "Suggestion",
  "message": "Please add keyboard shortcuts",
  "evidenceImageUrl": "https://<bucket>.s3.<region>.amazonaws.com/images/submissions/<user-id>/<key>.png"
}
```

Use `POST /api/v1/reports` with the same body for bug reports. `message` is required, 1–5000 characters, and cannot be blank after trimming. `subject` is optional and at most 150 characters. `evidenceImageUrl` is optional. The response `data` contains the saved submission with `id`, `type` (`feedback` or `report`), `subject`, `message`, `evidenceImageUrl`, `status` (`pending` initially), and `createdAt`.

## Show the user's status

```http
GET /api/v1/submissions/mine
GET /api/v1/submissions/mine/<uuid>
```

The list returns only the signed-in user's submissions, newest first. The detail route returns `404` for a missing submission or one owned by another user. Status values are `pending`, `in_review`, `resolved`, and `rejected`. No polling or push updates exist; refresh the list when the user opens it or after creating a submission.

Admins can list all submissions with `GET /api/v1/submissions` and update one with `PATCH /api/v1/submissions/<uuid>/status`, body `{ "status": "in_review" }`. These are admin-only routes and do not belong in the normal user UI.

## Suggested frontend work

- Add a feedback/report form with type selection, subject, message, and an optional image picker.
- Disable submit while presigning, uploading, or creating the submission; show the error for the stage that failed. If S3 PUT fails, do not create the submission with an image URL.
- Add a “My feedback and reports” view showing type, subject/message preview, creation date, evidence image, and status. Use `GET /submissions/mine`; open detail with the ID route if needed.
- Reuse `lib/http.ts` and the shared form, button, and status components. The HTTP helper already adds the bearer token and unwrap only when consuming `data`.
- Check the backend staging deployment and migrations before enabling the UI against staging.

## Manual verification after staging deploy

1. Sign in, request a presigned PNG URL, and PUT a small image to S3 with the matching `Content-Type`.
2. Create feedback with the returned `fileUrl`; confirm status `pending` and the image URL in `GET /submissions/mine`.
3. Create a report without an image; confirm it appears in the same list.
4. Confirm a second user cannot fetch the first user's submission by ID or attach the first user's image URL.
5. Update status as an admin; confirm the owner sees the new status after refresh.
