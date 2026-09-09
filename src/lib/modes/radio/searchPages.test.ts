import { afterEach, describe, expect, it, vi } from "vitest";
import { flushLogsForTest } from "@/lib/server/logging";
import { clearRadioBrowserHostCacheForTest } from "./provider";
import {
  clearRadioSearchPageCacheForTest,
  createCountryStationCountIndex,
  getLiveRadioRecordPage
} from "./searchPages";
import { clearRadioStationCountCacheForTest } from "./stationCounts";

describe("radio search pages", () => {
  afterEach(async () => {
    await flushLogsForTest();
    clearRadioBrowserHostCacheForTest();
    clearRadioSearchPageCacheForTest();
    clearRadioStationCountCacheForTest();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("coalesces duplicate provider country count rows by canonical alpha code", () => {
    const counts = createCountryStationCountIndex([
      { name: "US", stationcount: 7120 },
      { name: "us", stationcount: 1 },
      { iso_3166_1: "de", name: "Germany", stationcount: "680" },
      { iso_3166_1: "", name: "GB", stationcount: "320" },
      { name: "The United States Of America", stationcount: 9999 },
      { name: "ZZZ", stationcount: 10 },
      { name: "FR", stationcount: "not-a-number" }
    ]);

    expect(counts.get("US")).toBe(7120);
    expect(counts.get("DE")).toBe(680);
    expect(counts.get("GB")).toBe(320);
    expect(counts.has("ZZZ")).toBe(false);
    expect(counts.has("FR")).toBe(false);
  });

  it("keeps a successful first page when the optional global count fails", async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo) => {
      const url = new URL(String(input));

      if (url.pathname === "/json/servers") {
        return Promise.resolve(Response.json([{ name: "de1.api.radio-browser.info" }]));
      }

      if (url.pathname === "/json/stats") {
        return Promise.resolve(new Response(null, { status: 503 }));
      }

      const offset = Number(url.searchParams.get("offset") ?? 0);
      const count = offset === 0 ? 50 : 1;
      return Promise.resolve(Response.json(Array.from({ length: count }, (_, index) => (
        providerStation(`station-${offset + index}`)
      ))));
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await getLiveRadioRecordPage({
      countryCode: null,
      limit: 50,
      offset: 0,
      query: "",
      sort: "votes_desc"
    });

    expect(page.records).toHaveLength(50);
    expect(page.total).toBe(51);
    expect(page.totalKind).toBe("lowerBound");
    expect(fetchMock.mock.invocationCallOrder[1]).toBeLessThan(fetchMock.mock.invocationCallOrder[2]);
  });
});

function providerStation(id: string) {
  return {
    stationuuid: id,
    name: `Station ${id}`,
    url: `https://example.com/${id}.mp3`,
    country: "United States",
    countrycode: "US",
    lastcheckok: 1,
    votes: 100
  };
}
