import { AuthenticatedGlobePage } from "@/components/AuthenticatedGlobePage";
import { stationSharePath } from "@/lib/sharing/links";

export const dynamic = "force-dynamic";
export default async function SharedStationPage({ params }: { params: Promise<{ modeId: string; pointId: string }> }) {
  const { modeId, pointId } = await params;
  return <AuthenticatedGlobePage returnPath={stationSharePath(modeId, pointId)} />;
}
