'use client';

export default function SignOutButton({ className = 'account-signout' }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          window.location.href = '/signin';
        });
      }}
    >
      Sign out
    </button>
  );
}
