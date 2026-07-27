import type { SessionUser } from '@/lib/auth/session';
import AppSidebar from './app-sidebar';

export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="app-shell-frame">
      <AppSidebar user={user} />
      <main className="app-shell-main">{children}</main>
    </div>
  );
}
