import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "edge";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const db = getDb();
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row?.stripeCustomerId) {
    return Response.json({ error: "No billing account yet. Subscribe to a plan first." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  try {
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: row.stripeCustomerId,
      return_url: `${origin}/account`,
    });
    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe billing portal session failed", error);
    const message = error instanceof Error ? error.message : "Could not open billing portal.";
    return Response.json({ error: message }, { status: 502 });
  }
}
