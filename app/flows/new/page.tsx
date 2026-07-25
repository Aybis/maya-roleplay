import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import CreateFlowForm from "./create-flow-form";

export default async function NewFlowPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/flows/new");
  }

  return (
    <main className="auth-shell">
      <div className="auth-card form-wide">
        <a className="brand" href="/">
          Maya
        </a>
        <h1 className="auth-title">Create a flow</h1>
        <p className="auth-subtitle">
          Design a character and setting. A fixed safety layer always applies underneath —
          see our <a href="/terms">Terms</a>.
        </p>

        <CreateFlowForm />

        <p className="auth-switch">
          <a href="/">Back to flows</a>
        </p>
      </div>
    </main>
  );
}
