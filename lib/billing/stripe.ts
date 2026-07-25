import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to the site environment to enable billing.");
  }

  client = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return client;
}
