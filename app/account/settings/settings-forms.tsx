'use client';

import { FormEvent, useState } from 'react';

export default function SettingsForms({ defaultFlowVisibility }: { defaultFlowVisibility: 'public' | 'private' }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [visibility, setVisibility] = useState(defaultFlowVisibility);
  const [visibilitySaved, setVisibilitySaved] = useState(false);
  const [visibilitySubmitting, setVisibilitySubmitting] = useState(false);

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    setPasswordSubmitting(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setPasswordError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
    } catch {
      setPasswordError('Could not reach the server. Please try again.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const onChangeVisibility = async (next: 'public' | 'private') => {
    setVisibility(next);
    setVisibilitySaved(false);
    setVisibilitySubmitting(true);
    try {
      await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultFlowVisibility: next }),
      });
      setVisibilitySaved(true);
    } finally {
      setVisibilitySubmitting(false);
    }
  };

  return (
    <div className="profile-grid">
      <section className="profile-card profile-card-wide">
        <h2 className="profile-card-title">Change password</h2>
        <form className="auth-form" onSubmit={onChangePassword}>
          <label className="auth-label" htmlFor="currentPassword">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="auth-input"
          />

          <label className="auth-label" htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="auth-input"
          />

          {passwordError ? <p className="auth-error">{passwordError}</p> : null}
          {passwordSaved ? <p className="field-hint">Password updated.</p> : null}

          <button type="submit" className="auth-submit" disabled={passwordSubmitting}>
            {passwordSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>

      <section className="profile-card">
        <h2 className="profile-card-title">New flow default</h2>
        <p className="field-hint">Choose what visibility new flows start with when you create them.</p>
        <div className="settings-visibility-options">
          <button
            type="button"
            className={`settings-visibility-option${visibility === 'public' ? ' active' : ''}`}
            onClick={() => onChangeVisibility('public')}
            disabled={visibilitySubmitting}
          >
            <strong>Public</strong>
            <span>Anyone can find and start it</span>
          </button>
          <button
            type="button"
            className={`settings-visibility-option${visibility === 'private' ? ' active' : ''}`}
            onClick={() => onChangeVisibility('private')}
            disabled={visibilitySubmitting}
          >
            <strong>Private</strong>
            <span>Only you can start it</span>
          </button>
        </div>
        {visibilitySaved ? <p className="field-hint">Saved.</p> : null}
      </section>
    </div>
  );
}
