import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import AppShell from "../app-shell";
import Reveal from "../reveal";
import ManageBillingButton from "./manage-billing-button";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/account");
  }

  const db = await getDb();
  const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, user.id)).limit(1);

  const memberSince = userRow?.createdAt
    ? new Date(userRow.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <AppShell user={user}>
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

          <section className="profile-card">
            <h2 className="profile-card-title">Quick links</h2>
            <div className="profile-flow-list">
              <a className="profile-flow-row" href="/account/roleplays">
                <div>
                  <strong>My roleplays</strong>
                  <span className="profile-flow-tagline">See every flow you&rsquo;ve created</span>
                </div>
              </a>
              <a className="profile-flow-row" href="/account/usage">
                <div>
                  <strong>Usage</strong>
                  <span className="profile-flow-tagline">Voice sessions and TTS calls</span>
                </div>
              </a>
              <a className="profile-flow-row" href="/account/settings">
                <div>
                  <strong>Settings</strong>
                  <span className="profile-flow-tagline">Password and flow defaults</span>
                </div>
              </a>
            </div>
          </section>
        </Reveal>

        <p className="auth-switch profile-signout-row">
          <a href="/pricing">See plans</a> · <a href="/">Back to Virgil</a>
        </p>
      </div>
    </AppShell>
  );
}
