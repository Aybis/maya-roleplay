import { Heart, MessageCircle, Sparkles, Workflow } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS, getPriceId, type PlanId } from "@/lib/billing/plans";
import { MayaLogo, MayaMark } from "./brand/maya-logo";
import Reveal from "./reveal";
import ScrollReveal from "./scroll-reveal";
import LandingFlowDemo from "./landing-flow-demo";

const FEATURES = [
  {
    icon: Heart,
    title: "A companion that's actually warm",
    description: "Maya is ready whenever you want to talk — cozy chats, gentle stories, real conversation.",
  },
  {
    icon: Sparkles,
    title: "Describe it, get a flow",
    description: "Sketch any character or scenario in plain language and get a working voice experience in seconds.",
  },
  {
    icon: Workflow,
    title: "Branching, automated flows",
    description: "Build multi-step conversations with logic and webhooks — from chat buddies to business assistants.",
  },
  {
    icon: MessageCircle,
    title: "Real voice, not just text",
    description: "Natural, real-time voice conversation that listens and responds like a real back-and-forth.",
  },
];

const STEPS = [
  {
    title: "Pick a companion, or create your own",
    description: "Start with Maya, spin up a business assistant, or design a custom character from scratch.",
  },
  {
    title: "Talk in real time",
    description: "No scripts to read from — just a natural voice conversation that responds as you speak.",
  },
  {
    title: "Customize with flows",
    description: "Add branching logic, quick actions, and webhooks to shape exactly how the conversation goes.",
  },
];

const FREE_PLAN = {
  name: "Free",
  tagline: "Try Maya before you subscribe",
  price: "$0",
  features: ["Chat with Maya", "A handful of voice minutes each month", "Build and save one custom flow"],
};

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

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/app");
  }

  const [basicPrice, proPrice] = await Promise.all([loadPriceDisplay("basic"), loadPriceDisplay("pro")]);

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <a className="brand" href="/" aria-label="Maya home">
          <span className="brand-mark">
            <MayaMark size={18} />
          </span>
          <span>Maya</span>
        </a>

        <nav className="landing-nav-links">
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="landing-nav-right">
          <a className="landing-nav-signin" href="/signin">
            Sign in
          </a>
          <a className="landing-nav-cta" href="/signup">
            Get started
          </a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <div className="landing-hero-glow-2" />

        <Reveal className="landing-hero-inner">
          <span className="landing-eyebrow">
            <span className="landing-eyebrow-dot" />
            Voice roleplay, reimagined
          </span>
          <h1 className="landing-headline">
            Stories that <em>talk back.</em>
          </h1>
          <p className="landing-subhead">
            A cozy voice companion, and a builder for creating your own — from a simple chat buddy to a
            fully automated conversation flow.
          </p>

          <div className="landing-hero-ctas">
            <a className="landing-cta-primary" href="/signup">
              Get started free
            </a>
            <a className="landing-cta-secondary" href="/signin">
              Sign in
            </a>
          </div>

          <div className="landing-hero-tags">
            <span className="landing-hero-tag">Real-time voice</span>
            <span className="landing-hero-tag">Branching flows</span>
            <span className="landing-hero-tag">Custom characters</span>
            <span className="landing-hero-tag">Business assistants</span>
          </div>
        </Reveal>
      </section>

      <section className="landing-section">
        <ScrollReveal className="landing-section-head">
          <span className="landing-kicker">Why Maya</span>
          <h2>Everything you need for a companion that talks back</h2>
          <p>Cozy conversation and serious tooling, built on the same voice engine.</p>
        </ScrollReveal>

        <ScrollReveal stagger className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <div className="landing-feature-card" key={feature.title}>
              <span className="landing-feature-icon">
                <feature.icon size={20} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </ScrollReveal>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <ScrollReveal className="landing-section-head">
          <span className="landing-kicker">How it works</span>
          <h2>From idea to conversation in minutes</h2>
          <p>No audio engineering, no prompt spelunking — just describe what you want.</p>
        </ScrollReveal>

        <ScrollReveal stagger className="landing-steps">
          {STEPS.map((step, index) => (
            <div className="landing-step" key={step.title}>
              <span className="landing-step-num">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </ScrollReveal>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <ScrollReveal className="landing-section-head">
          <span className="landing-kicker">Flow builder demo</span>
          <h2>This is what a flow looks like</h2>
          <p>Every flow renders on a canvas like this one — describe it, then click any step to fine-tune it.</p>
        </ScrollReveal>

        <ScrollReveal>
          <LandingFlowDemo />
        </ScrollReveal>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }} id="pricing">
        <ScrollReveal className="landing-section-head">
          <span className="landing-kicker">Pricing</span>
          <h2>Simple plans, cancel anytime</h2>
          <p>Start free, upgrade whenever a story runs long.</p>
        </ScrollReveal>

        <ScrollReveal stagger className="pricing-grid">
          <div className="plan-card">
            <h2 className="plan-name">{FREE_PLAN.name}</h2>
            <p className="plan-tagline">{FREE_PLAN.tagline}</p>
            <p className="plan-price">{FREE_PLAN.price}</p>
            <ul className="plan-features">
              {FREE_PLAN.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a className="auth-submit" style={{ textAlign: "center", textDecoration: "none" }} href="/signup">
              Get started free
            </a>
          </div>

          <div className="plan-card">
            <span className="plan-badge-popular">Most popular</span>
            <h2 className="plan-name">{PLANS.basic.name}</h2>
            <p className="plan-tagline">{PLANS.basic.tagline}</p>
            <p className="plan-price">{basicPrice ?? "Coming soon"}</p>
            <ul className="plan-features">
              {PLANS.basic.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a className="auth-submit" style={{ textAlign: "center", textDecoration: "none" }} href="/pricing">
              Choose {PLANS.basic.name}
            </a>
          </div>

          <div className="plan-card">
            <h2 className="plan-name">{PLANS.pro.name}</h2>
            <p className="plan-tagline">{PLANS.pro.tagline}</p>
            <p className="plan-price">{proPrice ?? "Coming soon"}</p>
            <ul className="plan-features">
              {PLANS.pro.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a className="auth-submit" style={{ textAlign: "center", textDecoration: "none" }} href="/pricing">
              Choose {PLANS.pro.name}
            </a>
          </div>
        </ScrollReveal>

        <p className="landing-pricing-note">
          Full billing details and plan management on the <a href="/pricing">pricing page</a>.
        </p>
      </section>

      <ScrollReveal>
        <section className="landing-cta-band">
          <h2>Ready for a story that listens?</h2>
          <p>Create a free account and start talking in seconds.</p>
          <a className="landing-cta-primary" href="/signup">
            Get started free
          </a>
        </section>
      </ScrollReveal>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <MayaLogo height={20} />
        </div>
        <div className="landing-footer-links">
          <a href="#pricing">Pricing</a>
          <a href="/signin">Sign in</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </footer>
    </main>
  );
}
