import { describe, expect, it } from "vitest";
import type { TerraPoint } from "@/lib/modes/types";
import type { PlaybackHistoryItemDto } from "@/lib/persistence/types";
import { deriveLocalPlayedOn, groupPlaybackHistory, mergePlaybackHistoryItem } from "./history";

describe("playback history", () => {
  it("derives the listener date at both supported UTC offset extremes", () => {
    const now = new Date("2026-01-01T10:30:00.000Z");
    expect(deriveLocalPlayedOn(now, -840)).toBe("2026-01-02");
    expect(deriveLocalPlayedOn(now, 720)).toBe("2025-12-31");
  });

  it("replaces a same-day station but retains it across days", () => {
    const first = item("one", "2026-09-07", "2026-09-07T08:00:00.000Z");
    const latest = item("one", "2026-09-07", "2026-09-07T10:00:00.000Z");
    const priorDay = item("one", "2026-09-06", "2026-09-06T10:00:00.000Z");
    expect(mergePlaybackHistoryItem([first, priorDay], latest)).toEqual([latest, priorDay]);
  });

  it("orders newest first and caps station-day entries at 50", () => {
    const items = Array.from({ length: 51 }, (_, index) => item(String(index), "2026-09-07", new Date(index * 1_000).toISOString()));
    const merged = mergePlaybackHistoryItem(items.slice(0, 50), items[50]);
    expect(merged).toHaveLength(50);
    expect(merged[0]?.point.id).toBe("50");
    expect(merged.at(-1)?.point.id).toBe("1");
  });

  it("labels and groups today, yesterday, and older dates", () => {
    const groups = groupPlaybackHistory([
      item("older", "2026-09-05", "2026-09-05T10:00:00.000Z"),
      item("today", "2026-09-07", "2026-09-07T10:00:00.000Z"),
      item("yesterday", "2026-09-06", "2026-09-06T10:00:00.000Z")
    ], new Date(2026, 8, 7, 12));
    expect(groups.map((group) => group.label).slice(0, 2)).toEqual(["Today", "Yesterday"]);
    expect(groups[2]?.label).not.toBe("2026-09-05");
  });
});

function item(id: string, playedOn: string, playedAt: string): PlaybackHistoryItemDto {
  return { playedAt, playedOn, point: point(id) };
}

function point(id: string): TerraPoint {
  return { id, latitude: 0, longitude: 0, modeId: "radio", name: id, summary: "Test" };
}
