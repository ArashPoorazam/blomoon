import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TerraPlaybackConfig, TerraPoint } from "./types";
// A single mounted hook: refs and callbacks remain stable across player commands.
vi.mock("react", () => ({
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
  useCallback: (callback: unknown) => callback,
  useEffect: () => {}
}));
vi.mock("./playbackDiagnostics", () => ({ reportPlaybackDiagnostic: vi.fn() }));
import { useAudioPlayback } from "./useAudioPlayback";

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  static behavior: () => Promise<void> = async () => {};
  error: { code: number } | null = null;
  src = "";
  preload = "";
  readyState = 0;
  networkState = 0;
  constructor() { super(); FakeAudio.instances.push(this); }
  play = vi.fn(() => FakeAudio.behavior());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute() { this.src = ""; }
  canPlayType() { return "probably"; }
}
const point = { id: "a", modeId: "radio", name: "A" } as TerraPoint;
const config = { playableEndpoint: (id: string) => `/api/${id}/playable` } as TerraPlaybackConfig;
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  FakeAudio.instances = [];
  FakeAudio.behavior = async () => {};
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("window", { location: { href: "https://app.example/" }, setTimeout, clearTimeout });
  fetchMock = vi.fn(async (_url: string) => Response.json({ streamUrl: "https://stream.example/live" }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("playback resolution retry lifecycle", () => {
  it("retries a startup network failure once with fresh resolution", async () => {
    FakeAudio.behavior = async () => {
      FakeAudio.instances.at(-1)!.error = { code: 2 };
      throw new Error("network");
    };
    const player = useAudioPlayback(config);
    await player.play(point);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://app.example/api/a/playable", "https://app.example/api/a/playable?refresh=true"
    ]);
    await player.play(point);
    expect(fetchMock.mock.calls[2][0]).toContain("refresh=true");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it("retries a startup timeout only once", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { location: { href: "https://app.example/" }, setTimeout, clearTimeout });
    FakeAudio.behavior = () => new Promise(() => {});
    const player = useAudioPlayback(config);
    const result = player.play(point);
    await vi.advanceTimersByTimeAsync(60_001);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each(["NotAllowedError", "NotSupportedError", "AbortError"])("does not retry %s", async name => {
    FakeAudio.behavior = async () => {
      FakeAudio.instances.at(-1)!.error = { code: 2 };
      throw new DOMException("failure", name);
    };
    await useAudioPlayback(config).play(point);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("does not retry resolution failures", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await useAudioPlayback(config).play(point);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["stop", "switch"])("ignores late fresh resolution after %s", async action => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(async () => Response.json({ streamUrl: "https://stream.example/live" }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    FakeAudio.behavior = async () => {
      FakeAudio.instances.at(-1)!.error = { code: 2 };
      throw new Error("network");
    };
    const started = vi.fn();
    const player = useAudioPlayback(config, started);
    const first = player.play(point);
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    FakeAudio.behavior = async () => {};
    if (action === "stop") player.stop();
    else await player.play({ ...point, id: "b" });
    finish(Response.json({ streamUrl: "https://old.example/live" }));
    await first;
    expect(FakeAudio.instances.length).toBe(action === "stop" ? 1 : 2);
    expect(started.mock.calls.map(([p]) => p.id)).toEqual(action === "stop" ? [] : ["b"]);
  });
});
