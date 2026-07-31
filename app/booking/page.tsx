import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import AppShell from "../app-shell";
import BookingLauncher from "./booking-launcher";

export default async function BookingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?return_to=/booking");

  return (
    <AppShell user={user}>
      <div className="runtime-launcher">
        <span className="flow-card-badge">Runtime MVP</span>
        <h1>Dealership service booking</h1>
        <p>
          Run a deterministic booking conversation that pauses, resumes, records every node, and creates a dummy booking.
        </p>
        <BookingLauncher />
      </div>
    </AppShell>
  );
}
