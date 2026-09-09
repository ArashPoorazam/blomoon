import { describe, expect, it } from "vitest";
import type { TerraDataset } from "./types";
import {
  beginModeListRefresh,
  createInitialModeListSnapshot,
  createModeListSnapshot,
  createModeListRequestKey
} from "./modeListState";

describe("mode list refresh state", () => {
  it("keeps catalog size separate from pagination and drops it for ordinary search", () => {
    const page = { ...seedDataset(), total: 500, totalKind: "exact" as const, nextOffset: 50, limit: 50, offset: 0 };
    const recommendations = createModeListSnapshot({ ...page, catalogTotal: 42000 });
    expect(recommendations).toMatchObject({ catalogTotal: 42000, total: 500, nextOffset: 50 });
    expect(createModeListSnapshot(page).catalogTotal).toBeUndefined();
  });
  it("retains seeded rows, totals, and source while the same default list refreshes", () => {
    const snapshot = createInitialModeListSnapshot(seedDataset(), 50);
    const requestKey = listKey({});

    expect(beginModeListRefresh({
      currentRequestKey: requestKey,
      nextRequestKey: requestKey,
      snapshot
    })).toBe(snapshot);
  });

  it.each([
    ["country", listKey({ countryCode: "250" })],
    ["query", listKey({ query: "jazz" })],
    ["sort", listKey({ sortId: "votes_asc" })],
    ["mode", createModeListRequestKey({ countryCode: null, modeId: "podcasts", query: "", sortId: "votes_desc" })]
  ])("clears mismatched rows when the %s request changes", (_change, nextRequestKey) => {
    const snapshot = createInitialModeListSnapshot(seedDataset(), 50);
    const refreshed = beginModeListRefresh({
      currentRequestKey: listKey({}),
      nextRequestKey,
      snapshot
    });

    expect(refreshed).toEqual({
      nextOffset: null,
      points: [],
      source: null,
      total: 0,
      totalKind: "exact"
    });
  });
});

function listKey({
  countryCode = null,
  query = "",
  sortId = "votes_desc"
}: {
  countryCode?: string | null;
  query?: string;
  sortId?: string;
}) {
  return createModeListRequestKey({
    countryCode,
    modeId: "radio",
    query,
    sortId
  });
}

function seedDataset(): TerraDataset {
  return {
    modeId: "radio",
    points: [{
      id: "seed",
      latitude: 0,
      longitude: 0,
      modeId: "radio",
      name: "Seed station",
      summary: "Fixture"
    }],
    source: {
      attribution: "Test fixtures",
      isFallback: true,
      lastUpdated: "2026-09-08T00:00:00.000Z",
      name: "Fixture",
      url: "https://example.com"
    }
  };
}
