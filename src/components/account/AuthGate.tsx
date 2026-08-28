"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import loginBackground from "@/assets/images/backgrounds/blomoon_login_background.webp";
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
          <h1 id="login-brand-title">Blomoon</h1>
          <p>Explore live entertainment streams through a focused globe built around place, signal, and discovery.</p>
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
