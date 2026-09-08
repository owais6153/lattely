# Development

## Prerequisites

Node.js 22, npm, MySQL 8, SMTP, Google Places, Agora, and a writable `public/uploads/reels` directory.

## Setup

```bash
npm install
copy .env.example .env
npm run migration:run
npm run start:dev
```

Use `DB_SYNCHRONIZE=true` only for disposable local databases. Production validation requires it to be false and defaults `DB_RUN_MIGRATIONS` to true.

## Configuration groups

- `APP_*`, `CORS_ORIGINS`, `TRUST_PROXY_HOPS`: network/runtime behavior.
- `DB_*`: MySQL and migration behavior.
- `JWT_*`, `OTP_*`: session lifetimes and independent high-entropy secrets.
- `MAIL_*`: SMTP connection and timeout settings.
- `MAX_REEL_MB`: upload cap, default 100 MB.
- `GOOGLE_PLACES_*`: API key, result count, radius, timeout.
- `AGORA_*`: App ID, private certificate, and token TTL.

See `.env.example` for the complete names and safe defaults.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint/Prettier auto-fix gate |
| `npm run build` | Compile Nest TypeScript |
| `npm test -- --runInBand` | Unit tests |
| `npm run migration:show` | Show pending migrations |
| `npm run migration:run` | Apply migrations |
| `npm run migration:revert` | Revert the latest migration |
| `npm run start:prod` | Run compiled API |

For Docker deployment, keep container port 3000 and mount `/app/public/uploads/reels`. Provider integration tests require real credentials and two physical/dev-build devices for Agora.
