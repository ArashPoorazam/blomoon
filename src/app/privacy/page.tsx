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
          <p>Last updated: <time dateTime="2026-09-10">September 10, 2026</time></p>
          <h1>Privacy Policy</h1>
          <p>
            Blomoon is a globe-based live entertainment directory. This policy explains how personal information is handled when you use the service.
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
            <h2>Session Information And Browser Storage</h2>
            <p>
              Authentication uses cookies to keep you signed in. Session records may include your IP address, browser information,
              and expiry time. We also store login timestamps and counts. Operational logs help diagnose errors and prevent abuse.
              If you contact support, we receive your email address and the information you include in your message.
            </p>
            <p>
              Your browser may store display preferences, such as the globe crosshair setting, and cache app files.
              You can clear cookies, local storage, and cached files in your browser settings. Clearing or blocking these may sign you out
              or reset preferences; it does not delete account data held on the server.
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
            <h2>Streams, External Services, And Shared Folders</h2>
            <p>
              Playing a stream connects your browser to the third-party broadcaster or stream host. Loading external images or
              opening provider links may also connect you to external services. These services receive connection information such as
              your IP address and browser details and handle it under their own privacy policies. Blomoon does not control their retention practices.
            </p>
            <p>
              If you share a favorites folder, people with access to its link can see the shared folder information and station list.
              They may copy that information. Avoid putting private information in shared folder names.
            </p>
            <p>
              Blomoon is operated from Iran. External services may process information in other countries under different privacy laws.
              Contact us for information about the providers involved in your use of the service.
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
            <h2>Your Choices And Privacy Requests</h2>
            <p>
              You can contact us to request access to, correction of, or deletion of your personal information.
              Depending on applicable law, you may also have rights to obtain a portable copy, object to or restrict processing,
              withdraw consent where processing relies on it, or complain to a competent data protection authority.
              Withdrawing consent does not affect earlier lawful processing.
            </p>
            <p>
              We may need to verify that a request relates to your account. Please do not send passwords or verification codes.
              We will handle requests under applicable law and explain any reason we cannot fully fulfill one.
              Account information is needed to provide signed-in features; deleting it ends access to those features.
            </p>
          </section>

          <section className="legal-section">
            <h2>Security And Children</h2>
            <p>
              We use account authentication and access controls to protect personal information, but no online service can guarantee
              absolute security. Blomoon is a general-audience directory and is not designed specifically for children.
              If you believe a child has provided personal information without legally required permission, contact us so we can investigate.
            </p>
          </section>

          <section className="legal-section">
            <h2>Policy Updates</h2>
            <p>
              We will update this page and its revision date when our practices change. Where applicable law requires additional
              notice or consent, we will provide notice or request consent. This policy does not replace permissions required by law.
            </p>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <p className="legal-contact">
              For privacy questions or account requests, email <a href={`mailto:${BLOMOON_SUPPORT_EMAIL}`}>{BLOMOON_SUPPORT_EMAIL}</a>.
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
