# Backend Functionality Report

Last reviewed: 2026-09-28  
Scope: `lattely` NestJS backend at commit `c02836c`  
Status basis: source code, migrations, configuration, and repository tests. Live third-party services were not exercised for this report.

## Executive summary

The backend implements the complete MVP flow for an adult, location-aware coffee dating application: account creation, email verification, staged onboarding, short-form vibe video management, nearby discovery, same-day coffee requests, a timed pre-meet video call, private mutual decisions, venue assignment, meetup reminders, feedback, blocking/reporting, and admin moderation.

The application is structured as a NestJS REST API backed by MySQL and TypeORM. It integrates with SMTP for email, Google Places for venue selection, Agora for calls, and Expo for push notifications. Most product behavior is implemented in the repository; production readiness still depends on credentials, infrastructure, persistent media storage, provider configuration, and live integration testing.

## Functional status

| Area | Status | Current functionality |
| --- | --- | --- |
| Authentication | Implemented | Registration, login, email OTP verification/resend, password recovery, access/refresh tokens, refresh rotation, logout, current-user lookup, and password-confirmed account deletion. |
| Onboarding and profile | Implemented | Email verification, 18+ birth-date validation, profile details, permissions acknowledgement, location, interests, gender preferences, and weekday/weekend or explicit day/time availability. |
| Vibe reels | Implemented | One video per user; upload, retrieve, replace, and delete; MP4/MOV/WebM validation; 8–10 second duration check; optional capture coordinates. |
| Discovery feed | Implemented | Reciprocal gender matching, maximum 10-mile distance, block/cooldown exclusion, reel requirement, and cursor pagination (1–50 items, default 20). |
| Coffee requests | Implemented | Same-day two-hour request windows, minimum 30-minute lead time, mutual availability validation, duplicate-open-request protection, configurable hourly/daily quotas, inbox/outbox/detail, confirmation, decline, and expiry. |
| Pre-date call | Implemented | Request-scoped Agora credentials, deterministic participant UIDs, a persisted 60-second call deadline, start/complete operations, and token expiry bounded to the call. |
| Mutual decision | Implemented | Private Yes/No answers after the call. Either No rejects the connection and creates a 30-day cooldown; mutual Yes proceeds to meetup creation. |
| Venue and meetup | Implemented | Google Places lookup after mutual Yes, fallback search radius, stored venue snapshot, retry of transient venue failures, one-hour accepted meetup, cancellation before start, and 30-minute reminders. |
| Feedback | Implemented | Post-meet attendance, 1–5 vibe score, Yes/No/Maybe interest, structured tags, optional notes, one submission per participant, and post-meet reminders. |
| Safety and moderation | Implemented | Blocking, safety reports tied optionally to a request, forced follow-up when feedback includes `SAFETY_CONCERN`, and admin report listing/status updates. |
| Notifications | Implemented | Expo token register/remove plus push notifications and deep links for core request, call, match, cancellation, reminder, and feedback events. |
| Operations and security | Implemented | Health/readiness endpoint, environment validation, global DTO validation, JWT/role/reel guards, rate limiting, Helmet, scoped production CORS, migrations, shutdown hooks, and non-root Docker deployment. |

## API surface

All routes require a Bearer access token unless marked **Public**. Product routes normally require a verified adult account with an uploaded reel. Verified users can access the staged onboarding and initial reel-upload routes before that final requirement is met; administrators bypass the reel requirement.

### System and development

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Public | Basic API response. |
| GET | `/health` | Public | Runs `SELECT 1` and reports database readiness. |
| POST | `/mail/test` | Public, development only | Sends an SMTP test email; returns 404 outside development and is limited to 3 requests/minute. |

### Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Creates an account from email and an 8–72 character password and sends a verification OTP. |
| POST | `/auth/login` | Public | Authenticates with email/password. |
| POST | `/auth/resend-otp` | Public | Resends an email-verification OTP subject to cooldown. |
| POST | `/auth/verify-email` | Public | Verifies a six-digit code. |
| POST | `/auth/forgot-password` | Public | Starts password recovery. |
| POST | `/auth/reset-password` | Public | Resets the password with an OTP and revokes existing refresh sessions. |
| GET | `/auth/me` | Authenticated | Returns the current account/onboarding state. |
| POST | `/auth/refresh` | Public | Rotates a refresh token and returns a new session pair. |
| POST | `/auth/logout` | Public | Revokes the supplied refresh token. |
| DELETE | `/auth/account` | Authenticated | Permanently deletes the account after password confirmation. |

Authentication routes are limited to 10 requests/minute. Access-token lifetime defaults to 15 minutes and refresh-token lifetime to 30 days. OTP lifetime defaults to 10 minutes, resend cooldown to 60 seconds, and invalidation occurs after five failed attempts.

### User onboarding and preferences

| Method | Route | Purpose |
| --- | --- | --- |
| PATCH | `/users/profile` | Saves first/last name, gender, birth date, and interested gender; birth date must represent age 18+. |
| PATCH | `/users/birth-date` | Supplies or corrects the birth date for legacy/staged accounts. |
| PATCH | `/users/location` | Stores address, latitude/longitude, and optional city/country. |
| PATCH | `/users/preferences` | Updates interested gender, interests, legacy morning/evening slots, or explicit availability days/time window. |
| PATCH | `/users/permissions` | Marks the permissions onboarding step complete. |

