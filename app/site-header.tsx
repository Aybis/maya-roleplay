import { Sparkles } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import SignOutButton from "./sign-out-button";

export default function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        <span className="brand-mark">
          <Sparkles size={18} />
        </span>
        <span>Maya</span>
      </a>

      <nav className="site-nav">
        <a href="/">Explore</a>
        <a href="/pricing">Pricing</a>
      </nav>

      <div className="site-header-right">
        {user ? (
          <div className="account-pill" title={user.email}>
            <a className="account-email" href="/account">
              {user.email}
            </a>
            <SignOutButton />
          </div>
        ) : (
          <div className="site-header-auth-links">
            <a href="/signin">Sign in</a>
            <a href="/signup" className="site-header-cta">
              Sign up
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
