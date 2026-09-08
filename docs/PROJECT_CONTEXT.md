# Project Context

Lattely helps verified adults discover nearby people through short vibe reels and move from a same-day coffee request to a short safety call, private mutual decision, and confirmed meetup.

## Primary flow

1. Pass the 18+ gate, verify email, review permissions, and complete GPS location/preferences.
2. Upload one 5–60 second vibe.
3. Browse mutually compatible people within 10 miles.
4. Send a two-hour coffee window for today, at least 30 minutes ahead.
5. The recipient confirms and both enter a hard-limited 60-second call.
6. Each answers Yes/No privately. Either No creates a mutual cooldown; both Yes locks a place and time.
7. After the meetup, collect feedback and require safety follow-up when needed.

Availability is suggested rather than an exact matching constraint. One open request is allowed per pair, cooldowns are bilateral for 30 days, blocks hide both directions, and confirmed venue snapshots preserve history.

External systems are MySQL, SMTP, Google Places Nearby Search, Agora RTC, Expo Push Service, and persistent reel storage.
