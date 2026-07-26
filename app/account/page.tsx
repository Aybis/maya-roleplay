import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { flows, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import SiteHeader from "../site-header";
import Reveal from "../reveal";
import ManageBillingButton from "./manage-billing-button";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/account");
  }

  const db = await getDb();
  const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, user.id)).limit(1);
  const myFlows = await db.select().from(flows).where(eq(flows.createdBy, user.id)).orderBy(desc(flows.createdAt));

  const memberSince = userRow?.createdAt
    ? new Date(userRow.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <main className="profile-shell">
      <SiteHeader user={user} />

      <div className="profile-wrap">
        <Reveal className="profile-hero">
          <span className="profile-avatar">{user.email.charAt(0).toUpperCase()}</span>
          <div>
            <h1 className="profile-email">{user.email}</h1>
            {memberSince ? <p className="profile-meta">Member since {memberSince}</p> : null}
          </div>
        </Reveal>

        <Reveal stagger delay={0.1} className="profile-grid">
          <section className="profile-card">
            <h2 className="profile-card-title">Plan</h2>
            <div className="account-plan-row">
              <span>Current plan</span>
              <strong>{user.plan === "free" ? "Free" : user.plan}</strong>
            </div>
            <ManageBillingButton hasPlan={user.plan !== "free"} />
          </section>

          <section className="profile-card profile-card-wide">
            <div className="profile-card-head">
              <h2 className="profile-card-title">My flows</h2>
              <a href="/flows/new" className="profile-card-action">
                + New flow
              </a>
            </div>

            {myFlows.length === 0 ? (
              <p className="field-hint">You haven&rsquo;t created a flow yet.</p>
            ) : (
              <Reveal stagger delay={0.2} className="profile-flow-list">
                {myFlows.map((flow) => (
                  <a key={flow.id} className="profile-flow-row" href={`/flow/${flow.id}`}>
                    <div>
                      <strong>{flow.name}</strong>
                      <span className="profile-flow-tagline">{flow.tagline || "No tagline"}</span>
                    </div>
                    <span className={`flow-card-badge profile-flow-badge${flow.visibility === "private" ? " private" : ""}`}>
                      {flow.visibility === "private" ? "Private" : flow.category}
                    </span>
                  </a>
                ))}
              </Reveal>
            )}
          </section>
        </Reveal>

        <p className="auth-switch profile-signout-row">
          <a href="/pricing">See plans</a> · <a href="/">Back to Virgil</a>
        </p>
      </div>
    </main>
  );
}
