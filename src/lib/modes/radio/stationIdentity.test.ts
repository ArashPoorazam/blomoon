import { describe, expect, it } from "vitest";
import { canonicalizeRadioRecords, stationIdentityKey } from "./stationIdentity";
import type { RadioStationRecord } from "./types";

function station(id: string, name = "Dance Wave!", stream = `${id}.mp3`, homepage = "https://dancewave.online/"): RadioStationRecord {
  const point = { id, name, modeId: "radio", countryCode: "348", latitude: 47, longitude: 19, summary: "test" };
  return { point, detail: { ...point, sourceUrl: homepage, fields: [] }, streamUrl: `https://dancewave.online/${stream}`,
    votes: id === "a" ? 100 : 1, clickCount: 0, searchText: name };
}

describe("canonical radio identity", () => {
  it("merges Dance Wave quality variants but retains Retro and unrelated stations", () => {
    const records = [station("a"), station("b", "Dance Wave! [AAC 128kbps]", "dance.aac"),
      station("c", "Dance Wave Retro!", "retro.mp3"), station("d", "Dance Wave!", "other", "https://other.example/")];
    expect(canonicalizeRadioRecords(records).records.map((record) => record.point.id)).toEqual(["a", "c", "d"]);
  });
  it("does not use contradictory country metadata to split the same online channel", () => {
    const other = station("b"); other.point.countryCode = "004";
    expect(canonicalizeRadioRecords([station("a"), other]).records).toHaveLength(1);
  });
  it("merges exact stream aliases without guessing URL parameters or regional names", () => {
    expect(canonicalizeRadioRecords([station("a"), station("b", "Different name", "a.mp3", "")]).records).toHaveLength(1);
    expect(stationIdentityKey(station("a", "Station", "live?channel=1", "")))
      .not.toBe(stationIdentityKey(station("b", "Station", "live?channel=2", "")));
    expect(canonicalizeRadioRecords([station("a", "BBC London"), station("b", "BBC Scotland")]).records).toHaveLength(2);
  });
  it("retains canonical IDs when provider ranking changes or an alias disappears", () => {
    const a = station("a"); const b = station("b"); b.votes = 200;
    const previous = [{ stationId: "a", canonicalId: "a" }, { stationId: "b", canonicalId: "a" }];
    expect(canonicalizeRadioRecords([b, a], previous).records[0].point.id).toBe("a");
    expect(canonicalizeRadioRecords([b], previous).records[0].point.id).toBe("a");
  });
});
