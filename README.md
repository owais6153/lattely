# Lattely API

Production-oriented NestJS API for Lattely’s adult, location-aware coffee workflow: vibe discovery, two-hour same-day requests, 60-second calls, mutual decisions, meetup locking, feedback, notifications, and safety moderation.

## Requirements

- Node.js 22
- MySQL 8 with spatial functions
- SMTP credentials
- Google Places API key
- Agora App ID and certificate
- Expo/EAS push-notification credentials
- Persistent storage mounted at `public/uploads/reels`

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Run `npm install`.
3. Create the configured MySQL database.
4. For a fresh database, run `npm run migration:run` (or enable `DB_RUN_MIGRATIONS`).
5. Run `npm run start:dev`.

The API binds to `APP_HOST:APP_PORT`, defaults to `0.0.0.0:3000`, serves reels under `/public/`, and exposes database-backed readiness at `GET /health`.

## Production

Production validation rejects missing integrations, short secrets, and `DB_SYNCHRONIZE=true`. Set an HTTPS origin allowlist in `CORS_ORIGINS`, use independent high-entropy JWT/OTP secrets, run migrations, and mount durable reel storage.

```bash
docker build -t lattely-api .
docker run --env-file .env -p 3000:3000 -v lattely-reels:/app/public/uploads/reels lattely-api
```

## Quality gates

```bash
npm run lint
npm run build
npm test -- --runInBand
npm audit --omit=dev
```

Migration commands are `migration:show`, `migration:run`, and `migration:revert`.

## Documentation

- [Current state](docs/CURRENT_STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Features](docs/FEATURES.md)
- [Known issues](docs/KNOWN_ISSUES.md)

Contributor guidance is in [AGENTS.md](AGENTS.md).
