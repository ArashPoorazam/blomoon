import { describe, expect, it } from "vitest";
import { isRecentlyVerified, nextCheckDelay, HEALTH_TTL_MS } from "./policy";
import { isPublicAddress, recognizeAudio, probeStream } from "./probe";
describe("availability policy", () => {
  const now = Date.now();
  it("requires initial success, tolerates two failures, expires at 24 hours", () => {
    expect(isRecentlyVerified({ enabled: true, lastSuccess: null, failures: 0 }, now)).toBe(false);
    expect(isRecentlyVerified({ enabled: true, lastSuccess: new Date(now - 1), failures: 2 }, now)).toBe(
      true,
    );
    expect(isRecentlyVerified({ enabled: true, lastSuccess: new Date(now - 1), failures: 3 }, now)).toBe(
      false,
    );
    expect(
      isRecentlyVerified({ enabled: true, lastSuccess: new Date(now - HEALTH_TTL_MS), failures: 0 }, now),
    ).toBe(false);
    expect(isRecentlyVerified({ enabled: false, lastSuccess: new Date(now), failures: 0 }, now)).toBe(false);
  });
  it("backs off failures while accelerating recently played streams", () => {
    expect([1, 2, 3, 4, 100].map((n) => nextCheckDelay(false, n, false))).toEqual([
      300000, 1800000, 7200000, 86400000, 86400000,
    ]);
    expect(nextCheckDelay(true, 0, true)).toBe(3600000);
    expect(nextCheckDelay(true, 0, false)).toBe(21600000);
  });
});
describe("probe boundaries", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "100.64.1.1",
    "192.0.2.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "2001:db8::1",
    "2002:7f00:1::1",
  ])("rejects private/reserved destination %s", (address) => expect(isPublicAddress(address)).toBe(false));
  it("allows public IPv4 and IPv6", () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("requires multiple audio frames and rejects header-like junk", () => {
    expect(recognizeAudio(Buffer.from("<html>audio/mpeg</html>"))).toBe(false);
    const mp3 = Buffer.alloc(900);
    mp3.set([255, 251, 144, 0], 0);
    expect(recognizeAudio(mp3)).toBe(false);
    mp3.set([255, 251, 144, 0], 417);
    expect(recognizeAudio(mp3)).toBe(true);
  });
  it("requires audio payload after Ogg and WAV headers", () => {
    const head = Buffer.alloc(47);
    head.write("OggS");
    head[26] = 1;
    head[27] = 19;
    head.write("OpusHead", 28);
    expect(recognizeAudio(head)).toBe(false);
    const page = Buffer.alloc(31);
    page.write("OggS");
    page[26] = 1;
    page[27] = 3;
    page.set([0, 1, 2], 28);
    expect(recognizeAudio(Buffer.concat([head, page]))).toBe(true);
    expect(recognizeAudio(Buffer.concat([head, page.subarray(0, 29)]))).toBe(false);
    const wave = Buffer.alloc(46);
    wave.write("RIFF");
    wave.write("WAVE", 8);
    wave.write("fmt ", 12);
    wave.writeUInt32LE(16, 16);
    wave.writeUInt16LE(1, 20);
    wave.writeUInt16LE(1, 22);
    wave.writeUInt32LE(44100, 24);
    wave.writeUInt16LE(2, 32);
    wave.writeUInt16LE(16, 34);
    wave.write("data", 36);
    wave.writeUInt32LE(2, 40);
    expect(recognizeAudio(wave.subarray(0, 44))).toBe(false);
    expect(recognizeAudio(wave)).toBe(true);
  });
  it("rejects insecure, internal and unsupported playlist URLs", async () => {
    for (const url of ["http://example.com/live", "https://127.0.0.1/live", "https://example.com/a.m3u8"]) {
      expect((await probeStream(url)).ok).toBe(false);
    }
  });
});
