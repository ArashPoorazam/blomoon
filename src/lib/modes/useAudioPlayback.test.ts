// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TerraPlaybackConfig, TerraPoint } from "./types";
import { reportPlaybackDiagnostic } from "./playbackDiagnostics";
import type { PlaybackEngineFactory, EngineEvent } from "./playback/engine";
import { useAudioPlayback, type AudioPlaybackController } from "./useAudioPlayback";
vi.mock("./playbackDiagnostics", () => ({ reportPlaybackDiagnostic: vi.fn() }));

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  static behavior: (audio: FakeAudio) => Promise<void> = async () => {};
  error: { code: number } | null = null;
  currentTime = 0; playbackRate = 1;
  seekable = { length: 1, start: () => 0, end: () => 120 };
  src = ""; preload = ""; readyState = 0; networkState = 0; paused = true; ended = false;
  constructor() { super(); FakeAudio.instances.push(this); }
  play = vi.fn(() => { this.paused = false; return FakeAudio.behavior(this); });
  pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event("pause")); });
  load = vi.fn();
  removeAttribute() { this.src = ""; }
  canPlayType() { return ""; }
}
const point = { id: "a", modeId: "radio", name: "A" } as TerraPoint;
const config = { modeId: "radio", mediaKind: "audio", responseKind: "radio-audio", playableEndpoint: (id: string) => `/api/${id}/playable` } as TerraPlaybackConfig;
const payload = { streamUrl: "https://stream.example/live", alternatives: [] };
let player: AudioPlaybackController;
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
const started = vi.fn();
function Harness({ playback = config, factory }: { playback?: TerraPlaybackConfig | null; factory?: PlaybackEngineFactory }) {
  player = useAudioPlayback(playback, started, factory); return null;
}
async function mount(playback: TerraPlaybackConfig | null = config, factory?: PlaybackEngineFactory) {
  await act(async () => root.render(createElement(StrictMode, null, createElement(Harness, { playback, factory }))));
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  FakeAudio.instances = []; FakeAudio.behavior = async () => {}; started.mockReset(); vi.mocked(reportPlaybackDiagnostic).mockClear();
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
    expect(player.status).toBe("error"); expect(player.error).toContain("too long"); expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
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
  expect(player.status).toBe("error"); expect(player.error).toContain("too long"); expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});


it("does not resolve or play a discovery-only show", async () => {
  await act(async () => player.play({ ...point, modeId: "podcasts", kind: "show" }));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(FakeAudio.instances).toHaveLength(0);
  expect(started).not.toHaveBeenCalled();
});

const podcastConfig: TerraPlaybackConfig = {
  modeId: "podcasts", label: "Podcast", mediaKind: "audio", responseKind: "descriptor",
  playableEndpoint: id => `/api/podcasts/${id}/playable`,
};
const episode = { ...point, modeId: "podcasts", kind: "episode" } as TerraPoint;
const descriptor = {
  version: 1, modeId: "podcasts", pointId: "a", mediaKind: "audio", timeline: "on-demand",
  expiresAt: null, controls: { pause: true, seek: true, rate: true },
  sources: [{ url: "https://publisher.example/episode.mp3", transport: "direct" }],
};

it("cancels a pending lookup on pause and ignores its response after resume", async () => {
  let finish!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  await act(async () => { pending = player.play(point); });
  await act(async () => player.pause());
  await act(async () => player.resume());
  await act(async () => { finish(Response.json({ streamUrl: "https://stale.example/live" })); await pending; });
  expect(player.status).toBe("playing");
  expect(FakeAudio.instances).toHaveLength(1);
  expect(FakeAudio.instances[0].src).toBe(payload.streamUrl);
  expect(started).toHaveBeenCalledTimes(1);
});

it("ignores a late play promise after pause, resume, then switch", async () => {
  let finish!: () => void;
  FakeAudio.behavior = () => new Promise<void>(resolve => { finish = resolve; });
  let pending!: Promise<void>;
  await act(async () => { pending = player.play(point); });
  const old = FakeAudio.instances[0];
  await act(async () => player.pause());
  await pending;
  FakeAudio.behavior = async () => {};
  await act(async () => player.resume());
  await act(async () => player.play({ ...point, id: "b" }));
  await act(async () => { finish(); old.dispatchEvent(new Event("playing")); old.dispatchEvent(new Event("error")); });
  expect(player.pointId).toBe("b");
  expect(player.status).toBe("playing");
  expect(old.src).toBe("");
  expect(old.paused).toBe(true);
  expect(started.mock.calls.map(([p]) => p.id)).toEqual(["a", "b"]);
});

