import { adminRequest } from "@/lib/modes/radio/adminHttp";
import {
  listAdminStations,
  radioHealthMetrics,
  readAdminBody,
  saveCuratedStation,
} from "@/lib/modes/radio/admin";
export const GET = (request: Request) =>
  adminRequest(request, async () => {
    const [stations, metrics] = await Promise.all([
      listAdminStations(new URL(request.url).searchParams.get("q") ?? ""),
      radioHealthMetrics(),
    ]);
    return { stations, metrics };
  });
export const POST = (request: Request) =>
  adminRequest(request, async (actor) => saveCuratedStation(actor, await readAdminBody(request)), 201);
