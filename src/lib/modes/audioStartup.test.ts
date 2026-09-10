import { afterEach, describe, expect, it, vi } from "vitest";
import { playbackFailure, startAudio, validatePlayableAudio } from "./audioStartup";

class FakeAudio extends EventTarget {
  error: { code: number } | null = null;
  play = vi.fn(() => new Promise<void>(() => {}));
  canPlayType = vi.fn(() => "");
}
const media = (audio: FakeAudio) => audio as unknown as HTMLAudioElement;
afterEach(() => vi.useRealTimers());

describe("audio startup", () => {
  it("allows a stream to start after the previous 12 second cutoff", async () => {
    vi.useFakeTimers();
    const audio = new FakeAudio();
    const result = startAudio(media(audio), new AbortController().signal);
    await vi.advanceTimersByTimeAsync(15_000);
    audio.dispatchEvent(new Event("playing"));
    await expect(result).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("times out once at 30 seconds", async () => {
    vi.useFakeTimers();
    const result = startAudio(media(new FakeAudio()), new AbortController().signal);
    const assertion = expect(result).rejects.toMatchObject({ reason: "timeout" });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("settles immediately on a media error instead of waiting for play", async () => {
    const audio = new FakeAudio();
    const result = startAudio(media(audio), new AbortController().signal);
    audio.error = { code: 2 };
    audio.dispatchEvent(new Event("error"));
    await expect(result).rejects.toMatchObject({ reason: "network" });
  });
  it("cancels pending startup and removes listeners and timers", async () => {
    vi.useFakeTimers();
    const audio = new FakeAudio();
    const controller = new AbortController();
    const result = startAudio(media(audio), controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    audio.dispatchEvent(new Event("playing"));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not play an already cancelled request", async () => {
    const audio = new FakeAudio();
    await expect(startAudio(media(audio), AbortSignal.abort())).rejects.toMatchObject({ name: "AbortError" });
    expect(audio.play).not.toHaveBeenCalled();
  });
  it("preserves permission failures for direct user retry", async () => {
    const audio = new FakeAudio();
    audio.play.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    const error = await startAudio(media(audio), new AbortController().signal).catch(error => error);
    expect(playbackFailure(error)).toBe("permission");
  });
});

describe("playable response validation", () => {
  it("rejects malformed responses and HTML", () => {
    for (const value of [null, {}, { streamUrl: "javascript:alert(1)" }, { streamUrl: "https://radio.example/", contentType: "text/html; charset=utf-8" }]) {
      expect(() => validatePlayableAudio(value, media(new FakeAudio()))).toThrow();
    }
  });
  it("requires native HLS support and permits ordinary streams", () => {
    const audio = new FakeAudio();
    const hls = { streamUrl: "https://radio.example/live.m3u8" };
    expect(() => validatePlayableAudio(hls, media(audio))).toThrow("unsupported");
    audio.canPlayType.mockReturnValue("maybe");
    expect(validatePlayableAudio(hls, media(audio))).toBe(hls.streamUrl);
    expect(validatePlayableAudio({ streamUrl: "https://radio.example/live", contentType: "audio/mpeg" }, media(audio))).toBe("https://radio.example/live");
  });
});
