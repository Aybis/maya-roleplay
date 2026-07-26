import { desc, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { FLOW_CATEGORIES } from "@/lib/flows/types";
import SiteHeader from "../site-header";
import Reveal from "../reveal";

const CATEGORY_LABELS: Record<string, string> = {
  companion: "Companion",
  adventure: "Adventure",
  business: "Business assistant",
  custom: "Custom",
};

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/app");
  }

  const { category } = await searchParams;
  const activeCategory = category && FLOW_CATEGORIES.includes(category as (typeof FLOW_CATEGORIES)[number]) ? category : null;

  const db = await getDb();
  const customFlows = await db
    .select()
    .from(flows)
    .where(or(eq(flows.visibility, "public"), eq(flows.createdBy, user.id)))
    .orderBy(desc(flows.createdAt))
    .limit(60);

  const filteredFlows = activeCategory ? customFlows.filter((flow) => flow.category === activeCategory) : customFlows;

  return (
    <main className="picker-shell">
      <SiteHeader user={user} />

      <div className="picker-wrap">
        <Reveal>
          <h1 className="auth-title" style={{ fontSize: 30 }}>
            What kind of story tonight?
          </h1>
          <p className="auth-subtitle">Pick a companion, or create your own.</p>

          <div className="category-filters">
            <a href="/app" className={`category-chip${!activeCategory ? " active" : ""}`}>
              All
            </a>
            {FLOW_CATEGORIES.map((value) => (
              <a key={value} href={`/app?category=${value}`} className={`category-chip${activeCategory === value ? " active" : ""}`}>
                {CATEGORY_LABELS[value]}
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal stagger delay={0.1} className="flow-grid">
          {(!activeCategory || activeCategory === "companion") && (
            <a className="flow-card featured" href="/virgil">
              <span className="flow-card-badge">Companion</span>
              <h2>Virgil</h2>
              <p>A warm, empathetic voice companion for cozy chats and gentle stories.</p>
            </a>
          )}

          {(!activeCategory || activeCategory === "business") && (
            <a className="flow-card featured" href="/dealership">
              <span className="flow-card-badge">Business</span>
              <h2>Dealership Assistant</h2>
              <p>Book a service appointment, a test drive, or hear about current promos.</p>
            </a>
          )}

          {filteredFlows.map((flow) => (
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
        </Reveal>
      </div>
    </main>
  );
}
