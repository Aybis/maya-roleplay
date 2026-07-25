'use client';

import { useState } from 'react';
import type { PlanId } from '@/lib/billing/plans';

export default function PricingCard({
  plan,
  name,
  tagline,
  features,
  price,
  signedIn,
  currentPlan,
}: {
  plan: PlanId;
  name: string;
  tagline: string;
  features: string[];
  price: string | null;
  signedIn: boolean;
  currentPlan: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCurrent = currentPlan === plan;

  const onSubscribe = async () => {
    if (!signedIn) {
      window.location.href = `/signin?return_to=${encodeURIComponent('/pricing')}`;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? 'Could not start checkout.');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not reach the server.');
      setLoading(false);
    }
  };

  return (
    <div className={`plan-card${isCurrent ? ' plan-card-current' : ''}`}>
      <h2 className="plan-name">{name}</h2>
      <p className="plan-tagline">{tagline}</p>
      <p className="plan-price">{price ?? 'Coming soon'}</p>
      <ul className="plan-features">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {error ? <p className="auth-error">{error}</p> : null}
      <button
        type="button"
        className="auth-submit"
        onClick={onSubscribe}
        disabled={loading || isCurrent || !price}
      >
        {isCurrent ? 'Current plan' : loading ? 'Please wait…' : price ? `Choose ${name}` : 'Not available yet'}
      </button>
    </div>
  );
}
