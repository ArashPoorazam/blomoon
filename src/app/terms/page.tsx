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
          <p>Last updated: <time dateTime="2026-09-10">September 10, 2026</time></p>
          <h1>Terms of Service</h1>
          <p>
            These terms describe the rules for using Blomoon, a globe-based directory for discovering streamable live entertainment by geography.
          </p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Who Operates Blomoon</h2>
            <p>
              Blomoon is an independent web app operated by a solo developer based in Iran, using the public name Daedalus.
              Blomoon is the app name, not a registered company. In this document, “we”, “us”, and “our” refer to its operator.
              You can contact us using the email address below.
            </p>
          </section>
          <section className="legal-section">
            <h2>Using Blomoon</h2>
            <p>
              By using Blomoon, you agree to these terms. If you do not agree, do not use the service.
              You must be legally able to agree to these terms, or have permission from a parent or guardian where required.
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
            <h2>Ownership And Third-Party Content</h2>
            <p>
              Rights in the original Blomoon design, branding, and software belong to Daedalus, except for material covered by
              third-party or open-source licenses. Those licenses continue to apply. These terms allow you to use the service;
              they do not transfer ownership of it or grant rights to record, redistribute, or commercially exploit broadcasts.
            </p>
            <p>
              A directory listing does not imply endorsement or ownership of a station. If you believe a listing infringes your rights,
              email us with the listing URL, a description of the issue, and information showing your authority to make the request.
            </p>
          </section>

          <section className="legal-section">
            <h2>Account Suspension And Closure</h2>
            <p>
              You may stop using Blomoon at any time and request account deletion by email. We may restrict or suspend access
              when reasonably necessary to address misuse, security risks, legal obligations, or a breach of these terms.
              You can contact us to ask about or dispute a restriction. Personal data is handled as described in the Privacy Policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>Service Limitations And Responsibility</h2>
            <p>
              Blomoon is provided on an “as available” basis. To the extent permitted by applicable law, we do not promise
              uninterrupted access, error-free directory information, or that a particular stream will remain available or suit your needs.
              Third-party services have their own terms and privacy practices.
            </p>
            <p>
              To the extent permitted by applicable law, we are not liable for indirect or consequential losses arising from use of the service.
              Nothing in these terms excludes liability that cannot lawfully be excluded, or limits mandatory consumer rights.
            </p>
          </section>

          <section className="legal-section">
            <h2>Applicable Law And Disputes</h2>
            <p>
              These terms are governed by the laws of Iran, subject to any mandatory protections that apply to you under other applicable laws.
              Please contact us first so we can try to resolve a concern. Nothing here removes your right to seek a remedy before a competent
              court or authority, or requires you to waive rights that cannot lawfully be waived.
            </p>
          </section>

          <section className="legal-section">
            <h2>Changes And Availability</h2>
            <p>
              Blomoon may change features, providers, account functionality, or these terms as the product evolves. The service may be interrupted or
              unavailable at times. Updated terms will be posted here with a revised date. Where applicable law requires
              notice or consent for a change, we will provide it or request it before that change applies.
            </p>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <p className="legal-contact">
              For terms or account questions, email <a href={`mailto:${BLOMOON_SUPPORT_EMAIL}`}>{BLOMOON_SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <footer className="legal-contact">
            <p>Official site: {BLOMOON_CANONICAL_ORIGIN}</p>
            <p>© 2026 Daedalus. All rights reserved.</p>
            <p>Third-party media, names, and logos belong to their respective owners.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
