# Maya MVP Product Decisions

Status: approved for the first deterministic service-booking vertical slice.

## Deployment and storage

- Vercel is the primary deployed runtime.
- Turso/libSQL is the primary production database for this slice.
- Cloudflare/vinext/D1 compatibility remains supported by builds and migrations, but it is not the release-blocking production target.

## Identity and tenancy

- Public flows require registration and login before they can be run in the application.
- Email/password remains supported.
- Google sign-in or Privy is a future authentication option, not part of this slice.
- Maya is multi-tenant. Each user receives a personal workspace and owner membership automatically.
- All workspace members may author and publish in the MVP, regardless of role label.

## Flow and booking behavior

- Publishing is immediate in the MVP; no approval workflow is required.
- Runtime sessions pin themselves to an immutable published flow version.
- Natural-language customer answers are captured as persisted session variables.
- The first business outcome is `booking_created`.
- The first booking action uses Maya's deterministic dummy booking store.
- A completed booking is rendered as a structured card inside the text chat feed.
- The text test console is the first supported runtime channel.
- Existing voice roleplay behavior remains available while the headless runtime is introduced beside it.

## Explicitly deferred

The deferred decisions and production hardening work are tracked in `docs/TECH_DEBT.md`.
