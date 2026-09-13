import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/admin/enforcement", () => ({ publicRestriction: vi.fn(async () => null) }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/modes/radio/playback", async importOriginal => ({ ...await importOriginal<object>(), getRadioPlayableStream: vi.fn(), recordRadioPlaybackClick: vi.fn() }));
vi.mock("@/lib/server/logging", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { after } from "next/server";
import { getRadioPlayableStream, RadioResolutionError } from "@/lib/modes/radio/playback";
import { POST } from "./route";
const id = "46d2e1f5-b7ec-464e-9913-cb848488abdc";
const request = (query = "") => POST(new Request(`https://app.example/api/playable${query}`, { method: "POST" }), { params: Promise.resolve({ id }) });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getRadioPlayableStream).mockResolvedValue({ providerId: id, stream: { streamUrl: "https://radio.example/live", alternatives: [], pointId: id, checkedAt: new Date().toISOString(), mediaKind: "audio" } }); });
it("passes refresh and cancellation, omits provider internals and defers counting", async () => {
  for (const query of ["", "?refresh=true"]) {
    const res = await request(query); expect(res.status).toBe(200); expect(await res.json()).not.toHaveProperty("providerId");
    expect(getRadioPlayableStream).toHaveBeenLastCalledWith(id, query !== "", expect.any(AbortSignal)); expect(res.headers.get("cache-control")).toBe("no-store");
  }
  expect(after).toHaveBeenCalledTimes(2);
});
it("rejects invalid refresh", async () => {
  for (const query of ["?refresh=false", "?refresh=1", "?refresh=", "?refresh=true&refresh=true"]) expect((await request(query)).status).toBe(400);
  expect(getRadioPlayableStream).not.toHaveBeenCalled();
});
it.each([["invalid_input",400],["not_found",404],["provider_failure",502],["resolution_timeout",503],["no_source",409]] as const)("reports %s", async (code, status) => {
  vi.mocked(getRadioPlayableStream).mockRejectedValue(new RadioResolutionError(code)); const res = await request(); expect(res.status).toBe(status); expect(await res.json()).toMatchObject({ code }); expect(after).toHaveBeenCalledTimes(status >= 500 ? 1 : 0);
});
it("does not expose internal errors", async () => {
  vi.mocked(getRadioPlayableStream).mockRejectedValue(new Error("private details")); const res = await request(); expect(res.status).toBe(500); expect(await res.text()).not.toContain("private details");
});
