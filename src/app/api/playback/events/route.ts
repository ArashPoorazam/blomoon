import { playbackDiagnosticSchema } from "@/lib/modes/playbackDiagnostics";
import { logger } from "@/lib/server/logging";

// Bound anonymous diagnostic traffic per process without storing client identifiers.
let windowStarted = 0;
let accepted = 0;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  let sameHost = false;
  try {
    const source = new URL(origin ?? "");
    // Next's internal request URL can use localhost behind a reverse proxy.
    sameHost = ["http:", "https:"].includes(source.protocol) && source.host === (request.headers.get("host") ?? new URL(request.url).host);
  } catch { /* Missing or malformed origins are not browser diagnostics. */ }
  if (!sameHost) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const now = Date.now();
  if (now - windowStarted >= 60_000) { windowStarted = now; accepted = 0; }
  if (accepted++ >= 1200) return new Response(null, { status: 204 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2048) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const result = playbackDiagnosticSchema.safeParse(JSON.parse(body));
    if (!result.success) return new Response(null, { status: 400 });
    logger.info("playback.client.outcome", { context: result.data, message: "Browser playback outcome (client reported)" });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
