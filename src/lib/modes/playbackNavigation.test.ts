import { describe, expect, it } from "vitest";
import {
  appendPlaybackHistory,
  getPlaybackQueuePoints,
  getNextPlaybackPoint,
  takePreviousPlaybackPoint
} from "./playbackNavigation";
import type { TerraPoint } from "./types";

describe("playback navigation", () => {
  it("wraps next playback through the current queue", () => {
    const queue = [point("one"), point("two"), point("three")];

    expect(getNextPlaybackPoint(queue, "one")?.id).toBe("two");
    expect(getNextPlaybackPoint(queue, "three")?.id).toBe("one");
  });

  it("starts at the first queued station when the current station is not in the queue", () => {
    const queue = [point("one"), point("two")];

    expect(getNextPlaybackPoint(queue, "missing")?.id).toBe("one");
  });

  it("tracks previous playback history independently from queue order", () => {
    const one = point("one");
    const two = point("two");
    const three = point("three");
    const history = appendPlaybackHistory(
      appendPlaybackHistory([], one, three),
      three,
      two
    );

    const firstPrevious = takePreviousPlaybackPoint(history, "two");
    expect(firstPrevious.point?.id).toBe("three");

    const secondPrevious = takePreviousPlaybackPoint(firstPrevious.history, "three");
    expect(secondPrevious.point?.id).toBe("one");
  });

  it("does not add duplicate current stations to history", () => {
    const one = point("one");

    expect(appendPlaybackHistory([], one, one)).toEqual([]);
  });

  it("selects queues neutrally and deduplicates repeated history stations", () => {
    const one = point("one");
    const two = point("two");
    const sources = { favourites: [two], history: [one, two, one], list: [one] };
    expect(getPlaybackQueuePoints("list", sources).map(({ id }) => id)).toEqual(["one"]);
    expect(getPlaybackQueuePoints("favourites", sources).map(({ id }) => id)).toEqual(["two"]);
    expect(getPlaybackQueuePoints("history", sources).map(({ id }) => id)).toEqual(["one", "two"]);
  });
});

function point(id: string): TerraPoint {
  return {
    id,
    latitude: 0,
    longitude: 0,
    modeId: "radio",
    name: `Station ${id}`,
    summary: "Test station"
  };
}
