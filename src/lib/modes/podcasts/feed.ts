import { createHash } from 'node:crypto';
import type { XmlNode } from '../../ingestion/contracts';
import { IngestionError } from '../../ingestion/errors';
import { sanitizeDisplayHtml } from '../../ingestion/xml';

export type PodcastEnclosure = { url: string; mime: string; bytes: number | null };
export type PodcastEpisode = {
  key: string; title: string; description: string; publishedAt: string | null;
  explicit: boolean | null; duration: number | null; enclosures: PodcastEnclosure[];
};
export type PodcastFeed = { title: string; description: string; language: string | null; explicit: boolean | null; episodes: PodcastEpisode[] };
const children = (node: XmlNode, name: string) => node.children.filter(child => child.name === name);
const value = (node: XmlNode, name: string) => children(node, name)[0]?.text.trim() ?? '';
const plain = (text: string) => sanitizeDisplayHtml(text).replace(/<[^>]*>/g, '').trim();
const explicit = (text: string) => /^(true|yes|explicit)$/i.test(text) ? true : /^(false|no|clean)$/i.test(text) ? false : null;
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
function invalid(): never { throw new IngestionError('invalid_xml'); }
function duration(text: string): number | null {
  if (!/^\d+(?::[0-5]\d){0,2}$/.test(text)) return null;
  const seconds = text.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
  return Number.isSafeInteger(seconds) && seconds <= 2147483647 ? seconds : null;
}
function enclosure(node: XmlNode): PodcastEnclosure {
  let url: URL;
  try { url = new URL(node.attributes.url); } catch { return invalid(); }
  // Delivery is direct from the publisher; ingestion never fetches these URLs.
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash) return invalid();
  const mime = node.attributes.type?.toLowerCase() ?? '';
  if (!/^audio\/[a-z0-9.+-]+$/.test(mime)) return invalid();
  const length = node.attributes.length;
  const bytes = length && /^\d+$/.test(length) && Number.isSafeInteger(Number(length)) ? Number(length) : null;
  return { url: url.href, mime, bytes };
}
/** RSS 2.0 curated adapter. Other feed formats fail without replacing the last good catalog. */
export function normalizePodcastFeed(root: XmlNode): PodcastFeed {
  if (root.name !== 'rss' || children(root, 'channel').length !== 1) return invalid();
  const channel = children(root, 'channel')[0];
  const title = plain(value(channel, 'title'));
  if (!title) return invalid();
  const items = children(channel, 'item');
  if (items.length > 1000) throw new IngestionError('xml_limit');
  const episodes = new Map<string, PodcastEpisode>();
  for (const item of items) {
    const title = plain(value(item, 'title'));
    const links = children(item, 'enclosure');
    if (!title || !links.length || links.length > 8) return invalid();
    const enclosures = [...new Map(links.map(link => { const e = enclosure(link); return [e.url, e]; })).values()];
    const guid = value(item, 'guid');
    // Without GUID we require an explicit stable item link, never title/enclosure URL.
    const stable = guid || value(item, 'link');
    if (!stable) return invalid();
    const key = `${guid ? 'guid' : 'link'}:${digest(stable)}`;
    const date = Date.parse(value(item, 'pubDate'));
    const episode: PodcastEpisode = {
      key, title, description: sanitizeDisplayHtml(value(item, 'content:encoded') || value(item, 'description')),
      publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null,
      explicit: explicit(value(item, 'itunes:explicit')), duration: duration(value(item, 'itunes:duration')), enclosures,
    };
    const previous = episodes.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify(episode)) return invalid();
    episodes.set(key, episode);
  }
  return { title, description: sanitizeDisplayHtml(value(channel, 'description')), language: value(channel, 'language') || null,
    explicit: explicit(value(channel, 'itunes:explicit')), episodes: [...episodes.values()] };
}

/** Inactive feeds poll daily; recent episodes poll hourly. Failures use the queue's bounded retries. */
export function feedInterval(feed: PodcastFeed, now = Date.now()) {
  return feed.episodes.some(e => e.publishedAt && Date.parse(e.publishedAt) <= now && Date.parse(e.publishedAt) > now - 7 * 86400000) ? 3600 : 86400;
}
