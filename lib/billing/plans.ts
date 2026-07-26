export type PlanId = "basic" | "pro";

export const PLANS: Record<PlanId, { name: string; tagline: string; features: string[]; priceEnvVar: string }> = {
  basic: {
    name: "Basic",
    tagline: "For regular conversations with Maya",
    features: ["More voice minutes per month", "Save your favorite scenes"],
    priceEnvVar: "STRIPE_BASIC_PRICE_ID",
  },
  pro: {
    name: "Pro",
    tagline: "For daily companionship, no limits",
    features: ["Unlimited voice minutes", "Priority voice quality", "Early access to new scenes"],
    priceEnvVar: "STRIPE_PRO_PRICE_ID",
  },
};

export function isPlanId(value: string | undefined | null): value is PlanId {
  return value === "basic" || value === "pro";
}

export function getPriceId(plan: PlanId): string {
  const envVar = PLANS[plan].priceEnvVar;
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} is not set. Create the ${PLANS[plan].name} price in the Stripe dashboard and add its price ID to the site environment.`,
    );
  }
  return value;
}

export function resolvePlanFromPriceId(priceId: string | undefined): PlanId | "free" {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) return "basic";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}
