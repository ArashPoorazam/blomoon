"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import loginBackground from "@/assets/images/backgrounds/blomoon_login_background.webp";
import blomoonLogo from "@/assets/images/logo/Blomoon_Logo.webp";
import blomoonSymbol from "@/assets/images/symbol/Blomoon_symbol.webp";
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
            <div className="auth-symbol-frame" aria-hidden="true">
              <Image
                alt=""
                className="auth-symbol"
                priority
                sizes="(max-width: 760px) 132px, 180px"
                src={blomoonSymbol}
              />
            </div>
            <div className="auth-logo-stack">
              <span className="auth-brand-kicker">LIVE ENTERTAINMENT DIRECTORY</span>
              <h1 className="auth-logo-title" id="login-brand-title">
                <Image
                  alt="Blomoon"
                  className="auth-logo"
                  priority
                  sizes="(max-width: 760px) 230px, 360px"
                  src={blomoonLogo}
                />
              </h1>
            </div>
          </div>
          <div className="auth-brand-message">
            <p className="auth-brand-motto">Tune the planet by place.</p>
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
