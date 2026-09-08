# Changelog

## Unreleased

### Added

- Production configuration, migrations, health readiness, scoped CORS, graceful shutdown, rotating refresh sessions, and dependency hardening.
- Adult age gate, permission onboarding, OTP attempt limits, and secure reel lifecycle endpoints.
- Fixed 10-mile cursor feed with reciprocal preferences, cooldown/block filtering, and indexed bounding prefiltering.
- Two-hour same-day coffee requests, per-user quotas, expiry scheduler, confirm/decline flow, 60-second calls, and private mutual decisions.
- Meetup place/time locking, expanded place fallback, reminders, feedback, block/report, moderation flags, Expo push tokens, and deep links.
- Complete React Native screen/API coverage and generated Lattely application artwork.

### Changed

- Replaced the legacy counter-proposal flow with the required call-gated coffee workflow.
- Migrated Agora token generation to the maintained AccessToken2 package and fixed participant UID assignment.
- Docker now uses system ffmpeg/ffprobe for x64 and ARM deployments.

### Removed

- Removed an unused committed Firebase credential file and the active legacy proposal entity. Previously exposed credentials still require external rotation.

## Historical State

The available Git history begins on 2026-01-29 with authentication, OTP email, reels, discovery, Google Places date interactions, and early Agora source.
