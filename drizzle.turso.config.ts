import { defineConfig } from "drizzle-kit";

// Applies the same migrations under ./drizzle to the live Turso database
// (used by Vercel/Node at runtime -- see db/index.ts). Separate from
// drizzle.config.ts, which stays dialect: "sqlite" for local `db:generate`
// and doesn't need real credentials.
export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
