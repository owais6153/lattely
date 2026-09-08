# Decisions

## Explicit schema and rotating sessions

Production uses migrations and rejects schema synchronization. Access JWTs are short-lived; opaque refresh values are hashed at rest, rotate under a row lock, and are revoked after password reset.

## HMAC and bounded OTP attempts

Six-digit codes use an independent keyed HMAC, constant-time comparison, resend throttling, and invalidation after five wrong attempts.

## Call-gated meetup snapshots

Google Places is called only after both post-call decisions are Yes. Decisions commit before the external call; an identical Yes retry can safely retry venue selection after a transient provider failure. The selected venue is stored with the confirmed meetup, using restaurant/cafe categories and an expanded-radius fallback.

Only parties to recipient-confirmed requests obtain Agora tokens. Channels derive from request IDs; requester and recipient use deterministic UIDs 1 and 2. The client starts the server clock when it observes the second participant, the server stores the 60-second deadline, credentials never extend beyond the deadline grace period, and the client automatically leaves at zero.

## Replica-safe scheduled reminders

Each scheduler may scan eligible rows, but a conditional database update atomically claims each reminder. Only the winning replica sends the notification.

## Local persistent reel storage

The deployment model uses a durable mounted volume and relative URLs. Moving to object storage remains an explicit compatibility project.