it("switches equal IDs across modes without retaining radio audio or stale policy responses", async () => {
  vi.useFakeTimers();
  await act(async () => player.play(point));
  const old = FakeAudio.instances[0];
  let finish!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  await mount(podcastConfig);
  expect(old.src).toBe("");
  fetchMock.mockResolvedValue(Response.json(descriptor));
  await act(async () => player.play(episode));
  await act(async () => { finish(new Response(null, { status: 403 })); old.dispatchEvent(new Event("playing")); });
  expect(player.point?.modeId).toBe("podcasts");
  expect(player.status).toBe("playing");
  expect(player.canPlayPrevious).toBe(false);
  expect(FakeAudio.instances.filter(audio => !audio.paused)).toHaveLength(1);
});

it("refuses points from another mode before resolving", async () => {
  await act(async () => player.play(episode));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(FakeAudio.instances).toHaveLength(0);
});

it("seeks and changes rate only within advertised and engine-supported capabilities", async () => {
  await act(async () => player.play(point));
  expect(player.seek(10)).toBe(false); expect(player.setRate(2)).toBe(false);
  await mount(podcastConfig);
  fetchMock.mockResolvedValue(Response.json(descriptor));
  await act(async () => player.play(episode));
  const audio = FakeAudio.instances.at(-1)!;
  expect(player.controls).toEqual(descriptor.controls);
  expect(player.seek(90)).toBe(true); expect(audio.currentTime).toBe(90);
  expect(player.seek(10)).toBe(true); expect(audio.currentTime).toBe(10);
  for (const value of [-1, 121, NaN, Infinity]) expect(player.seek(value)).toBe(false);
  expect(player.setRate(1.5)).toBe(true); expect(audio.playbackRate).toBe(1.5);
  for (const value of [0, 4, NaN, Infinity]) expect(player.setRate(value)).toBe(false);
  await act(async () => player.pause());
  await act(async () => player.resume());
  expect(audio.currentTime).toBe(10); expect(audio.playbackRate).toBe(1.5);
  expect(FakeAudio.instances).toHaveLength(2);
  await act(async () => player.stop());
  expect(player.seek(1)).toBe(false); expect(player.setRate(1)).toBe(false);
});

it.each(["playing", "paused"])("expires a %s source and resolves a fresh source only on user retry", async status => {
  vi.useFakeTimers();
  await mount(podcastConfig);
  fetchMock.mockResolvedValue(Response.json({ ...descriptor, expiresAt: new Date(Date.now() + 1000).toISOString() }));
  await act(async () => player.play(episode));
  const old = FakeAudio.instances[0];
  if (status === "paused") await act(async () => player.pause());
  await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
  expect(player.status).toBe("error"); expect(player.error).toContain("expired");
  expect(old.src).toBe(""); expect(old.paused).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockResolvedValue(Response.json({ ...descriptor, sources: [{ url: "https://fresh.example/a.mp3", transport: "direct" }] }));
  await act(async () => player.play(episode));
  expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("refresh=true");
  expect(player.status).toBe("playing"); expect(FakeAudio.instances[1].src).toContain("fresh.example");
});

it.each([
  null,
  { ...descriptor, pointId: "wrong" },
  { ...descriptor, modeId: "radio" },
  { ...descriptor, mediaKind: "video" },
  { ...descriptor, timeline: "live" },
  { ...descriptor, expiresAt: "yesterday" },
  { ...descriptor, expiresAt: "2000-01-01T00:00:00Z" },
  { ...descriptor, controls: { seek: true } },
  { ...descriptor, sources: [] },
  { ...descriptor, sources: [{ url: "javascript:alert(1)", transport: "direct" }] },
  { ...descriptor, sources: [{ url: "https://user:secret@example.com/a", transport: "direct" }] },
  { ...descriptor, sources: [{ url: "http://example.com/a", transport: "direct" }] },
  { ...descriptor, sources: [{ url: "https://example.com/a", transport: "other" }] },
  { ...descriptor, headers: { Authorization: "secret" } },
])("fails a malformed or expired descriptor before creating an engine (%#)", async invalid => {
  await mount(podcastConfig);
  fetchMock.mockResolvedValue(Response.json(invalid));
  await act(async () => player.play(episode));
  expect(player.status).toBe("error");
  expect(FakeAudio.instances).toHaveLength(0);
  expect(player.controls.seek).toBe(false);
});

it("rejects unsupported video and embed transports safely", async () => {
  await act(async () => player.play(point)); const old = FakeAudio.instances[0];
  const tvConfig = { ...podcastConfig, modeId: "tv", mediaKind: "video" } as TerraPlaybackConfig;
  await mount(tvConfig);
  const channel = { ...point, modeId: "tv", kind: "channel" } as TerraPoint;
  for (const transport of ["hls", "embed"]) {
    fetchMock.mockResolvedValue(Response.json({ ...descriptor, modeId: "tv", mediaKind: "video", sources: [{ url: "https://tv.example/live", transport }] }));
    await act(async () => player.play(channel));
    expect(player.status).toBe("error"); expect(player.error).toContain("not supported");
  }
  expect(old.src).toBe(""); expect(FakeAudio.instances).toHaveLength(1);
});

