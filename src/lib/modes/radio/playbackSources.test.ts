import { describe, expect, it } from "vitest";
import { browserStreamUrl, radioPlaybackSources } from "./playbackSources";
const stationuuid = "9625c394-0601-11e8-ae97-52543be04c81";
describe("radio playback addresses", () => {
  it.each(["http://pureplay.cdnstream1.com/6039_128.mp3", "http://live.antenne.at/arr"])("upgrades the rejected real-world entry %s", url => {
    expect(radioPlaybackSources({ stationuuid, url, url_resolved: url })).toEqual({ sources: [{ streamUrl: url.replace("http:", "https:"), format: "audio" }], cacheable: true });
  });
  it("preserves port, path and query", () => expect(browserStreamUrl("http://radio.example:8000/live?k=v")).toBe("https://radio.example:8000/live?k=v"));
  it("preserves entry URLs and does not cache signed alternatives", () => {
    expect(radioPlaybackSources({ stationuuid, url: "https://entry.example/live", url_resolved: "https://cdn.example/live?token=expires" }))
      .toEqual({ sources: [{ streamUrl: "https://entry.example/live", format: "audio" }, { streamUrl: "https://cdn.example/live?token=expires", format: "audio" }], cacheable: false });
  });
  it.each(["pls", "m3u", "asx"])("uses the resolved stream for %s", ext => {
    expect(radioPlaybackSources({ stationuuid, url: `https://radio.example/list.${ext}`, url_resolved: "http://radio.example/live" }))
      .toEqual({ sources: [{ streamUrl: "https://radio.example/live", format: "audio" }], cacheable: false });
  });
  it("prefers supplied HTTPS and marks HLS", () => expect(radioPlaybackSources({ stationuuid, url: "http://a.example/live", url_resolved: "https://b.example/live", hls: 1 }).sources[0]).toEqual({ streamUrl: "https://b.example/live", format: "hls" }));
  it.each(["javascript:x", "file:///tmp/audio", "https://u:p@radio.example/live", "http://127.1/live", "http://2130706433/live", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://169.254.169.254/", "http://10.0.0.1/", "http://172.16.0.1/", "http://192.168.1.1/", "http://localhost/", "http://foo.local/", "http://localhost./", "bad"])("rejects %s", value => expect(browserStreamUrl(value)).toBeNull());
});
