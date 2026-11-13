import { createServer } from "node:http";
import { readFileSync } from "node:fs";

// Entirely synthetic, loopback-only publisher. Each instance owns its clock/state.
export async function startMediaFixture() {
  let tick = 0;
  const segments = [0, 1, 2].map(i => readFileSync(new URL(`./assets/segment-${i}.mpegts`, import.meta.url)));
  const samples = 8000 * 4;
  const audio = Buffer.alloc(44 + samples * 2);
  audio.write("RIFF"); audio.writeUInt32LE(audio.length - 8, 4); audio.write("WAVEfmt ", 8);
  audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34); audio.write("data", 36); audio.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) audio.writeInt16LE(Math.round(2000 * Math.sin(2 * Math.PI * 440 * i / 8000)), 44 + i * 2);
  const server = createServer((req, res) => {
    const url = new URL(req.url!, "http://fixture.invalid");
    const path = url.pathname;
    const send = (status: number, body: string | Buffer, type = "text/plain") => {
      res.writeHead(status, { "Content-Type": type, "Content-Length": Buffer.byteLength(body) });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, ETag");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Headers", "Range, If-None-Match");
      res.writeHead(204); res.end(); return;
    }
    if (!["GET", "HEAD"].includes(req.method!)) { send(405, "method not allowed"); return; }
    if (path === "/redirect") { res.setHeader("Location", "/feed.xml"); send(302, ""); return; }
    if (path === "/redirect-loop") { res.setHeader("Location", "/redirect-loop"); send(302, ""); return; }
    if (path === "/invalid.xml") { send(200, "<rss><channel>", "application/rss+xml"); return; }
    if (path === "/unavailable") { send(503, "fixture publisher unavailable"); return; }
    if (path === "/expired.wav" && tick >= 2) { send(403, "fixture source expired"); return; }
    if (path === "/audio.wav" || path === "/expired.wav") {
      res.setHeader("Accept-Ranges", "bytes");
      const range = req.headers.range;
      if (!range) { send(200, audio, "audio/wav"); return; }
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = 0, end = audio.length - 1;
      if (match) {
        start = match[1] ? Number(match[1]) : Math.max(0, audio.length - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      }
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || start > end || start >= audio.length) {
        res.setHeader("Content-Range", `bytes */${audio.length}`); send(416, ""); return;
      }
      res.setHeader("Content-Range", `bytes ${start}-${end}/${audio.length}`);
      send(206, audio.subarray(start, end + 1), "audio/wav"); return;
    }
    if (path === "/feed.xml") {
      res.setHeader("ETag", '"fixture-v1"');
      if (req.headers["if-none-match"] === '"fixture-v1"') { res.writeHead(304); res.end(); return; }
      // Enclosure stays on the bound loopback origin.
      const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      send(200, `<?xml version="1.0"?><rss version="2.0"><channel><title>Synthetic podcast</title><link>${origin}/</link><description>Owned test tone</description><item><guid isPermaLink="false">fixture-episode-1</guid><title>Episode One</title><pubDate>Thu, 12 Nov 2026 00:00:00 GMT</pubDate><enclosure url="${origin}/audio.wav" length="${audio.length}" type="audio/wav"/></item></channel></rss>`, "application/rss+xml"); return;
    }
    if (path === "/guide.xml") {
      send(200, '<?xml version="1.0"?><tv><channel id="fixture-tv"><display-name>Synthetic TV</display-name></channel><programme start="20261112000000 +0000" stop="20261112003000 +0000" channel="fixture-tv"><title>Now</title></programme><programme start="20261112003000 +0000" stop="20261112010000 +0000" channel="fixture-tv"><title>Next</title></programme></tv>', "application/xml"); return;
    }
    if (path === "/master.m3u8") {
      send(200, '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=200000,RESOLUTION=160x90,CODECS="avc1.64000a,mp4a.40.2"\n/live.m3u8\n', "application/vnd.apple.mpegurl"); return;
    }
    if (["/live.m3u8", "/frozen.m3u8", "/broken.m3u8"].includes(path)) {
      const sequence = path === "/frozen.m3u8" ? 0 : tick;
      // Repeated synthetic clips use discontinuities to reset their media timestamps.
      const entries = [0, 1, 2].map(i => `#EXT-X-DISCONTINUITY\n#EXTINF:2.0,\n/${path === "/broken.m3u8" ? "missing" : "segment"}/${sequence + i}.ts\n`).join("");
      send(200, `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:${sequence}\n#EXT-X-DISCONTINUITY-SEQUENCE:${sequence}\n${entries}`, "application/vnd.apple.mpegurl"); return;
    }
    const segment = /^\/segment\/(\d+)\.ts$/.exec(path);
    if (segment) { send(200, segments[Number(segment[1]) % segments.length], "video/mp2t"); return; }
    send(404, "fixture not found");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    advance(steps = 1) {
      if (!Number.isSafeInteger(steps) || steps < 0 || !Number.isSafeInteger(tick + steps)) throw new Error("Invalid fixture clock increment");
      tick += steps;
    },
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
