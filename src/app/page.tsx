import { redirect } from "next/navigation";
import { BlomoonApp } from "@/components/BlomoonApp";
import { getAppClientConfig } from "@/lib/app-config/server";
import { getOptionalUser, hasCompletedAuthentication } from "@/lib/auth/server";
import { getRadioFixtureDataset } from "@/lib/modes/radio";

export const dynamic = "force-dynamic";

export default async function Home() {
  let user = null;

  try {
    user = await getOptionalUser();
  } catch {
    redirect("/login");
  }

  if (!await hasCompletedAuthentication(user)) {
    redirect("/login");
  }

  return (
    <BlomoonApp
      appConfig={getAppClientConfig()}
      initialDatasets={{
        radio: getRadioFixtureDataset()
      }}
    />
  );
}
