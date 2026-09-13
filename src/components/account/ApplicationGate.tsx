"use client";
import { useEffect, useState } from "react";
import type { AppClientConfig } from "@/lib/app-config/types";
import type { TerraDataset } from "@/lib/modes/types";
import { BlomoonApp } from "../BlomoonApp";
export type ApplicationState = {
  authenticated: boolean;
  maintenance: boolean;
  message: string;
  enabledModes: string[];
  announcement: string;
  supportEmail: string;
};
export function ApplicationGate({
  initial,
  appConfig,
  initialDatasets,
}: {
  initial: ApplicationState;
  appConfig: AppClientConfig;
  initialDatasets: Record<string, TerraDataset>;
}) {
  const [state, setState] = useState(initial),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/application-state", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error();
        const next = await response.json();
        if (active) {
          setState(next);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const unavailable =
    error ||
    !state.authenticated ||
    state.maintenance ||
    !state.enabledModes.length;
  return unavailable ? (
    <main className="application-unavailable">
      <h1>
        {!state.authenticated
          ? "Please sign in"
          : "Blomoon is temporarily unavailable"}
      </h1>
      <p>
        {error
          ? "Unable to verify application availability. Reconnecting…"
          : !state.authenticated
            ? "Your session has ended or account access has changed."
            : state.maintenance
              ? state.message
              : "No media modes are currently enabled."}
      </p>
      <a href={!state.authenticated ? "/login" : "/omnisire"}>
        {!state.authenticated ? "Sign in" : "Owner access"}
      </a>
    </main>
  ) : (
    <>
      <BlomoonApp
        key={state.enabledModes.join(",")}
        enabledModeIds={state.enabledModes}
        appConfig={{
          ...appConfig,
          contactLinks: [
            {
              id: "email",
              href: `mailto:${state.supportEmail}`,
              label: "Email",
              value: state.supportEmail,
            },
          ],
        }}
        initialDatasets={initialDatasets}
      />
      {state.announcement && (
        <aside className="application-announcement" role="status">
          {state.announcement}
        </aside>
      )}
    </>
  );
}
