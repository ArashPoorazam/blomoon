import { afterEach, describe, expect, it, vi } from "vitest";
import type { RadioStationRecord } from "./types";
import { STATION_CACHE_TTL_MS } from "./config";
import {
  clearRadioStartupDatasetCacheForTest,
  getRadioStartupDataset,
  refreshRadioStartupDataset
} from "./startup";

describe("radio startup dataset", () => {
  afterEach(() => {
    clearRadioStartupDatasetCacheForTest();
    vi.restoreAllMocks();
  });

  it("returns a fresh top-station cache without calling the top-station provider", async () => {
    await refreshRadioStartupDataset({
      loadRecords: async () => [station("cached", 10)],
      now: () => 1_000
    });
    const loadRecords = vi.fn(async () => [station("new", 20)]);
    const loadCoveredRecords = vi.fn(async () => [station("covered", 30)]);
    const scheduledRefreshes: Array<() => Promise<void>> = [];

    const dataset = await getRadioStartupDataset({
      loadCoveredRecords,
      loadRecords,
      now: () => 1_000 + STATION_CACHE_TTL_MS - 1,
      scheduleRefresh: (refresh) => scheduledRefreshes.push(refresh)
    });

    expect(dataset.points.map((point) => point.id)).toEqual(["cached"]);
    expect(loadRecords).not.toHaveBeenCalled();
    expect(loadCoveredRecords).not.toHaveBeenCalled();
    expect(scheduledRefreshes).toHaveLength(1);
  });

  it("returns stale cache immediately and schedules a coverage refresh", async () => {
    await refreshRadioStartupDataset({
      loadRecords: async () => [station("stale", 10)],
      now: () => 1_000
    });
    const loadRecords = vi.fn(async () => [station("fresh", 20)]);
    const loadCoveredRecords = vi.fn(async () => [station("covered", 30)]);
    const scheduledRefreshes: Array<() => Promise<void>> = [];

    const dataset = await getRadioStartupDataset({
      loadCoveredRecords,
      loadRecords,
      now: () => 1_000 + STATION_CACHE_TTL_MS + 1,
      scheduleRefresh: (refresh) => scheduledRefreshes.push(refresh)
    });

    expect(dataset.points.map((point) => point.id)).toEqual(["stale"]);
    expect(loadRecords).not.toHaveBeenCalled();
    expect(loadCoveredRecords).not.toHaveBeenCalled();
    expect(scheduledRefreshes).toHaveLength(1);

    await scheduledRefreshes[0]();

    expect(loadRecords).toHaveBeenCalledTimes(1);
    expect(loadCoveredRecords).toHaveBeenCalledTimes(1);
  });

  it("returns fixtures on cold startup when the provider misses the soft timeout", async () => {
    const loadRecords = vi.fn(() => new Promise<RadioStationRecord[]>(() => undefined));
    const scheduledRefreshes: Array<() => Promise<void>> = [];

    const dataset = await getRadioStartupDataset({
      loadRecords,
      now: () => 1_000,
      scheduleRefresh: (refresh) => scheduledRefreshes.push(refresh),
      softTimeoutMs: 1
    });

    expect(dataset.source.isFallback).toBe(true);
    expect(dataset.points.length).toBeGreaterThan(0);
    expect(loadRecords).toHaveBeenCalledTimes(1);
    expect(scheduledRefreshes).toHaveLength(1);
  });

  it("serves country coverage after the background coverage refresh completes", async () => {
    const scheduledRefreshes: Array<() => Promise<void>> = [];
    const loadCoveredRecords = vi.fn(async () => [
      station("top", 10, "840"),
      station("country-minimum", 3, "250")
    ]);

    const firstDataset = await getRadioStartupDataset({
      loadCoveredRecords,
      loadRecords: async () => [station("top", 10, "840")],
      now: () => 1_000,
      scheduleRefresh: (refresh) => scheduledRefreshes.push(refresh),
      softTimeoutMs: 50
    });

    expect(firstDataset.points.map((point) => point.id)).toEqual(["top"]);
    expect(scheduledRefreshes).toHaveLength(1);

    await scheduledRefreshes[0]();

    const secondDataset = await getRadioStartupDataset({
      loadCoveredRecords,
      loadRecords: async () => [station("ignored", 20, "276")],
      now: () => 1_001,
      scheduleRefresh: (refresh) => scheduledRefreshes.push(refresh)
    });

    expect(secondDataset.points.map((point) => point.id)).toEqual(["top", "country-minimum"]);
    expect(loadCoveredRecords).toHaveBeenCalledTimes(1);
    expect(scheduledRefreshes).toHaveLength(1);
  });

  it("deduplicates and sorts live startup records", async () => {
    const dataset = await getRadioStartupDataset({
      loadRecords: async () => [
        station("low", 1),
        station("dupe", 3),
        station("dupe", 9),
        station("high", 6)
      ],
      now: () => 1_000,
      softTimeoutMs: 50
    });

    expect(dataset.source.isFallback).toBeUndefined();
    expect(dataset.points.map((point) => point.id)).toEqual(["dupe", "high", "low"]);
  });
});

function station(id: string, votes: number, countryCode = "840"): RadioStationRecord {
  const point = {
    countryCode,
    id,
    latitude: votes,
    longitude: votes,
    modeId: "radio",
    name: `Station ${id}`,
    summary: "Test station",
    metrics: {
      Clicks: 0,
      Votes: votes
    }
  } satisfies RadioStationRecord["point"];

  return {
    clickCount: 0,
    detail: {
      ...point,
      fields: []
    },
    point,
    searchText: point.name.toLowerCase(),
    streamUrl: `https://example.com/${id}.mp3`,
    votes
  };
}
