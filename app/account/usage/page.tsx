import { and, desc, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { limitFor } from "@/lib/rate-limit";
import AppShell from "../../app-shell";
import Reveal from "../../reveal";

const KIND_LABELS: Record<string, string> = {
  "voice-token": "Voice session started",
  tts: "Voice reply (TTS)",
  "flow-create": "Created a new flow",
  "flow-generate": "AI flow generated",
  "flow-extract": "Flow data captured",
  "flow-webhook": "Automation triggered",
  "dealership-extract": "Dealership booking checked",
};

function labelFor(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

function relativeTime(ms: number): string {
  const diff = currentTimeMs() - ms;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function currentTimeMs(): number {
  return Date.now();
}

function usageWindows(): { dayAgo: number; monthStart: number } {
  const now = currentTimeMs();
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return { dayAgo: now - 24 * 60 * 60 * 1000, monthStart: monthStart.getTime() };
}

export default async function UsagePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/account/usage");
  }

  const db = await getDb();
  const { dayAgo, monthStart } = usageWindows();

  const [today, month, allTime, recent] = await Promise.all([
    db
      .select({ kind: usageEvents.kind, count: sql<number>`count(*)` })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, user.id), gte(usageEvents.createdAt, dayAgo)))
      .groupBy(usageEvents.kind),
    db
      .select({ kind: usageEvents.kind, count: sql<number>`count(*)` })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, user.id), gte(usageEvents.createdAt, monthStart)))
      .groupBy(usageEvents.kind),
    db
      .select({ kind: usageEvents.kind, count: sql<number>`count(*)` })
      .from(usageEvents)
      .where(eq(usageEvents.userId, user.id))
      .groupBy(usageEvents.kind),
    db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.userId, user.id))
      .orderBy(desc(usageEvents.createdAt))
      .limit(20),
  ]);

  const todayCount = (kind: string) => today.find((row) => row.kind === kind)?.count ?? 0;
  const monthCount = (kind: string) => month.find((row) => row.kind === kind)?.count ?? 0;
  const allTimeCount = (kind: string) => allTime.find((row) => row.kind === kind)?.count ?? 0;

  const stats = [
    { kind: "voice-token", label: "Voice sessions" },
    { kind: "tts", label: "TTS calls" },
  ];

  return (
    <AppShell user={user}>
      <div className="profile-wrap">
        <Reveal>
          <h1 className="auth-title" style={{ fontSize: 30 }}>
            Usage
          </h1>
          <p className="auth-subtitle">How much you&rsquo;ve been talking with Virgil.</p>
        </Reveal>

        <Reveal stagger delay={0.1} className="usage-stats-grid">
          {stats.map((stat) => (
            <div key={stat.kind} className="usage-stat-card">
              <span className="usage-stat-label">{stat.label}</span>
              <strong className="usage-stat-value">
                {todayCount(stat.kind)}
                <span className="usage-stat-cap"> / {limitFor(stat.kind)} today</span>
              </strong>
              <div className="usage-stat-meta">
                <span>{monthCount(stat.kind)} this month</span>
                <span>{allTimeCount(stat.kind)} all-time</span>
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.2} className="profile-card" y={12}>
          <h2 className="profile-card-title">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="field-hint">Nothing yet &mdash; start a conversation and it&rsquo;ll show up here.</p>
          ) : (
            <ul className="usage-activity-list">
              {recent.map((event) => (
                <li key={event.id} className="usage-activity-row">
                  <span>{labelFor(event.kind)}</span>
                  <span className="usage-activity-time">{relativeTime(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </AppShell>
  );
}
