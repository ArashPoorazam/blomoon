# Controlled media publisher

P02 fixtures contain only generated test patterns and tones, with no publisher assets, credentials, database or outbound requests. The server binds an ephemeral port on `127.0.0.1` only. Never deploy it as an application API or weaken production SSRF checks to reach it. Future ingestion tests should inject an explicitly test-only transport.

Run `node --import tsx test/fixtures/media/serve.mts` and use the printed origin. Ctrl-C closes it. The CLI advances the live clock every two seconds; tests import `startMediaFixture`, call `advance()` explicitly and always await `close()` in teardown. Each instance has independent state. Browser tests must arrange their own loopback/mixed-content permissions; this is not an HTTPS/CORS production acceptance test. CORS is deliberately open on these synthetic responses.

| Path | Behavior |
| --- | --- |
| `/feed.xml` | RSS with stable GUID and absolute local WAV enclosure; ETag / conditional 304 |
| `/audio.wav` | Four-second, mono PCM 8 kHz tone; full GET, HEAD, closed/open/suffix single byte ranges, 416 for invalid/unsatisfiable/multiple ranges |
| `/expired.wav` | Same audio, becomes 403 at clock tick 2 |
| `/master.m3u8` | H.264 High level 1.0 / AAC-LC rendition |
| `/live.m3u8` | Three-segment rolling window; explicit clock progression and timestamp discontinuities |
| `/frozen.m3u8` | Always sequence zero despite clock progression |
| `/broken.m3u8` | Syntactically valid playlist referencing 404 segments |
| `/segment/<integer>.ts` | Cyclic synthetic MPEG-TS clips, with discontinuities in playlists |
| `/guide.xml` | Fixed XMLTV channel with contiguous now/next at 00:30 UTC on 2026-11-12; inject that date in consumers |
| `/redirect`, `/redirect-loop` | Local feed redirect / deterministic redirect limit failure |
| `/invalid.xml`, `/unavailable` | Truncated XML / 503 outage |

`npx vitest run test/fixtures/media/server.test.ts` exercises actual loopback HTTP. It requires permission to bind loopback; restricted sandboxes may need an approved test invocation. No external service is involved. Tests check byte integrity, transport framing and fixture behavior; they do not prove browser decoding or future parser/player correctness. P05/P06/P11/P12 must extend scenarios as their consumers are implemented (hostile XML, feed migrations, slow/oversized bodies, guide corrections/DST, codec/key/track failures).

## Asset provenance and regeneration

Audio is synthesized directly as a RIFF/PCM buffer in `server.mts`. Video assets were generated locally with FFmpeg from `testsrc2` and `sine`; they contain no third-party content. They are stored as `.mpegts` so TypeScript does not parse binary `.ts` transport streams. FFmpeg is needed only to regenerate/inspect assets, not to run tests. Regeneration can differ by FFmpeg/encoder version; committed bytes are the test input.

```sh
ffmpeg -hide_banner -loglevel error \
  -f lavfi -i testsrc2=size=160x90:rate=10 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 \
  -t 6 -c:v libx264 -preset veryfast -g 20 -sc_threshold 0 \
  -pix_fmt yuv420p -c:a aac -b:a 32k -f hls -hls_segment_type mpegts \
  -hls_time 2 -hls_list_size 0 \
  -hls_segment_filename 'test/fixtures/media/assets/segment-%d.mpegts' \
  /tmp/blomoon-fixture.m3u8
```

The temporary generated playlist is not used: the server owns deterministic live/frozen windows. Verify each clip with `ffmpeg -v error -i <asset> -f null -` and codec metadata with `ffprobe`. Decode checks are separate from browser/device playback evidence.
