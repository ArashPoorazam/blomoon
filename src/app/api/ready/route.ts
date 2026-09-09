import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  let client: ReturnType<typeof postgres> | undefined;
  let ready = false;
  try {
    if (!process.env.DATABASE_URL) throw new Error("Database unavailable");
    client = postgres(process.env.DATABASE_URL, {
      max: 1, prepare: false, connect_timeout: 3, idle_timeout: 1,
      connection: { statement_timeout: 3000 }
    });
    await client`select 1`;
    ready = true;
  } catch {
    // Readiness is public: do not expose connection or query details.
  } finally {
    try { await client?.end({ timeout: 1 }); } catch { ready = false; }
  }
  return Response.json({ service: "blomoon", status: ready ? "ok" : "unavailable", timestamp: new Date().toISOString() }, {
    status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" }
  });
}
