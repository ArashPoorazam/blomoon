import { afterEach, describe, expect, it, vi } from "vitest";
import { flushLogsForTest } from "@/lib/server/logging";
import {
  getLiveTopVotedWorldRecordsFromHost
} from "./livePages";
import { getLiveCountryCoverageRecordsFromHost } from "./coverage";
import { clearRadioBrowserHostCacheForTest } from "./provider";
import { clearRadioStationCountCacheForTest } from "./stationCounts";
import type { RadioStationRecord } from "./types";

describe("radio live catalog loading", () => {
  afterEach(async () => {
    await flushLogsForTest();
    clearRadioBrowserHostCacheForTest();
    clearRadioStationCountCacheForTest();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches 500-record top pages sequentially and stops at 500 normalized stations", async () => {
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const stationCalls: URL[] = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      stationCalls.push(url);
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

      await Promise.resolve();
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const stations = offset === 0
        ? [invalidProviderStation(), ...Array.from({ length: 499 }, (_, index) => providerStation(`top-${index}`, "US"))]
        : [providerStation("top-499", "US")];
      activeRequests -= 1;
      return Response.json(stations);
    });
    vi.stubGlobal("fetch", fetchMock);

    const records = await getLiveTopVotedWorldRecordsFromHost("de1.api.radio-browser.info");

    expect(records).toHaveLength(500);
    expect(stationCalls).toHaveLength(2);
    expect(stationCalls.map((url) => url.searchParams.get("limit"))).toEqual(["500", "500"]);
    expect(stationCalls.map((url) => url.searchParams.get("offset"))).toEqual(["0", "500"]);
    expect(maxActiveRequests).toBe(1);
  });

  it("requests only deficits, caps concurrency at two, and keeps successful partial coverage", async () => {
    let activeCoverageRequests = 0;
    let maxActiveCoverageRequests = 0;
    const coverageHosts: string[] = [];
    const coverageCountries: string[] = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));

      if (url.pathname === "/json/servers") {
        return Response.json([{ name: "de1.api.radio-browser.info" }, { name: "fi1.api.radio-browser.info" }]);
      }

      if (url.pathname === "/json/countrycodes") {
        return Response.json([
          { iso_3166_1: "US", stationcount: 10 },
          { iso_3166_1: "FR", stationcount: 10 },
          { iso_3166_1: "DE", stationcount: 10 }
        ]);
      }

      const alphaCode = url.pathname.split("/").at(-1)?.toUpperCase() ?? "";
      coverageHosts.push(url.host);
      coverageCountries.push(alphaCode);
      activeCoverageRequests += 1;
      maxActiveCoverageRequests = Math.max(maxActiveCoverageRequests, activeCoverageRequests);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeCoverageRequests -= 1;

      if (alphaCode === "DE") {
        return new Response(null, { status: 503 });
      }

      return Response.json(Array.from({ length: 4 }, (_, index) => (
        providerStation(`${alphaCode.toLowerCase()}-${index}`, alphaCode)
      )));
    });
    vi.stubGlobal("fetch", fetchMock);
    const topRecords = Array.from({ length: 4 }, (_, index) => stationRecord(`us-${index}`, "840"));

    const coverageRecords = await getLiveCountryCoverageRecordsFromHost("coverage.api.radio-browser.info", topRecords);

    expect(coverageCountries).toEqual(expect.arrayContaining(["FR", "DE"]));
    expect(coverageCountries).not.toContain("US");
    expect(maxActiveCoverageRequests).toBe(2);
    expect(coverageHosts).toEqual(coverageHosts.map(() => "coverage.api.radio-browser.info"));
    expect(coverageRecords.filter((record) => record.point.countryCode === "250")).toHaveLength(4);
    expect(coverageRecords.some((record) => record.point.countryCode === "276")).toBe(false);
  });

  it("does not sweep countries when provider country counts are unavailable", async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));

      if (url.pathname === "/json/servers") {
        return Response.json([{ name: "de1.api.radio-browser.info" }]);
      }

      return new Response(null, { status: 503 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLiveCountryCoverageRecordsFromHost(
      "coverage.api.radio-browser.info",
      [stationRecord("us-0", "840")]
    )).rejects.toThrow();

    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/bycountrycodeexact/"))).toBe(false);
  });
});

function providerStation(id: string, countryCode: string) {
  const countries: Record<string, string> = {
    DE: "Germany",
    FR: "France",
    US: "United States"
  };
  const coordinates: Record<string, [number, number]> = {
    DE: [51, 10],
    FR: [46, 2],
    US: [39, -98]
  };

  return {
    stationuuid: id,
    name: `Station ${id}`,
    url: `https://example.com/${id}.mp3`,
    country: countries[countryCode],
    countrycode: countryCode,
    geo_lat: coordinates[countryCode]?.[0],
    geo_long: coordinates[countryCode]?.[1],
    lastcheckok: 1,
    votes: 100
  };
}

function invalidProviderStation() {
  return {
    name: "Missing id",
    url: "https://example.com/invalid.mp3",
    country: "United States",
    countrycode: "US",
    lastcheckok: 1
  };
}

function stationRecord(id: string, countryCode: string): RadioStationRecord {
  const point = {
    countryCode,
    id,
    latitude: 0,
    longitude: 0,
    modeId: "radio",
    name: `Station ${id}`,
    summary: "Test station"
  } satisfies RadioStationRecord["point"];

  return {
    clickCount: 0,
    detail: { ...point, fields: [] },
    point,
    searchText: point.name.toLowerCase(),
    streamUrl: `https://example.com/${id}.mp3`,
    votes: 0
  };
}
