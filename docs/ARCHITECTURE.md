# Architecture

The backend is a modular NestJS HTTP API. Controllers validate and authorize calls, services own business state, scheduled jobs expire/remind, and TypeORM persists to MySQL. The mobile client connects over HTTPS and uses Agora RTC directly with server-issued tokens; the API also integrates SMTP, Google Places, Expo Push Service, and durable reel storage.

## Data model

| Table | Purpose |
| --- | --- |
| `users` | Adult identity, permission acknowledgement, location, preferences |
| `otps`, `refresh_tokens` | Attempt-limited verification and rotating sessions |
| `reels` | One vibe per user |
| `date_requests` | Two-hour window, decisions, lifecycle, confirmed meetup snapshot |
| `pre_date_calls` | Request-specific call and 60-second deadline |
| `cooldowns`, `user_blocks` | Bilateral discovery exclusions |
| `meetup_feedback`, `safety_reports` | Post-meet safety and moderation |
| `push_tokens` | Per-device Expo destinations |

Schema synchronization is disabled in production and `src/migrations` is authoritative. The reconciliation migration normalizes legacy nullability and removes the retired `date_proposals` table.

Reel URLs are relative `public/uploads/reels/...` paths. A single API replica needs a durable mounted volume; multiple replicas require shared/object storage.
