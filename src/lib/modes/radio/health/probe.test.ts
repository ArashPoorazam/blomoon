import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { probeStream } from "./probe";
function response(status: number, body: Buffer, headers: Record<string, string> = {}) {
  mocks.request.mockImplementationOnce((options, callback) => {
    const req = Object.assign(new EventEmitter(), {
      destroy: vi.fn(),
      end: () => {
        const res = Object.assign(new EventEmitter(), { statusCode: status, headers, destroy: vi.fn() });
        callback(res);
        res.emit("data", body);
        res.emit("end");
      },
    });
    options.signal.addEventListener("abort", () => req.emit("error", new Error("aborted")), { once: true });
    return req;
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
});
describe("DNS-pinned bounded probes", () => {
  it("connects to the validated address while preserving TLS hostname", async () => {
    const bytes = Buffer.alloc(900);
    bytes.set([255, 251, 144, 0], 0);
    bytes.set([255, 251, 144, 0], 417);
    response(200, bytes);
    expect(await probeStream("https://radio.example/live")).toMatchObject({ ok: true, bytes: 900 });
    expect(mocks.request.mock.calls[0][0]).toMatchObject({
      hostname: "1.1.1.1",
      servername: "radio.example",
      headers: { Host: "radio.example" },
      agent: false,
    });
  });
  it("rejects DNS answers containing private addresses before connecting", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "1.1.1.1", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    expect(await probeStream("https://radio.example/live")).toMatchObject({
      ok: false,
      reason: "unsafe_address",
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("revalidates redirect DNS and blocks a private destination", async () => {
    mocks.lookup
      .mockResolvedValueOnce([{ address: "1.1.1.1", family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
    response(302, Buffer.alloc(0), { location: "https://internal.example/live" });
    expect(await probeStream("https://radio.example/live")).toMatchObject({
      ok: false,
      reason: "unsafe_address",
    });
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("does not trust success status or audio content type", async () => {
    response(200, Buffer.from("<html>not audio</html>"), { "content-type": "audio/mpeg" });
    expect(await probeStream("https://radio.example/live")).toMatchObject({
      ok: false,
      reason: "unrecognized_audio",
    });
  });
  it("caps data consumption and redirects", async () => {
    response(200, Buffer.alloc(100000));
    expect(await probeStream("https://radio.example/live")).toMatchObject({ ok: false, bytes: 65536 });
    vi.clearAllMocks();
    for (let i = 0; i < 4; i++) response(302, Buffer.alloc(0), { location: "/another" });
    expect(await probeStream("https://radio.example/live")).toMatchObject({
      ok: false,
      reason: "redirect_limit",
    });
    expect(mocks.request).toHaveBeenCalledTimes(4);
  });
});
