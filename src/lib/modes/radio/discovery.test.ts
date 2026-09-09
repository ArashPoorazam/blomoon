import { describe, expect, it } from "vitest";
import { matchesCountrySearch } from "@/lib/geo/countrySearch";
import { matchesSearchText, normalizeSearchText } from "@/lib/search/text";
import { parseIntegerParam, parseRadioSort } from "./api";
import { parseDirectoryPage, validateDirectorySize } from "./directorySync";
import { rankRadioRecommendations, signalWeight, streamIdentity } from "./recommendationRanking";
import type { RadioStationRecord } from "./types";

function testStation(index: number, tags = "jazz", country = "250"): RadioStationRecord {
  const point = { id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, modeId: "radio",
    name: `Station ${index}`, latitude: 48, longitude: 2, countryCode: country, summary: "Test station",
    metrics: { Tags: tags, Language: "French", Country: "France" } };
  return { point, detail: { ...point, fields: [] }, votes: index, clickCount: index,
    streamUrl: `https://example.com/${index}`, searchText: point.name };
}

describe("discovery boundaries", () => {
  it("normalizes accents, punctuation and Persian letter variants", () => {
    expect(normalizeSearchText(" CAFÉ—Radio  كيان ")).toBe("cafe radio کیان");
    expect(matchesSearchText("Radio Paradise", "paradse")).toBe(true);
    expect(matchesCountrySearch("276", "germnay")).toBe(true);
    expect(matchesCountrySearch("840", "usa")).toBe(true);
    expect(matchesCountrySearch("826", "united king")).toBe(true);
    expect(matchesCountrySearch("250", "xyz")).toBe(false);
  });
  it("rejects malformed pagination and picks relevance only for typed searches", () => {
    expect(parseIntegerParam(new URLSearchParams("limit=50oops"), "limit", { defaultValue: 50, min: 1, max: 100 }).error).toBeTruthy();
    expect(parseRadioSort(new URLSearchParams("q=jazz")).sort).toBe("relevance");
    expect(parseRadioSort(new URLSearchParams()).sort).toBe("votes_desc");
  });
  it("rejects truncated scans and malformed provider payloads", () => {
    expect(() => validateDirectorySize(2000, 5000, 5000)).toThrow();
    expect(() => validateDirectorySize(0, 0, 0)).toThrow();
    expect(() => validateDirectorySize(4500, 5000, 5000)).not.toThrow();
    expect(() => parseDirectoryPage({ stations: [] })).toThrow();
    expect(() => parseDirectoryPage(Array.from({ length: 20 }, () => ({ stationuuid: 42 })))).toThrow();
  });
});

describe("radio recommendations", () => {
  const now = Date.parse("2026-09-08T12:00:00Z");
  it("weights saves above plays and halves history influence every fourteen days", () => {
    const signal = { point: testStation(1).point, saved: false, playedAt: ["2026-08-25T12:00:00Z"] };
    expect(signalWeight(signal, now)).toBe(0.5);
    expect(signalWeight({ ...signal, saved: true }, now)).toBe(4.5);
    expect(signalWeight({ ...signal, playedAt: Array(20).fill("2026-09-08T12:00:00Z") }, now)).toBe(3);
  });
  it("uses a 40-new/10-familiar mix and prioritizes matching new stations", () => {
    const records = Array.from({ length: 200 }, (_, index) => testStation(index, index < 100 ? "jazz" : "rock"));
    const signals = records.slice(0, 20).map(({ point }) => ({ point, saved: true, playedAt: [] }));
    const result = rankRadioRecommendations(records, signals, now, 50);
    expect(result.personalized).toBe(true);
    expect(result.points).toHaveLength(50);
    expect(result.points.filter((point) => signals.some((signal) => signal.point.id === point.id))).toHaveLength(10);
    expect(result.points[0].metrics?.Tags).toBe("jazz");
    expect(result.points[0].id).not.toBe(records[199].point.id);
  });
  it("deduplicates streams, fills sparse pools, and is stable within a day", () => {
    const records = [testStation(1), testStation(2), testStation(3)];
    records[1].streamUrl = records[0].streamUrl + "#duplicate";
    const result = rankRadioRecommendations(records, [], now);
    expect(result.personalized).toBe(false);
    expect(result.points).toHaveLength(2);
    expect(rankRadioRecommendations(records, [], now).points).toEqual(result.points);
    expect(streamIdentity("https://EXAMPLE.com:443/live#fragment")).toBe("https://example.com/live");
  });
  it("adds geographic variety and handles missing metadata", () => {
    const records = Array.from({ length: 300 }, (_, i) => testStation(i, i % 2 ? "rock" : "jazz", String(200 + i % 10)));
    for (const record of records) record.point.metrics = { Tags: "Unknown", Language: "Unknown", Country: "Unknown" };
    const result = rankRadioRecommendations(records, [], now, 50);
    expect(new Set(result.points.map((point) => point.countryCode)).size).toBeGreaterThan(5);
  });
});
