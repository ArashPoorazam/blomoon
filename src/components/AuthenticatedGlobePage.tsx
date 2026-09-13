import { redirect } from "next/navigation";
import { getAppClientConfig } from "@/lib/app-config/server";
import { getOptionalUser, hasCompletedAuthentication } from "@/lib/auth/server";
import { getStartupDatasets } from "@/lib/modes/startup";
import { applicationState } from "@/lib/admin/application-state";
import { ApplicationGate } from "./account/ApplicationGate";
import { safeLocalReturnPath } from "@/lib/sharing/links";

export async function AuthenticatedGlobePage({ returnPath = "/" }: { returnPath?: string }) {
  let user = null;
  try { user = await getOptionalUser(); } catch { redirect(`/login?next=${encodeURIComponent(safeLocalReturnPath(returnPath))}`); }
  if (!await hasCompletedAuthentication(user)) redirect(`/login?next=${encodeURIComponent(safeLocalReturnPath(returnPath))}`);
  const state=await applicationState(user);
  const datasets=state.maintenance ? {} : await getStartupDatasets(state.enabledModes);
  return <ApplicationGate initial={state} appConfig={getAppClientConfig()} initialDatasets={datasets}/>;
}
