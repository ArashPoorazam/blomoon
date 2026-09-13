import { ZodError } from "zod";
import { checkCollectorToken, ingestSnapshot } from "@/lib/admin/monitor";
import { readAdminBody } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/access";
export async function POST(request: Request) {
  if (!checkCollectorToken(request.headers.get("authorization")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await ingestSnapshot(await readAdminBody(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json(
      { error: "Snapshot rejected." },
      {
        status:
          e instanceof AdminError
            ? e.status
            : e instanceof ZodError
              ? 400
              : 503,
      },
    );
  }
}
