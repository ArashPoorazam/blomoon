import { describe, expect, it } from 'vitest';
import { parseXml } from '../../ingestion/xml';
import { feedInterval, normalizePodcastFeed } from './feed';
import { item, rss } from './fixtures';
const read = (xml: string) => normalizePodcastFeed(parseXml(Buffer.from(xml)));
describe('curated RSS normalization', () => {
  it('preserves GUID identity across URL/title corrections and deduplicates identical items', () => {
    const a = read(rss(item() + item()));
    const b = read(rss(item('one','https://cdn.example/new.mp3').replace('Episode','Corrected')));
    expect(a.episodes).toHaveLength(1); expect(b.episodes[0].key).toBe(a.episodes[0].key);
  });
  it('rejects conflicting duplicate GUIDs and missing stable identity', () => {
    expect(() => read(rss(item() + item('one','https://cdn.example/new.mp3')))).toThrow('invalid_xml');
    expect(() => read(rss(item().replace('<guid>one</guid>','')))).toThrow('invalid_xml');
  });
  it('uses explicit item links as fallback identity, never enclosure/title', () => {
    expect(read(rss(item().replace('<guid>one</guid>','<link>https://example/episode</link>'))).episodes[0].key).toMatch(/^link:/);
  });
  it('sanitizes HTML and tolerates absent/invalid optional metadata', () => {
    const episode = read(rss(item('one',undefined,'<description><![CDATA[<script>bad()</script><p onclick="bad()">Safe</p>]]></description><pubDate>not a date</pubDate><itunes:duration>01:02:03</itunes:duration><itunes:explicit>yes</itunes:explicit>'))).episodes[0];
    expect(episode.description).toBe('<p>Safe</p>'); expect(episode.publishedAt).toBeNull();expect(episode.duration).toBe(3723);expect(episode.explicit).toBe(true);
    expect(read(rss()).episodes[0].explicit).toBeNull();
  });
  it('rejects unsupported formats and malformed enclosures without partial publication', () => {
    for (const xml of ['<feed/>',rss(item('one','javascript:alert(1)')),rss('<item><guid>a</guid><title>A</title></item>'),rss(item().replace('audio/mpeg','text/html'))]) expect(() => read(xml)).toThrow('invalid_xml');
    expect(() => read(rss(item().repeat(1001)))).toThrow('xml_limit');
  });
  it('chooses bounded activity schedules and supports an empty rolling feed', () => {
    const now = Date.parse('2026-11-13T00:00:00Z');
    expect(feedInterval(read(rss(item('one',undefined,'<pubDate>Thu, 12 Nov 2026 00:00:00 GMT</pubDate>'))),now)).toBe(3600);
    expect(feedInterval(read(rss()),now)).toBe(86400);expect(read(rss('')).episodes).toEqual([]);
  });
});
