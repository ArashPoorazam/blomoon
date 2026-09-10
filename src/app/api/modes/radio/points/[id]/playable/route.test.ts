import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/modes/radio", () => ({ getRadioPlayableStream: vi.fn() }));
import { getRadioPlayableStream } from "@/lib/modes/radio";
import { POST } from "./route";
const id = "46d2e1f5-b7ec-464e-9913-cb848488abdc";
beforeEach(() => vi.mocked(getRadioPlayableStream).mockReset().mockResolvedValue(null));
it("passes a validated refresh flag and preserves default behavior", async () => {
  for (const query of ["", "?refresh=true"]) {
    await POST(new Request(`https://app.example/api/playable${query}`, { method: "POST" }), { params: Promise.resolve({ id }) });
    expect(getRadioPlayableStream).toHaveBeenLastCalledWith(id, query !== "");
  }
});
it("rejects malformed and duplicate refresh values before resolving", async () => {
  for (const query of ["?refresh=false", "?refresh=1", "?refresh=", "?refresh=true&refresh=true"]) {
    expect((await POST(new Request(`https://app.example/api/playable${query}`, { method: "POST" }), { params: Promise.resolve({ id }) })).status).toBe(400);
  }
  expect(getRadioPlayableStream).not.toHaveBeenCalled();
});
