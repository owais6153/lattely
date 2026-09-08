# Codebase Map

```text
src/
├── main.ts          HTTP/security/bootstrap
├── app.module.ts    module graph, database, scheduler, global guards
├── config/          environment validation
├── migrations/      production schema and upgrade path
├── auth/            accounts, bounded OTP, JWT, refresh rotation
├── users/           adult profiles and onboarding
├── reels/           upload, ffprobe inspection, lifecycle
├── feed/            reciprocal 10-mile cursor discovery
├── interactions/    coffee state machine, meetup, feedback, safety
├── agora/           60-second pre-meet call APIs
├── notifications/   Expo tokens and push delivery
├── mail/            SMTP delivery
└── common/          decorators, guards, request types
```

Operational files include `.env.example`, `Dockerfile`, `.dockerignore`, and `package.json`. Runtime reel data lives under ignored `public/uploads/reels`.
