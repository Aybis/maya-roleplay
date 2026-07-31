'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import Link from 'next/link';

type Snapshot = {
  session: {
    id: string;
    status: string;
    currentNodeId: string | null;
    variables: Record<string, string>;
    outcome: string | null;
    revision: number;
    flowVersion: number;
  };
  messages: Array<{ id: string; role: string; content: string; createdAt: number }>;
  traces: Array<{ id: string; nodeId: string; nodeType: string; status: string; createdAt: number }>;
  booking: null | {
    id: string;
    status: string;
    customerName: string;
    phone: string;
    vehicleModel: string;
    licensePlate: string;
    serviceNeeded: string;
    preferredDate: string;
  };
};

export default function RuntimeTestConsole({
  flowId,
  flowName,
  userEmail,
}: {
  flowId: string;
  flowName: string;
  userEmail: string;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storageKey = `maya-runtime-session:${flowId}`;

  const startNew = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/runtime/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId }),
    });
    const data = (await response.json().catch(() => ({}))) as Snapshot & { error?: string };
    if (!response.ok || !data.session) throw new Error(data.error ?? 'Unable to start the flow.');
    window.localStorage.setItem(storageKey, data.session.id);
    setSnapshot(data);
    setLoading(false);
  }, [flowId, storageKey]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const sessionId = window.localStorage.getItem(storageKey);
        if (sessionId) {
          const response = await fetch(`/api/runtime/sessions/${sessionId}`, { cache: 'no-store' });
          if (response.ok) {
            const data = (await response.json()) as Snapshot;
            if (active) {
              setSnapshot(data);
              setLoading(false);
            }
            return;
          }
          window.localStorage.removeItem(storageKey);
        }
        if (active) await startNew();
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load the conversation.');
          setLoading(false);
        }
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [startNew, storageKey]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !snapshot) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/runtime/sessions/${snapshot.session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, idempotencyKey: crypto.randomUUID() }),
      });
      const data = (await response.json().catch(() => ({}))) as Snapshot & { error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? 'Unable to continue the flow.');
      setSnapshot(data);
      setDraft('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue the flow.');
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    window.localStorage.removeItem(storageKey);
    setSnapshot(null);
    try {
      await startNew();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start a new booking.');
      setLoading(false);
    }
  };

  return (
    <main className="runtime-console-shell">
      <header className="runtime-console-header">
        <div>
          <Link href="/app">← Flows</Link>
          <h1>{flowName}</h1>
          <p>{userEmail}</p>
        </div>
        <button type="button" onClick={reset} disabled={loading || sending}>New booking</button>
      </header>

      <div className="runtime-console-grid">
        <section className="runtime-chat-panel">
          <div className="runtime-chat-feed" aria-live="polite">
            {loading ? <p className="runtime-empty">Starting the published flow…</p> : null}
            {snapshot?.messages.map((message) => (
              <div key={message.id} className={`runtime-message runtime-message-${message.role}`}>
                <span>{message.role === 'user' ? 'You' : 'Maya'}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {snapshot?.booking ? (
              <article className="runtime-booking-card">
                <div className="runtime-booking-title">
                  <strong>Booking created</strong>
                  <span>{snapshot.booking.status}</span>
                </div>
                <dl>
                  <div><dt>Customer</dt><dd>{snapshot.booking.customerName}</dd></div>
                  <div><dt>Phone</dt><dd>{snapshot.booking.phone}</dd></div>
                  <div><dt>Vehicle</dt><dd>{snapshot.booking.vehicleModel}</dd></div>
                  <div><dt>Plate</dt><dd>{snapshot.booking.licensePlate}</dd></div>
                  <div><dt>Service</dt><dd>{snapshot.booking.serviceNeeded}</dd></div>
                  <div><dt>Date</dt><dd>{snapshot.booking.preferredDate}</dd></div>
                </dl>
                <small>Booking ID: {snapshot.booking.id}</small>
              </article>
            ) : null}
          </div>

          <form className="runtime-chat-input" onSubmit={send}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={snapshot?.session.status === 'waiting_for_input' ? 'Type your answer…' : 'Flow is not waiting for input'}
              disabled={sending || snapshot?.session.status !== 'waiting_for_input'}
              maxLength={1000}
            />
            <button type="submit" disabled={sending || !draft.trim() || snapshot?.session.status !== 'waiting_for_input'}>
              <Send size={18} />
            </button>
          </form>
          {error ? <p className="auth-error runtime-console-error">{error}</p> : null}
        </section>

        <aside className="runtime-inspector">
          <h2>Execution</h2>
          <dl className="runtime-stats">
            <div><dt>Status</dt><dd>{snapshot?.session.status ?? 'starting'}</dd></div>
            <div><dt>Version</dt><dd>v{snapshot?.session.flowVersion ?? '—'}</dd></div>
            <div><dt>Current node</dt><dd>{snapshot?.session.currentNodeId ?? '—'}</dd></div>
            <div><dt>Revision</dt><dd>{snapshot?.session.revision ?? 0}</dd></div>
            <div><dt>Outcome</dt><dd>{snapshot?.session.outcome ?? '—'}</dd></div>
          </dl>
          <h2>Captured variables</h2>
          <div className="runtime-variables">
            {Object.entries(snapshot?.session.variables ?? {}).map(([key, value]) => (
              <div key={key}><strong>{key}</strong><span>{value}</span></div>
            ))}
            {Object.keys(snapshot?.session.variables ?? {}).length === 0 ? <p>None yet.</p> : null}
          </div>
          <h2>Node trace</h2>
          <ol className="runtime-traces">
            {snapshot?.traces.map((trace) => (
              <li key={trace.id}><span>{trace.status}</span><strong>{trace.nodeId}</strong><small>{trace.nodeType}</small></li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}
