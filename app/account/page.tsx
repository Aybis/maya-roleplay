import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import ManageBillingButton from "./manage-billing-button";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/account");
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Your account</h1>
        <p className="auth-subtitle">{user.email}</p>

        <div className="account-plan-row">
          <span>Current plan</span>
          <strong>{user.plan === "free" ? "Free" : user.plan}</strong>
        </div>

        <ManageBillingButton hasPlan={user.plan !== "free"} />

        <p className="auth-switch">
          <a href="/pricing">See plans</a> · <a href="/">Back to Maya</a>
        </p>
      </div>
    </main>
  );
}
