import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  sources: [] as Array<Record<string, unknown>>,
  curated: [] as Array<Record<string, unknown>>,
}));
vi.mock("./catalog", () => ({ getRadioStationRecord: vi.fn() }));
vi.mock("./health/sources", () => ({
  requestStationRecheck: vi.fn(async () => 1),
  markSourcesPlayed: vi.fn(async () => {}),
}));
vi.mock("./provider", () => ({ fetchRadioBrowserJsonWithOptions: vi.fn() }));
vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");
  return {
    schema,
    getDb: () => ({
      select: () => ({
        from: (table: unknown) => ({
          where: () =>
            table === schema.radioCuratedStations
              ? Promise.resolve(state.curated)
              : { orderBy: () => Promise.resolve(state.sources) },
        }),
      }),
    }),
  };
});
import { getRadioStationRecord } from "./catalog";
import { getRadioPlayableStream } from "./playback";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import { requestStationRecheck } from "./health/sources";
const id = "9625c394-0601-11e8-ae97-52543be04c81";
beforeEach(() => {
  vi.clearAllMocks();
  state.curated = [];
  state.sources = [
    {
      id,
      streamUrl: "https://example.com/live",
      providerId: null,
      enabled: true,
      lastSuccess: new Date(),
      failures: 0,
    },
  ];
  vi.mocked(getRadioStationRecord).mockResolvedValue({
    point: { id, modeId: "radio", name: "test", countryCode: "826", latitude: 1, longitude: 1, summary: "" },
    detail: { id, modeId: "radio", name: "test", latitude: 1, longitude: 1, summary: "", fields: [] },
    streamUrl: "https://example.com/live",
    searchText: "",
    votes: 0,
    clickCount: 0,
  });
});
afterEach(() => vi.useRealTimers());
describe("stored verified playback", () => {
  it("resolves curated streams without provider calls", async () => {
    expect((await getRadioPlayableStream(id)).stream.streamUrl).toBe("https://example.com/live");
    expect(fetchRadioBrowserJsonWithOptions).not.toHaveBeenCalled();
  });
  it("does not cache eligibility across failures", async () => {
    await getRadioPlayableStream(id);
    state.sources[0].failures = 3;
    await expect(getRadioPlayableStream(id)).rejects.toMatchObject({ code: "no_source" });
  });
  it("queues a controlled retry without admitting failed sources", async () => {
    state.sources[0].lastSuccess = null;
    await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "no_source" });
    expect(requestStationRecheck).toHaveBeenCalledWith(id);
  });
  it("does not retry disabled stations", async () => {
    state.curated = [{ enabled: false }];
    await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "no_source" });
    expect(requestStationRecheck).not.toHaveBeenCalled();
  });
  it("rejects old fixture IDs and missing stations", async () => {
    await expect(getRadioPlayableStream("fixture-kexp")).rejects.toMatchObject({ code: "invalid_input" });
    vi.mocked(getRadioStationRecord).mockResolvedValue(null);
    await expect(getRadioPlayableStream(id)).rejects.toMatchObject({ code: "not_found" });
  });
  it("uses a healthy alternate when primary has failed", async () => {
    state.sources.unshift({ ...state.sources[0], streamUrl: "https://example.com/dead", failures: 3 });
    expect((await getRadioPlayableStream(id)).stream.streamUrl).toBe("https://example.com/live");
  });
});
