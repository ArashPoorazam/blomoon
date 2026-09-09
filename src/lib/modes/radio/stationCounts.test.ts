import { afterEach, describe, expect, it, vi } from "vitest";
import { flushLogsForTest } from "@/lib/server/logging";
import { clearRadioBrowserHostCacheForTest } from "./provider";
import {
  clearRadioStationCountCacheForTest,
  getLiveGlobalStationCount
} from "./stationCounts";

describe("Radio Browser station counts", () => {
  afterEach(async () => {
    await flushLogsForTest();
    clearRadioBrowserHostCacheForTest();
    clearRadioStationCountCacheForTest();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shares one stats request between concurrent callers", async () => {
    let resolveStats!: (response: Response) => void;
    const fetchMock = vi.fn((input: URL | RequestInfo) => {
      const url = String(input);

      if (url.includes("/json/servers")) {
        return Promise.resolve(Response.json([{ name: "de1.api.radio-browser.info" }]));
      }

      return new Promise<Response>((resolve) => {
        resolveStats = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = getLiveGlobalStationCount();
    const second = getLiveGlobalStationCount();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveStats(Response.json({ stations: 100, stations_broken: 7 }));

    await expect(first).resolves.toBe(93);
    await expect(second).resolves.toBe(93);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/json/stats"))).toHaveLength(1);
  });
});
