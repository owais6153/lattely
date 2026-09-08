# Features

## Authentication and onboarding

The auth API covers registration, login, email verification, resend, recovery, rotating refresh sessions, logout, and account deletion. Registration enforces 18+ from birth date. OTPs use keyed HMAC hashes, constant-time comparison, five-attempt invalidation, and resend throttling.

`PATCH /users/permissions`, `/users/profile`, `/users/location`, and `/users/preferences` complete onboarding and support profile edits. Reel upload/read/replace/delete supports one validated 5–60 second MP4/MOV/WebM vibe. Stored file extensions derive from MIME type and Docker uses system ffprobe on every CPU architecture.

## Discovery

`GET /feed` returns reciprocal-gender candidates inside a non-bypassable 10-mile radius. Bounding-box and exact-distance filtering, cursor pagination, active mutual cooldowns, and blocks are enforced server-side. Availability is preference data, not an exact-match filter.

## Coffee, call, and meetup

`POST /reels/:reelId/react/coffee` creates a future two-hour window today with a 30-minute buffer. Inbox, outbox, and detail expose state; `POST /requests/:id/respond` confirms or declines. Hour/day quotas run before any paid place lookup and a minute scheduler expires stale windows.

Confirmation enables a request-specific 60-second Agora call. `POST /requests/:id/decision` records private Yes/No answers afterward. Either No starts a mutual 30-day cooldown; both Yes locks the time and stores a nearby restaurant/cafe/coffee-shop snapshot after an expanded-radius fallback search.

## Feedback, safety, and notifications

`POST /requests/:id/feedback` opens after the meetup window. Unsafe feedback requires the client to continue to report/block. Safety routes immediately hide blocked pairs and store moderation reports; administrators can list and close flags.

Expo push tokens are registered at `/notifications/push-token`. Requests, confirmations, matches, and 30-minute reminders carry Expo Router deep-link paths.

## Operations

`GET /health` checks database readiness. Production uses validated environment configuration, explicit migrations, scoped CORS, proxy-aware throttling, graceful shutdown, and the included Docker image.
