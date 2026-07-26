import { getSessionUser } from "@/lib/auth/session";
import SiteHeader from "../site-header";

export const metadata = { title: "Privacy Policy — Maya" };

export default async function PrivacyPage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader user={user} />
      <main className="legal-shell">
      <div className="legal-card">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: [DATE] — draft, not yet reviewed by a lawyer.</p>

        <p className="legal-disclaimer">
          This is a starting template, not legal advice. Have a lawyer review it against the
          privacy laws that apply to your users (e.g. GDPR, CCPA) before you rely on it in
          production. Replace every [bracketed] placeholder with your real details.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> email address and a hashed password (we never store
            your password in plain text).
          </li>
          <li>
            <strong>Conversation data:</strong> the audio and text you send to Maya, and Maya&apos;s
            replies, so the conversation can happen and so we can debug problems.
          </li>
          <li>
            <strong>Usage data:</strong> timestamps of voice sessions and messages, used to
            enforce fair-use limits and to understand how the Service is used.
          </li>
          <li>
            <strong>Billing data:</strong> handled directly by Stripe. We store your subscription
            status and Stripe customer/subscription IDs, but never your card number.
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <p>
          To provide and improve the Service, authenticate you, enforce usage limits and these
          Terms, process payments, and communicate with you about your account.
        </p>

        <h2>3. Third-party processors</h2>
        <p>Depending on how this deployment is configured, your voice and text may be sent to:</p>
        <ul>
          <li>
            <strong>Google (Gemini API)</strong> — real-time voice conversation
          </li>
          <li>
            <strong>ElevenLabs</strong> — text-to-speech voice generation
          </li>
          <li>
            <strong>Surplus Intelligence</strong> — speech-to-text, language model, and/or
            text-to-speech, if enabled
          </li>
          <li>
            <strong>Stripe</strong> — payment processing
          </li>
        </ul>
        <p>
          Each of these providers processes data under their own privacy policy. We only send
          them what&apos;s needed to run the conversation or transaction.
        </p>

        <h2>4. Data retention</h2>
        <p>
          We retain account and conversation data for as long as your account is active. You can
          request deletion at any time (see &quot;Your rights&quot; below); we&apos;ll delete your account
          record and stop retaining new conversation data going forward.
        </p>

        <h2>5. Cookies</h2>
        <p>
          We use a single essential cookie to keep you signed in. We don&apos;t use advertising or
          cross-site tracking cookies.
        </p>

        <h2>6. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, or
          delete your personal data. Email [support email] to make a request.
        </p>

        <h2>7. Security</h2>
        <p>
          Passwords are hashed (never stored in plain text), sessions use httpOnly cookies, and
          all traffic is encrypted in transit. No system is perfectly secure, and we can&apos;t
          guarantee absolute security.
        </p>

        <h2>8. Children&apos;s privacy</h2>
        <p>Maya is intended for users 18 and older. We don&apos;t knowingly collect data from minors.</p>

        <h2>9. Changes</h2>
        <p>
          We may update this policy from time to time. We&apos;ll post the updated version here with
          a new &quot;Last updated&quot; date.
        </p>

        <h2>10. Contact</h2>
        <p>Questions about this policy? Email [support email].</p>

        <p className="legal-switch">
          <a href="/terms">Terms of Service</a> · <a href="/">Back to Maya</a>
        </p>
      </div>
      </main>
    </>
  );
}