it("coordinates a video test engine without depending on audio events and fences stale callbacks", async () => {
  let emit!: (event: EngineEvent) => void;
  const dispose = vi.fn();
  const factory: PlaybackEngineFactory = () => ({
    start: async () => {}, subscribe: listener => { emit = listener; }, pause: vi.fn(),
    seek: () => false, setRate: () => false, dispose,
    snapshot: () => ({ mediaErrorCode: 0, readyState: 4, networkState: 1 }),
  });
  await mount({ ...podcastConfig, modeId: "tv", mediaKind: "video" }, factory);
  fetchMock.mockResolvedValue(Response.json({ ...descriptor, modeId: "tv", mediaKind: "video" }));
  await act(async () => player.play({ ...point, modeId: "tv", kind: "channel" }));
  expect(player.status).toBe("playing"); expect(FakeAudio.instances).toHaveLength(0);
  await act(async () => emit("buffering")); expect(player.status).toBe("buffering");
  await mount(config);
  await act(async () => { emit("playing"); emit("error"); });
  expect(player.status).toBe("idle"); expect(dispose).toHaveBeenCalledTimes(1);
});

it("checks policy while buffering, bounds in-flight work, and revokes playback", async () => {
  vi.useFakeTimers();
  await act(async () => player.play(point)); const audio = FakeAudio.instances[0];
  await act(async () => audio.dispatchEvent(new Event("waiting")));
  let finish!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(45_000); });
  // A deliberately noncooperative fetch remains in flight; never overlap another request.
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => finish(Response.json({ availability: { status: "available" } })));
  fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(player.status).toBe("idle"); expect(audio.src).toBe("");
});

it("does not send diagnostics or policy requests for time updates or repeated buffering events", async () => {
  vi.useFakeTimers();
  await act(async () => player.play(point)); const audio = FakeAudio.instances[0];
  await act(async () => {
    for (let index = 0; index < 100; index++) {
      audio.dispatchEvent(new Event("timeupdate")); audio.dispatchEvent(new Event("waiting")); audio.dispatchEvent(new Event("playing"));
    }
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(reportPlaybackDiagnostic).toHaveBeenCalledTimes(1);
  const serialized = JSON.stringify(vi.mocked(reportPlaybackDiagnostic).mock.calls);
  expect(serialized).not.toContain("https:"); expect(serialized).not.toContain("sources");
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("preserves playback from saved radio aliases when the server returns a canonical ID", async () => {
  fetchMock.mockResolvedValue(Response.json({ ...payload, pointId: "canonical-station", mediaKind: "audio" }));
  await act(async () => player.play(point));
  expect(player.status).toBe("playing"); expect(player.pointId).toBe(point.id);
  expect(started).toHaveBeenCalledWith(point);
});

it("does not revive an expired session when paused after failure", async () => {
  vi.useFakeTimers();
  await mount(podcastConfig);
  fetchMock.mockResolvedValue(Response.json({ ...descriptor, expiresAt: new Date(Date.now() + 1000).toISOString() }));
  await act(async () => player.play(episode));
  await act(async () => { await vi.advanceTimersByTimeAsync(1001); player.pause(); await player.resume(); });
  expect(player.status).toBe("error"); expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("checks expiry again on resume if a suspended tab has not delivered the timer", async () => {
  vi.useFakeTimers();
  await mount(podcastConfig);
  fetchMock.mockResolvedValue(Response.json({ ...descriptor, expiresAt: new Date(Date.now() + 1000).toISOString() }));
  await act(async () => player.play(episode));
  const audio = FakeAudio.instances[0];
  await act(async () => player.pause());
  vi.setSystemTime(Date.now() + 2000);
  await act(async () => player.resume());
  expect(player.status).toBe("error"); expect(audio.src).toBe("");
  expect(audio.play).toHaveBeenCalledTimes(1);
});

it("does not pause an engine that does not advertise pause", async () => {
  await mount(podcastConfig);
  fetchMock.mockResolvedValue(Response.json({ ...descriptor, controls: { ...descriptor.controls, pause: false } }));
  await act(async () => player.play(episode));
  await act(async () => player.pause());
  expect(player.status).toBe("playing"); expect(FakeAudio.instances[0].paused).toBe(false);
  await act(async () => player.stop());
  expect(FakeAudio.instances[0].paused).toBe(true);
});

it.each(["playing", "paused"])("stops %s radio at the next policy check when disabled", async status => {
  vi.useFakeTimers();
  await act(async () => player.play(point));
  if (status === "paused") await act(async () => player.pause());
  fetchMock.mockResolvedValue(Response.json({ availability: { status: "disabled" } }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(player.status).toBe("idle"); expect(FakeAudio.instances[0].src).toBe("");
});
