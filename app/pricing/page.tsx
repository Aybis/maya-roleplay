import { getSessionUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS, getPriceId, type PlanId } from "@/lib/billing/plans";
import PricingCard from "./pricing-card";
import SiteHeader from "../site-header";

async function loadPriceDisplay(plan: PlanId): Promise<string | null> {
  try {
    const price = await getStripe().prices.retrieve(getPriceId(plan));
    if (price.unit_amount == null) return null;
    const amount = (price.unit_amount / 100).toFixed(price.unit_amount % 100 === 0 ? 0 : 2);
    const interval = price.recurring?.interval ?? "mo";
    return `$${amount}/${interval}`;
  } catch {
    return null;
  }
}

export default async function PricingPage() {
  const user = await getSessionUser();
  const [basicPrice, proPrice] = await Promise.all([loadPriceDisplay("basic"), loadPriceDisplay("pro")]);

  return (
    <>
      <SiteHeader user={user} />
      <main className="auth-shell">
      <div className="pricing-wrap">
        <h1 className="auth-title" style={{ textAlign: "center", fontSize: 30 }}>
          Choose your plan
        </h1>
        <p className="auth-subtitle" style={{ textAlign: "center" }}>
          Upgrade any time. Cancel any time.
        </p>
        <div className="pricing-grid">
          <PricingCard
            plan="basic"
            name={PLANS.basic.name}
            tagline={PLANS.basic.tagline}
            features={PLANS.basic.features}
            price={basicPrice}
            signedIn={!!user}
            currentPlan={user?.plan ?? "free"}
          />
          <PricingCard
            plan="pro"
            name={PLANS.pro.name}
            tagline={PLANS.pro.tagline}
            features={PLANS.pro.features}
            price={proPrice}
            signedIn={!!user}
            currentPlan={user?.plan ?? "free"}
          />
        </div>
      </div>
      </main>
    </>
  );
}
