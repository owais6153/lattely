# Known Issues and Release Obligations

Last reviewed: 2026-09-08.

## Must be completed outside this repository

- **Rotate the exposed Firebase service-account key.** The unused credential file has been removed and ignored, but a credential that existed in Git history must be revoked in Firebase/Google Cloud. Rewriting shared Git history is intentionally not performed here.
- Supply production MySQL, SMTP, Google Places, and Agora credentials and verify billing/quota/provider access.
- Confirm ownership of `com.lattely.app`, create signing credentials, and complete App Store/Play Console privacy declarations.
- Have the included privacy policy and terms reviewed for the actual operating company and jurisdictions.

## Deployment constraints

- Reels use local filesystem storage. A single API replica must mount persistent backup-capable storage at `/app/public/uploads/reels`. Multiple replicas require shared storage or a future object-storage adapter/CDN.
- Expo push delivery is implemented, but an Expo account owner must run `eas login` and `eas project:init`, then configure APNs/FCM credentials before device delivery works. Missing project identity is warned in development and surfaced as an error in production instead of failing silently. Analytics and crash reporting remain deployment choices.
- Location coordinates are validated for range but are still trusted from the authenticated client. Server-side attestation or anti-spoofing remains a post-MVP hardening item.
- Web refresh tokens use browser local storage. The native iOS/Android apps use SecureStore and are the production targets.

## Test scope

Unit tests cover reel replacement/deletion behavior, environment safety, time-zone availability, health readiness, and Agora token generation. Live MySQL, SMTP, Google Places, Agora two-device media, and signed store builds require real infrastructure and cannot be proven by repository-only tests.

## Dependency audit note

The complete backend dependency audit is clean. Expo’s current SDK-compatible toolchain reports moderate transitive npm advisories for build/config packages; npm proposes incompatible Expo downgrades, so forced remediation is intentionally not applied.
