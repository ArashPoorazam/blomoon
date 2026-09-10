import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/server/logging", () => ({ logger: { info: vi.fn() } }));
import { POST } from "./route";
import { logger } from "@/lib/server/logging";
const event = { modeId: "radio", pointId: "station-123", outcome: "timeout", lookupMs: 100, startupMs: 30000, mediaErrorCode: 0, readyState: 1, networkState: 2, browser: "chrome" };
function request(body: unknown, origin = "https://blomoon.example") {
  return new Request("https://blomoon.example/api/playback/events", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
describe("playback diagnostics", () => {
  it("accepts a bounded outcome without user or stream URL data", async () => {
    expect((await POST(request(event))).status).toBe(204);
    expect(logger.info).toHaveBeenCalledWith("playback.client.outcome", expect.objectContaining({ context: event }));
  });
  it("rejects foreign origins, extra payload fields and invalid measurements", async () => {
    expect((await POST(request(event, "https://other.example"))).status).toBe(403);
    expect((await POST(request({ ...event, streamUrl: "https://secret.example" }))).status).toBe(400);
    expect((await POST(request({ ...event, startupMs: -1 }))).status).toBe(400);
    expect((await POST(request({ ...event, outcome: "arbitrary log text" }))).status).toBe(400);
  });
  it("accepts the browser host when Next uses an internal request URL", async () => {
    const proxied = new Request("http://localhost:3000/api/playback/events", { method: "POST", headers: { origin: "https://blomoon.example", host: "blomoon.example", "content-type": "application/json" }, body: JSON.stringify(event) });
    expect((await POST(proxied)).status).toBe(204);
  });
  it("bounds the actual body size without trusting content-length", async () => {
    expect((await POST(request({ data: "x".repeat(3000) }))).status).toBe(413);
  });
});
