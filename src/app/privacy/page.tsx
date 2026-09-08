import type { Metadata } from "next";
import Link from "next/link";
import {
  BLOMOON_CANONICAL_ORIGIN,
  BLOMOON_SUPPORT_EMAIL,
  BLOMOON_TERMS_PATH
} from "@/lib/app-config/public";

export const metadata: Metadata = {
  alternates: {
    canonical: "/privacy"
  },
  description: "How Blomoon collects, uses, and protects account and Google sign-in data.",
  title: "Privacy Policy | Blomoon"
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <nav className="legal-nav" aria-label="Legal navigation">
          <Link href="/">Blomoon</Link>
          <Link href={BLOMOON_TERMS_PATH}>Terms</Link>
        </nav>

        <header className="legal-header">
          <div className="drawer-kicker">Blomoon privacy policy</div>
          <h1>Privacy Policy</h1>
          <p>
            Blomoon is a globe-based live entertainment directory. This policy explains what account information is used to run the service.
          </p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Information We Collect</h2>
            <p>
              When you create an account, Blomoon stores the email address and authentication details needed to sign you in, verify your email, and keep
              your saved stations and theme preferences available.
            </p>
            <p>
              When playback successfully starts, Blomoon stores the station, the most recent playback time, and the listener’s local calendar date. History
              is limited to the 50 most recent station-day entries for each media mode.
            </p>
            <p>
              If you sign in with Google, Blomoon receives basic Google account profile information used for authentication, such as your email address,
              name, profile image, and Google account identifier.
            </p>
          </section>

          <section className="legal-section">
            <h2>How We Use Information</h2>
            <ul>
              <li>Authenticate your account and keep you signed in.</li>
              <li>Store favorites, account preferences, and recent playback history.</li>
              <li>Suggest radio stations using your saved stations and recent playback history. Temporary suggestion lists are kept for browsing and expire after one hour.</li>
              <li>Send account verification and security-related emails.</li>
              <li>Diagnose service reliability issues and protect the app from abuse.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>Google User Data</h2>
            <p>
              Blomoon uses Google user data only for sign-in and account identity. Blomoon does not request access to Gmail, Google Drive, Google Calendar,
              contacts, or other Google product content.
            </p>
            <p>
              Blomoon does not sell Google user data. Access is limited to what is needed to provide account access and related account features.
            </p>
          </section>

          <section className="legal-section">
            <h2>Data Sharing</h2>
            <p>
              Blomoon uses service providers for hosting, database storage, authentication, and transactional email. These providers process information
              only as needed to operate the service. Blomoon may disclose information if required by law or to protect the service and users.
            </p>
          </section>

          <section className="legal-section">
            <h2>Data Retention And Deletion</h2>
            <p>
              Blomoon keeps account information while your account is active. You can request account or data deletion by contacting support from the email
              address associated with your account.
            </p>
            <p>
              Deleting your account also deletes its saved stations, preferences, and recent playback history.
            </p>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <p className="legal-contact">
              For privacy questions or account requests, email <a href={`mailto:${BLOMOON_SUPPORT_EMAIL}`}>{BLOMOON_SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <p className="legal-contact">Canonical site: {BLOMOON_CANONICAL_ORIGIN}</p>
        </div>
      </div>
    </main>
  );
}
