import { desc, eq, or } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin");
  }

  const db = getDb();
  const customFlows = await db
    .select()
    .from(flows)
    .where(or(eq(flows.visibility, "public"), eq(flows.createdBy, user.id)))
    .orderBy(desc(flows.createdAt))
    .limit(30);

  return (
    <main className="picker-shell">
      <header className="topbar picker-topbar">
        <span className="brand">
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>Maya</span>
        </span>
        <div className="account-pill" title={user.email}>
          <a className="account-email" href="/account">
            {user.email}
          </a>
        </div>
      </header>

      <div className="picker-wrap">
        <h1 className="auth-title" style={{ fontSize: 30 }}>
          What kind of story tonight?
        </h1>
        <p className="auth-subtitle">Pick a companion, or create your own.</p>

        <div className="flow-grid">
          <a className="flow-card featured" href="/maya">
            <span className="flow-card-badge">Companion</span>
            <h2>Maya</h2>
            <p>A warm, empathetic voice companion for cozy chats and gentle stories.</p>
          </a>

          <a className="flow-card featured" href="/dealership">
            <span className="flow-card-badge">Business</span>
            <h2>Dealership Assistant</h2>
            <p>Book a service appointment, a test drive, or hear about current promos.</p>
          </a>

          {customFlows.map((flow) => (
            <a className="flow-card" href={`/flow/${flow.id}`} key={flow.id}>
              <span className="flow-card-badge">{flow.category}</span>
              <h2>{flow.name}</h2>
              <p>{flow.tagline || "A custom voice roleplay."}</p>
              {flow.createdBy === user.id && flow.visibility === "private" && (
                <span className="flow-card-private">Private</span>
              )}
            </a>
          ))}

          <a className="flow-card flow-card-create" href="/flows/new">
            <span className="flow-card-plus">+</span>
            <h2>Create your own flow</h2>
            <p>Design a character, a setting, and how they talk.</p>
          </a>
        </div>
      </div>
    </main>
  );
}
