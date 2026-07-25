'use client';

import { Heart, MessageCircle, Sparkles, Workflow } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Mode = 'signin' | 'signup';

const COPY: Record<Mode, { title: string; subtitle: string; cta: string; endpoint: string }> = {
  signin: {
    title: 'Welcome back',
    subtitle: 'Sign in to pick up your story with Maya.',
    cta: 'Sign in',
    endpoint: '/api/auth/login',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'A few seconds, then Maya is ready to talk.',
    cta: 'Create account',
    endpoint: '/api/auth/signup',
  },
};

const FEATURES = [
  { icon: Heart, text: 'A warm voice companion, ready whenever you want to talk' },
  { icon: Sparkles, text: 'Describe any character and get a working flow in seconds' },
  { icon: Workflow, text: 'Multi-step flows with branching logic and webhooks' },
  { icon: MessageCircle, text: 'Real-time voice conversation, not just text' },
];

export default function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[mode];

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      window.location.href = safeReturnTo();
    } catch {
      setError('Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  };

  function safeReturnTo(): string {
    const raw = new URLSearchParams(window.location.search).get('return_to');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
    return raw;
  }

  return (
    <main className="auth-split">
      <section className="auth-split-brand">
        <a className="brand auth-split-logo" href="/" aria-label="Maya home">
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>Maya</span>
        </a>

        <h1 className="auth-split-headline">Stories that talk back.</h1>
        <p className="auth-split-tagline">
          A cozy voice companion, and a builder for creating your own — from a simple chat
          buddy to a fully automated conversation flow.
        </p>

        <ul className="auth-split-features">
          {FEATURES.map((feature) => (
            <li key={feature.text}>
              <span className="auth-split-feature-icon">
                <feature.icon size={16} />
              </span>
              {feature.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="auth-split-form-side">
        <div className="auth-card">
          <a className="brand auth-card-mobile-brand" href="/" aria-label="Maya home">
            <span className="brand-mark">
              <Sparkles size={18} />
            </span>
            <span>Maya</span>
          </a>

          <h1 className="auth-title">{copy.title}</h1>
          <p className="auth-subtitle">{copy.subtitle}</p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input"
            />

            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input"
            />

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Please wait…' : copy.cta}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'signin' ? (
              <>
                New here? <a href="/signup">Create an account</a>
              </>
            ) : (
              <>
                Already have an account? <a href="/signin">Sign in</a>
              </>
            )}
          </p>

          {mode === 'signup' ? (
            <p className="auth-switch">
              By creating an account you agree to our <a href="/terms">Terms</a> and{' '}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
