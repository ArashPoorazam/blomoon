import 'server-only';
import { fetchDocument } from '../../ingestion/fetch';
import { approvedUrl } from '../../ingestion/address';

export type DirectoryShow = {
  provider: 'podcast-index'; providerKey: string; title: string; author: string; feedUrl: string;
  attribution: 'Podcast Index';
};
const origin = 'https://api.podcastindex.org';
type Transport = (url: string) => Promise<Buffer>;
const transport: Transport = async url => {
  const result = await fetchDocument({url,origins:[origin],etag:null,lastModified:null,validatorUrl:null},
    async () => async () => {}, AbortSignal.timeout(15_000), 'json');
  return result.body;
};
function text(value: unknown, max: number) { return typeof value === 'string' && value.length <= max ? value : ''; }
export function normalizeDirectory(body: Buffer): DirectoryShow[] {
  if (body.length > 4 * 1024 * 1024) throw new Error('Directory response too large');
  const parsed = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));
  if (!parsed || !Array.isArray(parsed.results) || parsed.results.length > 100 || parsed.resultCount !== parsed.results.length) throw new Error('Invalid directory response');
  const unique = new Map<string,DirectoryShow>();
  for (const row of parsed.results) {
    if (!row || row.kind !== 'podcast' || !Number.isSafeInteger(row.trackId) || row.trackId <= 0) continue;
    const title = text(row.trackName,512), author = text(row.artistName,512), raw = text(row.feedUrl,4096);
    if (!title || !raw) continue;
    let feedUrl: string;
    try { const url = new URL(raw); feedUrl = approvedUrl(raw,[url.origin]).href; } catch { continue; }
    // Compatibility endpoints expose Apple IDs, NOT native Podcast Index feed IDs.
    const providerKey = `apple:${row.trackId}`;
    const show: DirectoryShow = {provider:'podcast-index',providerKey,title,author,feedUrl,attribution:'Podcast Index'};
    const previous = unique.get(providerKey);
    if (previous && previous.feedUrl !== feedUrl) throw new Error('Conflicting directory identity');
    unique.set(providerKey,show);
  }
  return [...unique.values()];
}
/** Operator ingestion/discovery client, not a public URL proxy. One instance per process.
 * Five-minute, 64-entry cache; one request in flight, >=1s apart; outages cool down for 60s.
 * No keys/accounts/billing, no automatic feed approval. Multi-replica public search is P07/P14.
 */
export function createPodcastIndex(fetcher: Transport = transport, now = Date.now) {
  const cache = new Map<string,{until:number;shows:DirectoryShow[]}>();
  let busy = false, nextRequest = 0;
  async function request(path: string, params: Record<string,string>) {
    const url = new URL(path,origin);for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
    const key=url.href, cached=cache.get(key);
    if (cached && cached.until > now()) return structuredClone(cached.shows);
    if (busy || now() < nextRequest) throw new Error('Directory temporarily unavailable');
    busy=true;nextRequest=now()+1000;
    try {
      const shows=normalizeDirectory(await fetcher(key));
      if (cache.size >= 64) cache.delete(cache.keys().next().value!);
      cache.set(key,{until:now()+300_000,shows});return structuredClone(shows);
    } catch { nextRequest=now()+60_000;throw new Error('Directory temporarily unavailable'); }
    finally {busy=false;}
  }
  return {
    search(term:string) {
      term=term.trim();if (!term || term.length>120 || /[\x00-\x1f]/.test(term)) throw new Error('Invalid search term');
      return request('/search',{term,limit:'20'});
    },
    lookup(providerKey:string) {
      if (!/^apple:[1-9]\d{0,15}$/.test(providerKey) || !Number.isSafeInteger(Number(providerKey.slice(6)))) throw new Error('Invalid directory identity');
      return request('/lookup',{id:providerKey.slice(6),entity:'podcast'});
    },
  };
}
