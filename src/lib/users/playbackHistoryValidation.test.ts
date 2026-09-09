import { describe, expect, it } from "vitest";
import { findTerraMode, getTerraMode } from "@/lib/modes/registry";
import { playbackHistoryInputSchema } from "./validation";

describe("playback history input", () => {
  it("accepts offset extremes and rejects values outside them", () => {
    const base = { modeId: "radio", pointId: "550e8400-e29b-41d4-a716-446655440000" };
    expect(playbackHistoryInputSchema.safeParse({ ...base, timezoneOffsetMinutes: -840 }).success).toBe(true);
    expect(playbackHistoryInputSchema.safeParse({ ...base, timezoneOffsetMinutes: 720 }).success).toBe(true);
    expect(playbackHistoryInputSchema.safeParse({ ...base, timezoneOffsetMinutes: 721 }).success).toBe(false);
    expect(playbackHistoryInputSchema.safeParse({ ...base, timezoneOffsetMinutes: 1.5 }).success).toBe(false);
  });

  it("does not use the default-mode fallback for API validation", () => {
    expect(getTerraMode("not-registered").id).toBe("radio");
    expect(findTerraMode("not-registered")).toBeNull();
  });
});
