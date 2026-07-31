import { getSessionUser } from "@/lib/auth/session";
import { ensureServiceBookingMvp } from "@/lib/flow-definition/versions";

export const runtime = "edge";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    return Response.json(await ensureServiceBookingMvp(user));
  } catch (error) {
    console.error("Unable to prepare service-booking MVP", error);
    return Response.json({ error: "Unable to prepare the service-booking flow." }, { status: 500 });
  }
}
