import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import AppShell from "../../app-shell";
import Reveal from "../../reveal";
import SettingsForms from "./settings-forms";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/account/settings");
  }

  const db = await getDb();
  const [row] = await db
    .select({ defaultFlowVisibility: users.defaultFlowVisibility })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return (
    <AppShell user={user}>
      <div className="profile-wrap">
        <Reveal>
          <h1 className="auth-title" style={{ fontSize: 30 }}>
            Settings
          </h1>
          <p className="auth-subtitle">Manage your password and flow defaults.</p>
        </Reveal>

        <Reveal delay={0.1}>
          <SettingsForms defaultFlowVisibility={row?.defaultFlowVisibility === "private" ? "private" : "public"} />
        </Reveal>
      </div>
    </AppShell>
  );
}
