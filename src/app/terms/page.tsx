import type { Metadata } from "next";
import Link from "next/link";
import {
  BLOMOON_CANONICAL_ORIGIN,
  BLOMOON_PRIVACY_PATH,
  BLOMOON_SUPPORT_EMAIL
} from "@/lib/app-config/public";

export const metadata: Metadata = {
  alternates: {
    canonical: "/terms"
  },
  description: "Terms for using Blomoon's globe-based live entertainment directory.",
  title: "Terms of Service | Blomoon"
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <nav className="legal-nav" aria-label="Legal navigation">
          <Link href="/">Blomoon</Link>
          <Link href={BLOMOON_PRIVACY_PATH}>Privacy</Link>
        </nav>

        <header className="legal-header">
          <div className="drawer-kicker">Blomoon terms of service</div>
          <h1>Terms of Service</h1>
          <p>
            These terms describe the basic rules for using Blomoon, a globe-based directory for discovering streamable live entertainment by geography.
          </p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Using Blomoon</h2>
            <p>
              You may use Blomoon to discover public media directory entries, play supported streams in your browser, and save account preferences and
              favorites when signed in.
            </p>
          </section>

          <section className="legal-section">
            <h2>Accounts</h2>
            <p>
              You are responsible for keeping your account access secure. Google sign-in is used only to authenticate your Blomoon account when you choose
              that option.
            </p>
          </section>

          <section className="legal-section">
            <h2>Media Streams</h2>
            <p>
              Blomoon indexes and resolves third-party stream metadata. Availability, quality, licensing, and content are controlled by the stream
              providers, not Blomoon.
            </p>
          </section>

          <section className="legal-section">
            <h2>Acceptable Use</h2>
            <ul>
              <li>Do not misuse the service, disrupt availability, or attempt unauthorized access.</li>
              <li>Do not use Blomoon to violate laws, provider terms, or third-party rights.</li>
              <li>Do not scrape, overload, or reverse engineer the service except where allowed by law.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>Changes And Availability</h2>
            <p>
              Blomoon may change features, providers, account functionality, or these terms as the product evolves. The service may be interrupted or
              unavailable at times.
            </p>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <p className="legal-contact">
              For terms or account questions, email <a href={`mailto:${BLOMOON_SUPPORT_EMAIL}`}>{BLOMOON_SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <p className="legal-contact">Canonical site: {BLOMOON_CANONICAL_ORIGIN}</p>
        </div>
      </div>
    </main>
  );
}
