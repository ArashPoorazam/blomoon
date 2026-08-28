import { redirect } from "next/navigation";
import { AuthGate } from "@/components/account/AuthGate";
import { getAppClientConfig } from "@/lib/app-config/server";
import { getOptionalUser, hasCompletedAuthentication } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let serviceError: string | null = null;
  let user = null;

  if (!isDatabaseConfigured()) {
    serviceError = "Account access is unavailable because DATABASE_URL is not configured.";
  } else {
    try {
      user = await getOptionalUser();
    } catch {
      serviceError = "Account access is unavailable until the database migrations have run.";
    }

    if (await hasCompletedAuthentication(user)) {
      redirect("/");
    }
  }

  return (
    <AuthGate
      googleAuthEnabled={getAppClientConfig().googleAuthEnabled}
      serviceError={serviceError}
    />
  );
}
