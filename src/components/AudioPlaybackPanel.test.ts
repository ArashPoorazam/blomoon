import { describe, expect, it } from "vitest";
import { formatAudioPlaybackStatus } from "./AudioPlaybackPanel";

describe("audio playback labels", () => {
  it("formats every playback state for display", () => {
    expect(formatAudioPlaybackStatus("idle")).toBe("Ready");
    expect(formatAudioPlaybackStatus("loading")).toBe("Loading");
    expect(formatAudioPlaybackStatus("playing")).toBe("Playing");
    expect(formatAudioPlaybackStatus("paused")).toBe("Paused");
    expect(formatAudioPlaybackStatus("error")).toBe("Playback error");
  });
});
