import type { SessionUser } from "@/lib/auth/session";
import { MayaMark } from "./brand/maya-logo";
import SignOutButton from "./sign-out-button";

export default function SiteHeader({ user }: { user: SessionUser | null }) {
  const homeHref = user ? "/app" : "/";
  return (
    <header className="site-header">
      <a className="brand" href={homeHref}>
        <span className="brand-mark">
          <MayaMark size={18} />
        </span>
        <span>Maya</span>
      </a>

      <nav className="site-nav">
        <a href={homeHref}>Explore</a>
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
