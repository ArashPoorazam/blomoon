"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import loginBackground from "@/assets/images/backgrounds/blomoon_login_background.webp";
import blomoonFullLogo from "@/assets/images/full_logo/Blomoon_Full_Logo.png";
import { AuthCard } from "./AuthCard";

type AuthGateProps = {
  googleAuthEnabled: boolean;
  serviceError?: string | null;
};

export function AuthGate({ googleAuthEnabled, serviceError }: AuthGateProps) {
  const router = useRouter();

  async function finishAuthenticatedFlow() {
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="auth-gate">
      <Image
        alt=""
        className="auth-background-image"
        fill
        priority
        sizes="100vw"
        src={loginBackground}
      />
      <div className="auth-background-vignette" aria-hidden="true" />

      <div className="auth-gate-layout">
        <section className="auth-brand" aria-labelledby="login-brand-title">
          <div className="auth-brand-lockup">
            <span className="auth-brand-kicker">LIVE ENTERTAINMENT DIRECTORY</span>
            <h1 className="auth-logo-title" id="login-brand-title">
              <Image
                alt="Blomoon"
                className="auth-logo"
                priority
                sizes="(max-width: 760px) 300px, 500px"
                src={blomoonFullLogo}
              />
            </h1>
          </div>
          <div className="auth-brand-message">
            <p>Follow live stations across cities, countries, and quiet corners of the globe.</p>
          </div>
          <nav className="auth-policy-links" aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </section>

        <AuthCard
          googleAuthEnabled={googleAuthEnabled}
          modeLabel="Account access"
          serviceError={serviceError}
          titleSuffix="Sign in to open the live globe."
          onAuthenticated={finishAuthenticatedFlow}
        />
      </div>
    </main>
  );
}
