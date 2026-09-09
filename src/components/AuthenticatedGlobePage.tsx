import { redirect } from "next/navigation";
import { getAppClientConfig } from "@/lib/app-config/server";
import { getOptionalUser, hasCompletedAuthentication } from "@/lib/auth/server";
import { getRadioFixtureDataset } from "@/lib/modes/radio";
import { safeLocalReturnPath } from "@/lib/sharing/links";
import { BlomoonApp } from "./BlomoonApp";

export async function AuthenticatedGlobePage({ returnPath = "/" }: { returnPath?: string }) {
  let user = null;
  try { user = await getOptionalUser(); } catch { redirect(`/login?next=${encodeURIComponent(safeLocalReturnPath(returnPath))}`); }
  if (!await hasCompletedAuthentication(user)) redirect(`/login?next=${encodeURIComponent(safeLocalReturnPath(returnPath))}`);
  return <BlomoonApp appConfig={getAppClientConfig()} initialDatasets={{ radio: getRadioFixtureDataset() }} />;
}
