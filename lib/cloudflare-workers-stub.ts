// Stand-in for the `cloudflare:workers` module on Vercel builds (see next.config.ts).
// db/index.ts only reaches the real import on the D1 branch, which never runs on
// Vercel since TURSO_DATABASE_URL is always set there -- this stub exists purely so
// Turbopack has a real module to resolve to instead of the platform-specific one.
export const env: Record<string, unknown> = {};
