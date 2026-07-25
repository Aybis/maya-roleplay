'use client';

import { useState } from 'react';

export default function ManageBillingButton({ hasPlan }: { hasPlan: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPlan) {
    return (
      <a className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} href="/pricing">
        Choose a plan
      </a>
    );
  }

  const onManage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? 'Could not open billing portal.');
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
    <>
      {error ? <p className="auth-error">{error}</p> : null}
      <button type="button" className="auth-submit" onClick={onManage} disabled={loading}>
        {loading ? 'Please wait…' : 'Manage billing'}
      </button>
    </>
  );
}
