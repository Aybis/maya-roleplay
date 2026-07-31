'use client';

import { useState } from 'react';

export default function BookingLauncher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mvp/service-booking', { method: 'POST' });
      const data = (await response.json().catch(() => ({}))) as { flowId?: string; error?: string };
      if (!response.ok || !data.flowId) throw new Error(data.error ?? 'Unable to prepare the booking flow.');
      window.location.assign(`/flows/${data.flowId}/test`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to prepare the booking flow.');
      setLoading(false);
    }
  };

  return (
    <div>
      {error ? <p className="auth-error">{error}</p> : null}
      <button type="button" className="auth-submit runtime-launch-button" onClick={launch} disabled={loading}>
        {loading ? 'Preparing workspace…' : 'Open booking test console'}
      </button>
    </div>
  );
}
