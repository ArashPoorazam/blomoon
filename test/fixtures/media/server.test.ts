import { afterEach, beforeEach, expect, it } from "vitest";
import { startMediaFixture } from "./server.mjs";
let fixture: Awaited<ReturnType<typeof startMediaFixture>>;
beforeEach(async () => { fixture = await startMediaFixture(); });
afterEach(async () => { await fixture?.close(); });
const get = (path: string, init?: RequestInit) => fetch(fixture.origin + path, init);
it("serves RSS, conditional refresh, guide boundaries and a bounded redirect", async () => {
  const feed = await get("/redirect");
  expect(feed.url).toBe(fixture.origin + "/feed.xml");
  expect(await feed.text()).toContain(`${fixture.origin}/audio.wav`);
  expect((await get("/feed.xml", { headers: { "If-None-Match": '"fixture-v1"' } })).status).toBe(304);
  const guide = await (await get("/guide.xml")).text();
  expect(guide.match(/20261112003000/g)).toHaveLength(2);
  expect(guide).toContain('channel="fixture-tv"');
});
it("serves valid PCM audio and exact closed, open and suffix byte ranges", async () => {
  const full = Buffer.from(await (await get("/audio.wav")).arrayBuffer());
  expect(full.toString("ascii", 0, 4)).toBe("RIFF");
  expect(full.readUInt32LE(40)).toBe(full.length - 44);
  for (const [range, start, end] of [["bytes=44-99", 44, 100], ["bytes=64040-", 64040, full.length], ["bytes=-8", full.length - 8, full.length]] as const) {
    const response = await get("/audio.wav", { headers: { Range: range } });
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes ${start}-${end - 1}/${full.length}`);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(full.subarray(start, end));
  }
  for (const range of ["bytes=90000-", "bytes=10-2", "bytes=-0", "bytes=0-1,4-5", "garbage"]) {
    expect((await get("/audio.wav", { headers: { Range: range } })).status).toBe(416);
  }
  expect((await get("/audio.wav", { method: "HEAD" })).headers.get("Content-Length")).toBe(String(full.length));
});
it("advances HLS explicitly, keeps frozen playlists unchanged and serves framed TS packets", async () => {
  expect(await (await get("/master.m3u8")).text()).toContain("/live.m3u8");
  const frozen = await (await get("/frozen.m3u8")).text();
  expect(await (await get("/live.m3u8")).text()).toContain("MEDIA-SEQUENCE:0");
  fixture.advance();
  expect(await (await get("/live.m3u8")).text()).toContain("MEDIA-SEQUENCE:1");
  expect(await (await get("/frozen.m3u8")).text()).toBe(frozen);
  for (const id of [0, 1, 2, 3]) {
    const bytes = new Uint8Array(await (await get(`/segment/${id}.ts`)).arrayBuffer());
    expect(bytes.length % 188).toBe(0);
    for (let i = 0; i < bytes.length; i += 188) expect(bytes[i]).toBe(0x47);
  }
});
it("reproduces expiry, invalid XML, missing segments, outages and redirect loops locally", async () => {
  expect((await get("/expired.wav")).status).toBe(200);
  fixture.advance(2);
  expect((await get("/expired.wav")).status).toBe(403);
  expect(await (await get("/invalid.xml")).text()).toBe("<rss><channel>");
  expect((await get("/unavailable")).status).toBe(503);
  expect(await (await get("/broken.m3u8")).text()).toContain("/missing/");
  expect((await get("/missing/2.ts")).status).toBe(404);
  await expect(get("/redirect-loop")).rejects.toThrow();
});
it("isolates fixture clocks between instances", async () => {
  const other = await startMediaFixture();
  try {
    fixture.advance(2);
    expect((await fetch(other.origin + "/expired.wav")).status).toBe(200);
  } finally { await other.close(); }
});
