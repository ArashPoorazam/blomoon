import { requireUser } from "@/lib/auth/server";
import { findTerraMode } from "@/lib/modes/registry";
import { PLAYBACK_HISTORY_LIMIT } from "@/lib/playback-history/history";
import { listPlaybackHistory, recordPlaybackStart } from "@/lib/playback-history/repository";
import { getModePersistenceAdapter } from "@/lib/persistence/registry";
import { withApiLogging } from "@/lib/server/logging/api";
import { playbackHistoryInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export const GET = withApiLogging("api.users.me.playback_history.list", async (request: Request) => {
  const user = await requireUser();
  const modeId = new URL(request.url).searchParams.get("modeId") ?? "";
  const mode = findTerraMode(modeId);
  if (!mode) return Response.json({ error: "modeId must identify a registered media mode." }, { status: 400, headers: NO_STORE_HEADERS });
  const items = await listPlaybackHistory(user.id, mode.id);
  return Response.json({ items, limit: PLAYBACK_HISTORY_LIMIT }, { headers: NO_STORE_HEADERS });
}, { noStore: true });

export const POST = withApiLogging("api.users.me.playback_history.record", async (request: Request) => {
  const user = await requireUser();
  const parsed = playbackHistoryInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Provide a registered mode, valid point id, and timezone offset from -840 to 720." }, { status: 400, headers: NO_STORE_HEADERS });
  const mode = findTerraMode(parsed.data.modeId);
  const adapter = mode ? getModePersistenceAdapter(mode.id) : null;
  if (!mode || !adapter) return Response.json({ error: "modeId must identify a registered media mode." }, { status: 400, headers: NO_STORE_HEADERS });
  if (!adapter.isPointId(parsed.data.pointId)) return Response.json({ error: "pointId is invalid for this media mode." }, { status: 400, headers: NO_STORE_HEADERS });
  const item = await recordPlaybackStart({ ...parsed.data, modeId: mode.id, userId: user.id });
  if (!item) return Response.json({ error: `${mode.copy.itemSingular} not found.` }, { status: 404, headers: NO_STORE_HEADERS });
  return Response.json({ item }, { headers: NO_STORE_HEADERS });
}, { noStore: true });

async function readJson(request: Request) {
  try { return await request.json(); } catch { return null; }
}
