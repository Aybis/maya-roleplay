import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getStripe } from "@/lib/billing/stripe";
import { resolvePlanFromPriceId } from "@/lib/billing/plans";

export const runtime = "edge";

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = resolvePlanFromPriceId(priceId);
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  const db = await getDb();
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      plan: isActive ? plan : "free",
    })
    .where(eq(users.stripeCustomerId, customerId));
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Failed to handle Stripe event ${event.type}`, error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
