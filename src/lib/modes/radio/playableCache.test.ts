import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./identityStore", () => ({ radioPlaybackIds: vi.fn(async (id: string) => [id]) }));
vi.mock("./provider", () => ({ fetchRadioBrowserJsonWithOptions: vi.fn() }));
vi.mock("@/lib/server/logging", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
import { radioPlaybackIds } from "./identityStore";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import { getRadioPlayableStream } from "./playback";
const id = "9625c394-0601-11e8-ae97-52543be04c81";
const alias = "738363a2-edee-4ac6-b110-2ef70c4d06b9";
beforeEach(() => {
  vi.mocked(radioPlaybackIds).mockReset().mockImplementation(async id => [id]);
  vi.mocked(fetchRadioBrowserJsonWithOptions).mockReset().mockImplementation(async path => [{ stationuuid: path.split("/").at(-1), url: "http://live.antenne.at/arr" }]);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("No stream probes allowed"); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe("radio resolution", () => {
  it("uses one provider request and caches for five minutes with refresh bypass", async () => {
    const first = await getRadioPlayableStream(id, true);
    expect(first.stream.streamUrl).toBe("https://live.antenne.at/arr"); expect(await getRadioPlayableStream(id)).toBe(first);
    expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(1);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 300_001);
    await getRadioPlayableStream(id); await getRadioPlayableStream(id, true);
    expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(3); expect(fetch).not.toHaveBeenCalled();
  });
  it("finds a surviving alias without changing the public ID", async () => {
    vi.mocked(radioPlaybackIds).mockResolvedValue([id, alias]); vi.mocked(fetchRadioBrowserJsonWithOptions).mockResolvedValueOnce([]);
    const result = await getRadioPlayableStream(id, true); expect(result.providerId).toBe(alias); expect(result.stream.pointId).toBe(id);
  });
  it("does not resurrect an old URL after provider failure", async () => {
    await getRadioPlayableStream(id, true); vi.mocked(fetchRadioBrowserJsonWithOptions).mockRejectedValue(new Error("outage"));
    await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "provider_failure" });
    await expect(getRadioPlayableStream(id)).rejects.toMatchObject({ code: "provider_failure" });
  });
  it.each([null, {}, [{ stationuuid: alias }], [{ stationuuid: id, url: 42 }]])("rejects malformed metadata", async value => {
    vi.mocked(fetchRadioBrowserJsonWithOptions).mockResolvedValue(value);
    await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "provider_failure" });
  });
  it("distinguishes missing station and no source", async () => {
    vi.mocked(fetchRadioBrowserJsonWithOptions).mockResolvedValueOnce([]).mockResolvedValueOnce([{ stationuuid: id, url: "http://localhost/" }]);
    await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "not_found" });
    await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "no_source" });
  });
  it("does not cache query entries", async () => {
    vi.mocked(fetchRadioBrowserJsonWithOptions).mockResolvedValue([{ stationuuid: id, url: "https://radio.example/live?key=v" }]);
    await getRadioPlayableStream(id, true); await getRadioPlayableStream(id); expect(fetchRadioBrowserJsonWithOptions).toHaveBeenCalledTimes(2);
  });
  it("cancels before scheduling alias requests", async () => {
    await expect(getRadioPlayableStream(id, true, AbortSignal.abort())).rejects.toThrow(); expect(fetchRadioBrowserJsonWithOptions).not.toHaveBeenCalled();
  });
  it("uses fixtures without database or provider access", async () => {
    expect((await getRadioPlayableStream("fixture-kexp", true)).providerId).toBeNull(); expect(radioPlaybackIds).not.toHaveBeenCalled(); expect(fetchRadioBrowserJsonWithOptions).not.toHaveBeenCalled();
  });
});

it("bounds even a non-cancellable identity lookup by the resolution deadline", async () => {
  const deadline = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
  vi.mocked(radioPlaybackIds).mockImplementation(async (_id, signal) => {
    const { abortable } = await import("@/lib/abort");
    return abortable(new Promise<string[]>(() => {}), signal);
  });
  const pending = getRadioPlayableStream(id, true);
  const assertion = expect(pending).rejects.toMatchObject({ code: "resolution_timeout" });
  deadline.abort(new DOMException("deadline", "TimeoutError"));
  await assertion;
  expect(fetchRadioBrowserJsonWithOptions).not.toHaveBeenCalled();
});