Supported profile genders are `MALE`, `FEMALE`, `NON_BINARY`, and `PREFER_NOT_TO_SAY`. Discovery preference also supports `DOESNT_MATTER`. Users may choose 3–15 interests from the backend’s stable interest list.

### Reels and discovery

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/reels/me` | Returns the current user's reel. |
| POST | `/reels/upload` | Creates the user's first reel via multipart field `video`. |
| PUT | `/reels/me` | Replaces the current reel. |
| DELETE | `/reels/me` | Deletes the current reel and removes feed eligibility. |
| GET | `/feed?cursor=&limit=` | Returns nearby eligible profiles with cursor pagination. |

Video size defaults to a maximum of 100 MB. Media metadata is checked with `ffprobe`, while uploads are stored below `public/uploads/reels` and served from `/public/`.

### Coffee request, call, and meetup lifecycle

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/reels/:reelId/react/coffee` | Creates a coffee request for `windowStartAt` and an optional IANA `timeZone`. |
| GET | `/requests/inbox` | Lists received requests. |
| GET | `/requests/outbox` | Lists sent requests. |
| GET | `/requests/:id` | Returns participant-visible request details. |
| POST | `/requests/:id/respond` | Recipient sends `CONFIRM` or `DECLINE`. |
| GET | `/requests/:requestId/call/token` | Returns the participant's Agora channel, UID, token, and timing state. |
| POST | `/requests/:requestId/call/start` | Persists the call start/deadline when the clients establish the two-person call. |
| POST | `/requests/:requestId/call/complete` | Completes the call after its deadline. |
| POST | `/requests/:id/decision` | Participant privately sends `YES` or `NO`. |
| POST | `/requests/:id/cancel` | Cancels a future matched meetup. |
| POST | `/requests/:id/feedback` | Submits feedback after the meetup has ended. |

The request state machine uses `PENDING`, `CALL_READY`, `AWAITING_DECISIONS`, `MATCHED`, `REJECTED`, `EXPIRED`, and `CANCELLED`. A scheduled job runs every minute to expire stale requests, retry venue selection, issue upcoming-meetup reminders, and issue feedback reminders. Default request quotas are 5 per rolling hour and 15 per rolling 24 hours.

### Safety and administration

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/safety/block/:userId` | Authenticated | Blocks a user and hides the pair from discovery. |
| POST | `/safety/report/:userId` | Authenticated | Creates a safety report with reason, optional details, and optional request ID. |
| GET | `/safety/reports` | Admin | Lists the moderation queue. |
| PATCH | `/safety/reports/:id` | Admin | Changes a report to `REVIEWED` or `CLOSED`. |

### Push notifications

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/notifications/push-token` | Registers a validated Expo push token for iOS or Android. |
| DELETE | `/notifications/push-token` | Removes a device token. |

## Data and persistence

The implemented schema includes users, OTPs, refresh tokens, reels, date requests, pre-date calls, cooldowns, user blocks, meetup feedback, safety reports, and push tokens. Production uses explicit TypeORM migrations; schema synchronization is rejected for production configuration.

Sensitive session and verification values are not stored in plaintext: refresh tokens are hashed and OTPs use a separate keyed HMAC. Passwords use bcrypt. Request venue details are stored as a snapshot so the confirmed meetup does not depend on a later Google Places response.

## External dependencies

| Dependency | Used for | Runtime expectation |
| --- | --- | --- |
| MySQL 8 | Application persistence and spatial discovery queries | Required. Migrations must be applied. |
| SMTP provider | Verification, recovery, and test email | Required with valid sender credentials. |
| Google Places | Nearby restaurant/cafe/coffee-shop selection | Required for completing mutual-Yes matches. Billing/quota must be enabled. |
| Agora | 60-second pre-date video calls | App ID and certificate are required. Clients carry the media session. |
| Expo Push Service | Device notifications and deep links | APNs/FCM and Expo project configuration are required for real devices. |
| Persistent filesystem | Reel video storage | A durable mounted volume is required for one replica; shared/object storage is required for multiple replicas. |

## Verification and test coverage

Repository unit tests cover important service and rule behavior, including age validation, time-zone availability, reel lifecycle, feed behavior, request guards, Agora token generation, environment safety, mail behavior, and health readiness. The standard verification commands are:

```bash
npm run lint
npm run build
npm test -- --runInBand
npm audit --omit=dev
```

For this review, `npm run build` completed successfully and `npm test -- --runInBand` passed all 10 suites and 28 tests. Lint and dependency audit were not rerun because lint is configured with `--fix` and the current audit limitation is already recorded below.

Live MySQL, SMTP, Google Places, Agora two-device media, Expo delivery, and signed mobile-store builds are outside repository-only verification.

## Known gaps and launch obligations

- Production credentials and provider quotas still need to be supplied and tested.
- Reel files use local storage; horizontal scaling needs shared or object storage.
- Expo project identity and APNs/FCM credentials require account-owner setup.
- Client-provided GPS coordinates are range-validated but are not attested against spoofing.
- A previously exposed Firebase service-account credential must be revoked outside the repository even though the file has been removed and ignored.
- Privacy policy, terms, bundle ownership, signing, and store declarations require owner/legal completion.
- The dependency audit has known Multer denial-of-service advisories through the Nest platform adapter; the available automated remediation requires a breaking Nest major upgrade.

## Overall assessment

The backend MVP is functionally implemented in code and covers the intended end-to-end user journey. It should be described as **repository-complete but not deployment-verified**: launch confidence depends on production infrastructure, valid third-party accounts, durable storage, security-key rotation, and live end-to-end testing.
