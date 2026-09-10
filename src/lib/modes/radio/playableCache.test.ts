import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("./identityStore", () => ({ lookupCanonicalRecord: vi.fn(async () => ({ streamUrl: "https://stale.example/temporary?token=old" })) }));
vi.mock("./provider", () => ({ fetchRadioBrowserJson: vi.fn(), fetchRadioBrowserJsonWithOptions: vi.fn() }));
vi.mock("@/lib/server/logging", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import { getRadioPlayableStream } from "./catalog";
let count = 0;
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
beforeEach(() => {
  vi.mocked(fetchRadioBrowserJsonWithOptions).mockReset().mockImplementation(async path =>
    path.startsWith("/json/stations") ? [{ url: "https://entry.example/live" }] : { ok: true, url: "https://temporary.example/live?token=fresh" }
  );
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { headers: { "content-type": "audio/mpeg" } })));
});
it("caches stable entries and refresh bypasses existing validation and provider caches", async () => {
  const id = `cache-${count++}`;
  const first = await getRadioPlayableStream(id);
  expect(first?.streamUrl).toBe("https://entry.example/live");
  expect(await getRadioPlayableStream(id)).toBe(first);
  expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(2);
  expect(await getRadioPlayableStream(id, true)).not.toBe(first);
  expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(4);
  for (const call of vi.mocked(fetchRadioBrowserJsonWithOptions).mock.calls) expect(call[2]).toEqual({ cache: "no-store" });
});
it("does not cache query-bearing entry URLs", async () => {
  vi.mocked(fetchRadioBrowserJsonWithOptions).mockImplementation(async path => path.startsWith("/json/stations") ? [{ url: "https://entry.example/live?token=new" }] : { ok: false });
  const id = `query-${count++}`;
  await getRadioPlayableStream(id);
  await getRadioPlayableStream(id);
  expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(4);
});

it("expires reusable validation after five minutes", async () => {
  vi.useFakeTimers();
  const id = `ttl-${count++}`;
  await getRadioPlayableStream(id);
  vi.setSystemTime(Date.now() + 300_001);
  await getRadioPlayableStream(id);
  expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(4);
});
it("does not resurrect cached temporary URLs if fresh provider resolution fails", async () => {
  const id = `failed-${count++}`;
  await getRadioPlayableStream(id);
  vi.mocked(fetchRadioBrowserJsonWithOptions).mockRejectedValue(new Error("provider unavailable"));
  await expect(getRadioPlayableStream(id, true)).rejects.toThrow("provider unavailable");
  await expect(getRadioPlayableStream(id)).rejects.toThrow("provider unavailable");
});
it("keeps fixture playback on its declared entry without provider resolution", async () => {
  const stream = await getRadioPlayableStream("fixture-kexp", true);
  expect(stream?.streamUrl).toBe("https://kexp-mp3-128.streamguys1.com/kexp128.mp3");
  expect(fetchRadioBrowserJsonWithOptions).not.toHaveBeenCalled();
});
