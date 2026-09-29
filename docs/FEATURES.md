# Features

## Authentication and onboarding

The auth API covers registration, login, email verification, resend, recovery, rotating refresh sessions, logout, and account deletion. Registration initially accepts only email and password; `PATCH /users/profile` then enforces names, a supported gender, and an 18+ real calendar birth date. Legacy accounts without a birth date are kept out of discovery until they provide it. OTPs use keyed HMAC hashes, constant-time comparison, five-attempt invalidation, and resend throttling.

`PATCH /users/permissions`, `/users/profile`, `/users/location`, and `/users/preferences` complete onboarding and support profile edits. Preferences persist stable interest IDs and normalized day/time coffee availability. Reel upload/read/replace/delete supports one validated 8–10 second MP4/MOV/WebM vibe. Stored file extensions derive from MIME type and Docker uses system ffprobe on every CPU architecture.

## Discovery

`GET /feed` returns reciprocal-gender candidates inside a non-bypassable 10-mile radius, including each candidate's normalized or legacy coffee availability so clients can present valid request windows. Bounding-box and exact-distance filtering, cursor pagination, active mutual cooldowns, and blocks are enforced server-side. Availability is preference data, not an exact-match feed filter.

## Coffee, call, and meetup

`POST /reels/:reelId/react/coffee` creates one or more proposed future two-hour windows today with a 30-minute buffer, each fitting both users' selected availability period. Inbox, outbox, and detail expose the proposals and selected window; `POST /requests/:id/respond` confirms or declines. Hour/day quotas run before any paid place lookup and a minute scheduler expires stale windows.

Confirmation enables a request-specific 60-second Agora call whose clock begins when the second participant connects. `POST /requests/:id/decision` records private Yes/No answers afterward. Either No starts a mutual 30-day cooldown. For multi-window requests, the recipient then persists one server-validated proposal through `PATCH /requests/:id/time`; venue planning intentionally remains pending for the later planning stage. Legacy single-window records retain the existing automatic mutual-Yes venue fallback. `POST /requests/:id/cancel` cancels a future locked meetup and notifies the other person.

## Feedback, safety, and notifications

`POST /requests/:id/feedback` opens after the meetup window and records attendance, a 1â€“5 vibe rating, Yes/No/Maybe interest, structured tags, and an optional note. A safety-concern tag requires the client to continue to report/block. Safety routes immediately hide blocked pairs and store moderation reports; administrators can list and close flags without user-onboarding requirements.

Expo push tokens are registered at `/notifications/push-token`. Requests, confirmations, matches, cancellations, and 30-minute reminders carry Expo Router deep-link paths. Reminder rows are conditionally claimed so multiple scheduler replicas cannot send duplicates.

## Operations

`GET /health` checks database readiness. Production uses validated environment configuration, explicit migrations, scoped CORS, proxy-aware throttling, graceful shutdown, and the included Docker image.

Development also exposes a throttled `POST /mail/test` SMTP smoke test. The route returns 404 outside `APP_ENV=development`.
