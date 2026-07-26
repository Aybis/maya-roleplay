# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Where Your Changes Actually Are (Local vs. Branch vs. Deployed)

Three different things can be out of sync, and "I don't see the update" almost
always means one of these:

1. **Local dev server** (`npm run dev`, `localhost:3000`) — reflects every file
   change immediately. This is what you've been looking at in this session.
2. **Git branch** — all recent work (the canvas redesign, the black &
   white pass, the landing page demo animation, the Vercel build fix) is
   committed and pushed to `dev/feature/workflow` on `origin`. Run
   `git status -sb` to confirm your local branch and `origin/dev/feature/workflow`
   point at the same commit.
3. **Deployed site** (Vercel / Cloudflare) — only updates when something is
   actually deployed from the branch it's configured to track. If your deployed
   site tracks `main`, none of this shows up until `dev/feature/workflow` is
   merged into `main` and redeployed. **Merge/deploy is a decision you make
   explicitly — nothing here does that automatically.**

### Local data is not cloud data

The flows you see on the homepage locally (`Virgil`, `Dealership Assistant`,
`Workspace Test Flow`, `PizzaPal`, `Ray`, `Pizza Order Bot`, ...) live in a
**local-only** SQLite file that Wrangler/Miniflare simulates for
`npm run dev` (`.wrangler/state/v3/d1/...`, gitignored, machine-specific).
They are not in any cloud database and will not appear in a real Cloudflare or
Vercel deployment. A fresh deploy starts with an empty database until you seed
it or a real user signs up.

### To deploy on Cloudflare (unchanged)

`npm run build` / `npm run start` continue to work exactly as before — this
target reads Cloudflare D1 via the `DB` binding at runtime, same as always.

### To deploy on Vercel (new — see the Vercel build fix)

`db/index.ts` now picks a backend at runtime: Cloudflare D1 if it's running
under Workers, otherwise [Turso](https://turso.tech) (libSQL) if
`TURSO_DATABASE_URL` is set — the schema is identical (both are SQLite), so no
migration rewrite was needed. Before a Vercel deploy will actually work end to
end:

1. Create a Turso database and copy its URL + auth token.
2. In the Vercel project's Environment Variables, set:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Apply the schema to that database (see `npm run db:generate` and Drizzle's
   [libSQL migration guide](https://orm.drizzle.team/docs/get-started/libsql-new)
   for pushing migrations to a remote libSQL target).
4. Redeploy. Without step 2, `getDb()` throws
   `"No database configured"` at request time (the build itself will still
   succeed either way).

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
