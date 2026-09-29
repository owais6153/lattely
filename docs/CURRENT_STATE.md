# Current State

Last reviewed: 2026-09-09.

## Implemented and registered

- Staged email/password registration followed by verified 18+ profile onboarding, attempt-limited email OTP verification, recovery, short access tokens, rotating hashed refresh sessions, logout, and password-confirmed deletion.
- Permission, GPS location, preferences, and vibe onboarding without a reel-guard deadlock.
- One validated 8–10 second MP4/MOV/WebM vibe per user.
- Reciprocal-gender discovery at a server-locked 10 miles with bounding prefiltering, mutual cooldown/block exclusion, and cursor pagination. Coffee requests must fit both users' selected availability period.
- Today-only coffee requests with multiple proposed two-hour windows, a 30-minute buffer, user quotas, scheduled expiry, confirm/decline, and push deep links.
- Confirmed-request Agora calls with participant UIDs 1/2, a persisted 60-second deadline that starts when both clients connect, 65-second maximum token TTL, countdown, and automatic leave.
- Private mutual Yes/No decisions. New requests wait for the recipient to select a persisted proposed window before later venue planning; legacy single-window requests retain automatic fallback venue matching. Either No creates a mutual 30-day cooldown.
- Meetup reminders, cancellable upcoming meetups, 1â€“5/tagged post-window feedback, forced safety follow-up, block/report APIs, and an admin moderation queue.
- Scoped CORS, Helmet, throttling, validation, provider timeouts, graceful shutdown, migrations, readiness checks, and a non-root Docker runtime with system ffprobe.

## Runtime dependencies

MySQL, SMTP, Google Places, Agora, Expo push credentials, and durable reel storage are required. Repository completion does not substitute for deployment credentials or live provider testing.

## Verified quality gates

Use `npm run lint`, `npm run build`, `npm test -- --runInBand`, and `npm audit --omit=dev`. External launch obligations are tracked in [Known issues](KNOWN_ISSUES.md).
