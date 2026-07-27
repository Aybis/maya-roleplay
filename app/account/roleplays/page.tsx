import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import AppShell from "../../app-shell";
import Reveal from "../../reveal";

export default async function MyRoleplaysPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/account/roleplays");
  }

  const db = await getDb();
  const myFlows = await db.select().from(flows).where(eq(flows.createdBy, user.id)).orderBy(desc(flows.createdAt));

  return (
    <AppShell user={user}>
      <div className="picker-wrap">
        <Reveal>
          <h1 className="auth-title" style={{ fontSize: 30 }}>
            My Roleplays
          </h1>
          <p className="auth-subtitle">Every character and flow you&rsquo;ve created.</p>
        </Reveal>

        {myFlows.length === 0 ? (
          <Reveal delay={0.1}>
            <p className="field-hint" style={{ marginTop: 20 }}>
              You haven&rsquo;t created a roleplay yet.
            </p>
          </Reveal>
        ) : (
          <Reveal stagger delay={0.1} className="flow-grid">
            {myFlows.map((flow) => (
              <a className="flow-card" href={`/flow/${flow.id}`} key={flow.id}>
                <span className="flow-card-badge">{flow.category}</span>
                <h2>{flow.name}</h2>
                <p>{flow.tagline || "A custom voice roleplay."}</p>
                {flow.visibility === "private" && <span className="flow-card-private">Private</span>}
              </a>
            ))}
          </Reveal>
        )}

        {myFlows.length > 0 && (
          <Reveal delay={0.2} className="roleplays-cta-row">
            <a className="flow-card flow-card-create" href="/flows/new">
              <span className="flow-card-plus">+</span>
              <h2>Create your own flow</h2>
              <p>Design a character, a setting, and how they talk.</p>
            </a>
          </Reveal>
        )}
      </div>
    </AppShell>
  );
}
