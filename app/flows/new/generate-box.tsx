'use client';

import { Wand2 } from 'lucide-react';
import { useState } from 'react';
import type { CreateFlowInput } from '@/lib/flows/types';

export default function GenerateBox({ onGenerated }: { onGenerated: (flow: CreateFlowInput) => void }) {
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async () => {
    if (scenario.trim().length < 10) {
      setError('Describe the scenario in a bit more detail.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/flows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = (await response.json().catch(() => ({}))) as { flow?: CreateFlowInput; error?: string };
      if (!response.ok || !data.flow) {
        setError(data.error ?? 'Generation failed. Try again.');
        setLoading(false);
        return;
      }
      onGenerated(data.flow);
      setLoading(false);
    } catch {
      setError('Could not reach the server.');
      setLoading(false);
    }
  };

  return (
    <div className="generate-box">
      <div className="generate-box-head">
        <Wand2 size={17} />
        <strong>Describe the scenario, I'll draft the flow</strong>
      </div>
      <p className="field-hint">
        e.g. "A pizza shop bot that takes an order — pizza type and size — then sends it to my
        webhook." Everything below fills in automatically; review and edit before saving.
      </p>
      <textarea
        className="auth-input"
        rows={3}
        maxLength={600}
        value={scenario}
        onChange={(event) => setScenario(event.target.value)}
        placeholder="What should this character do?"
      />
      {error ? <p className="auth-error">{error}</p> : null}
      <button type="button" className="generate-btn" onClick={onGenerate} disabled={loading}>
        {loading ? 'Drafting…' : 'Generate flow'}
      </button>
    </div>
  );
}
