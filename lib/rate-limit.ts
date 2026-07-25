import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";

// Baseline per-user caps to stop a single account from running up the
// Gemini/ElevenLabs/Surplus bill. Not plan-aware yet -- tune via env once
// plan tiers have real usage limits attached.
const DEFAULT_LIMITS: Record<string, number> = {
  "voice-token": 30, // Gemini Live session starts per day
  tts: 300, // ElevenLabs TTS calls per day
  "flow-create": 10, // new custom flows per day
  "flow-extract": 600, // structured-data extraction calls per day (fires periodically during a step-based flow's conversation)
  "flow-webhook": 100, // outbound webhook fires per day
  "dealership-extract": 600,
  "flow-generate": 15, // AI flow-draft generations per day
};
const WINDOW_MS = 24 * 60 * 60 * 1000;

function limitFor(kind: string): number {
  const envKey = `RATE_LIMIT_${kind.toUpperCase().replace(/-/g, "_")}_PER_DAY`;
  const override = Number(process.env[envKey]);
  return Number.isFinite(override) && override > 0 ? override : (DEFAULT_LIMITS[kind] ?? 100);
}

export async function checkRateLimit(userId: string, kind: string): Promise<boolean> {
  const db = getDb();
  const since = Date.now() - WINDOW_MS;

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), eq(usageEvents.kind, kind), gte(usageEvents.createdAt, since)));

  if ((row?.count ?? 0) >= limitFor(kind)) return false;

  await db.insert(usageEvents).values({ userId, kind, createdAt: Date.now() });
  return true;
}
