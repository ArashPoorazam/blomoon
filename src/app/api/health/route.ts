export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    service: "blomoon",
    status: "ok",
    timestamp: new Date().toISOString()
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
