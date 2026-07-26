import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { getPriceId, isPlanId } from "@/lib/billing/plans";

export const runtime = "edge";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { plan?: string } | null;
  if (!isPlanId(body?.plan)) {
    return Response.json({ error: "Unknown plan." }, { status: 400 });
  }
  const plan = body.plan;

  const db = await getDb();
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const stripe = getStripe();
  let customerId = row?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
  }

  const origin = new URL(request.url).origin;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    if (!checkoutSession.url) {
      return Response.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout session failed", error);
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return Response.json({ error: message }, { status: 502 });
  }
}
