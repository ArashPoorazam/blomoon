import { getOptionalUser } from "@/lib/auth/server";
import { applicationState } from "@/lib/admin/application-state";
export async function GET() {
  try { return Response.json(await applicationState(await getOptionalUser()), {headers:{"Cache-Control":"no-store"}}); }
  catch { return Response.json({error:"Application state unavailable."},{status:503,headers:{"Cache-Control":"no-store"}}); }
}
