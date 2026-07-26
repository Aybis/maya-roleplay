import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

// D1 and libSQL both extend the same BaseSQLiteDatabase, differing only in their
// run-result type (D1Result vs. ResultSet) -- typing against that shared base (instead
// of a union of the two driver classes) keeps the query builder's overloads consistent
// regardless of which backend is actually in use.
type Db = BaseSQLiteDatabase<"async", unknown, typeof schema>;

let cached: Db | null = null;

// Same SQLite schema, two backends: Cloudflare D1 in Workers (via wrangler/`build`),
// and Turso/libSQL everywhere else (e.g. Vercel's Node runtime, where the
// `cloudflare:workers` binding doesn't exist). The D1 import is dynamic so plain
// Node never has to resolve `cloudflare:workers` at module-load time.
export async function getDb(): Promise<Db> {
  if (cached) return cached;

  if (process.env.TURSO_DATABASE_URL) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    cached = drizzleLibsql(client, { schema });
    return cached;
  }

  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "No database configured. Set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) for Node/Vercel, " +
        "or run under wrangler with a `DB` D1 binding (see .openai/hosting.json)."
    );
  }

  cached = drizzleD1(env.DB, { schema });
  return cached;
}
