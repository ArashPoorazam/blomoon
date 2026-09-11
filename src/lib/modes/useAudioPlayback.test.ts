// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TerraPlaybackConfig, TerraPoint } from "./types";
import { useAudioPlayback, type AudioPlaybackController } from "./useAudioPlayback";
vi.mock("./playbackDiagnostics", () => ({ reportPlaybackDiagnostic: vi.fn() }));

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  static behavior: (audio: FakeAudio) => Promise<void> = async () => {};
  error: { code: number } | null = null;
  src = ""; preload = ""; readyState = 0; networkState = 0; paused = true; ended = false;
  constructor() { super(); FakeAudio.instances.push(this); }
  play = vi.fn(() => { this.paused = false; return FakeAudio.behavior(this); });
  pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event("pause")); });
  load = vi.fn();
  removeAttribute() { this.src = ""; }
  canPlayType() { return ""; }
}
const point = { id: "a", modeId: "radio", name: "A" } as TerraPoint;
const config = { playableEndpoint: (id: string) => `/api/${id}/playable` } as TerraPlaybackConfig;
const payload = { streamUrl: "https://stream.example/live", alternatives: [] };
let player: AudioPlaybackController;
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
const started = vi.fn();
function Harness({ playback = config }: { playback?: TerraPlaybackConfig | null }) {
  player = useAudioPlayback(playback, started); return null;
}
async function mount(playback: TerraPlaybackConfig | null = config) {
  await act(async () => root.render(createElement(StrictMode, null, createElement(Harness, { playback }))));
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  FakeAudio.instances = []; FakeAudio.behavior = async () => {}; started.mockReset();
  vi.stubGlobal("Audio", FakeAudio);
  fetchMock = vi.fn(async () => Response.json(payload)); vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await mount();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("mounted playback lifecycle", () => {
  it("plays, buffers, pauses and resumes once without duplicate history or lookup", async () => {
    await act(async () => player.play(point));
    const audio = FakeAudio.instances[0];
    expect(player.status).toBe("playing");
    await act(async () => audio.dispatchEvent(new Event("waiting")));
    expect(player.status).toBe("buffering");
    await act(async () => audio.dispatchEvent(new Event("playing")));
    await act(async () => player.pause()); expect(player.status).toBe("paused");
    await act(async () => player.play(point)); expect(player.status).toBe("playing");
    expect(started).toHaveBeenCalledTimes(1); expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => player.stop()); expect(player.status).toBe("idle"); expect(audio.src).toBe("");
    await act(async () => audio.dispatchEvent(new Event("playing"))); expect(player.status).toBe("idle");
  });
  it("advances after generic media error 4 without another lookup", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...payload, alternatives: [{ streamUrl: "https://other.example/live" }] }));
    FakeAudio.behavior = async audio => {
      if (audio.src === payload.streamUrl) { audio.error = { code: 4 }; throw new DOMException("source", "NotSupportedError"); }
    };
    await act(async () => player.play(point));
    expect(player.status).toBe("playing"); expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(FakeAudio.instances).toHaveLength(2); expect(FakeAudio.instances[0].src).toBe("");
  });
  it("uses a single thirty-second startup deadline", async () => {
    vi.useFakeTimers(); FakeAudio.behavior = () => new Promise(() => {});
    let playing!: Promise<void>;
    await act(async () => { playing = player.play(point); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_001); await playing; });
    expect(player.status).toBe("error"); expect(player.error).toContain("too long"); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains the source after browser permission rejection", async () => {
    FakeAudio.behavior = async () => { throw new DOMException("gesture", "NotAllowedError"); };
    await act(async () => player.play(point)); expect(player.status).toBe("idle");
    FakeAudio.behavior = async () => {};
    await act(async () => player.play(point)); expect(player.status).toBe("playing"); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["stop", "switch", "unmount"])("ignores late resolution after %s", async action => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    let pending!: Promise<void>;
    await act(async () => { pending = player.play(point); });
    await act(async () => {
      if (action === "stop") player.stop();
      if (action === "switch") await player.play({ ...point, id: "b" });
      if (action === "unmount") root.unmount();
      finish(Response.json(payload)); await pending;
    });
    expect(started.mock.calls.map(([p]) => p.id)).toEqual(action === "switch" ? ["b"] : []);
    expect(FakeAudio.instances).toHaveLength(action === "switch" ? 1 : 0);
    if (action === "unmount") root = createRoot(container);
  });
  it("cancels during startup and on mode removal", async () => {
    FakeAudio.behavior = () => new Promise(() => {});
    let pending!: Promise<void>; await act(async () => { pending = player.play(point); });
    await mount(null); await pending;
    expect(player.status).toBe("idle"); expect(FakeAudio.instances[0].src).toBe("");
  });
  it("reports ended and post-start errors honestly", async () => {
    await act(async () => player.play(point)); const audio = FakeAudio.instances[0];
    await act(async () => { audio.ended = true; audio.dispatchEvent(new Event("ended")); }); expect(player.status).toBe("stopped");
    await act(async () => player.play(point)); const next = FakeAudio.instances[1];
    await act(async () => { next.error = { code: 4 }; next.dispatchEvent(new Event("error")); });
    expect(player.status).toBe("error"); expect(player.error).not.toContain("format");
    await act(async () => player.play(point));
    expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("refresh=true");
  });
  it("keeps resolution errors distinct", async () => {
    fetchMock.mockResolvedValue(Response.json({ code: "not_found" }, { status: 404 }));
    await act(async () => player.play(point)); expect(player.error).toContain("no longer available"); expect(FakeAudio.instances).toHaveLength(0);
  });
  it("skips known unsupported HLS to a native audio alternative", async () => {
    fetchMock.mockResolvedValue(Response.json({ streamUrl: "https://stream.example/live.m3u8", format: "hls", alternatives: [{ streamUrl: "https://stream.example/live.mp3" }] }));
    await act(async () => player.play(point)); expect(player.status).toBe("playing"); expect(FakeAudio.instances[0].play).not.toHaveBeenCalled();
  });
});

it("does not reset the startup budget when moving to an alternative", async () => {
  vi.useFakeTimers();
  fetchMock.mockResolvedValue(Response.json({ ...payload, alternatives: [{ streamUrl: "https://other.example/live" }] }));
  FakeAudio.behavior = () => new Promise(() => {});
  let pending!: Promise<void>;
  await act(async () => { pending = player.play(point); });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(25_000);
    const audio = FakeAudio.instances[0]; audio.error = { code: 2 }; audio.dispatchEvent(new Event("error"));
  });
  expect(FakeAudio.instances).toHaveLength(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(5_001); await pending; });
  expect(player.status).toBe("error"); expect(player.error).toContain("too long"); expect(fetchMock).toHaveBeenCalledTimes(1);
});
