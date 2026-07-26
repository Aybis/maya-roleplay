'use client';

import { usePathname } from 'next/navigation';
import { Compass, Drama, BarChart3, Settings as SettingsIcon, Plus } from 'lucide-react';
import type { SessionUser } from '@/lib/auth/session';
import { VirgilMark } from './brand/virgil-logo';
import SignOutButton from './sign-out-button';

const NAV_ITEMS = [
  { href: '/app', label: 'Explore', icon: Compass },
  { href: '/account/roleplays', label: 'My Roleplays', icon: Drama },
  { href: '/account/usage', label: 'Usage', icon: BarChart3 },
  { href: '/account/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <nav className="app-sidebar" aria-label="Main">
      <a className="app-sidebar-brand" href="/app">
        <span className="brand-mark">
          <VirgilMark size={18} />
        </span>
        <span>Virgil</span>
      </a>

      <a className="app-sidebar-cta" href="/flows/new">
        <Plus size={16} /> New roleplay
      </a>

      <div className="app-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <a key={item.href} href={item.href} className={`app-sidebar-link${active ? ' active' : ''}`}>
              <item.icon size={17} />
              {item.label}
            </a>
          );
        })}
      </div>

      <div className="app-sidebar-footer">
        <a className="app-sidebar-user" href="/account">
          <span className="app-sidebar-avatar">{user.email.charAt(0).toUpperCase()}</span>
          <span className="app-sidebar-user-info">
            <strong>{user.email}</strong>
            <span className="app-sidebar-plan">{user.plan === 'free' ? 'Free plan' : user.plan}</span>
          </span>
        </a>
        <SignOutButton className="app-sidebar-signout" />
      </div>
    </nav>
  );
}
