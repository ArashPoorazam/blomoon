import 'server-only';
import type { Sql } from 'postgres';
import type { DirectoryShow } from './directory';
/** Privileged operator step: a directory result must match an already verified curated feed alias. */
export async function linkDirectoryShow(db: Sql, sourceId: string, candidate: DirectoryShow) {
  if (candidate.provider !== 'podcast-index' || !/^apple:[1-9]\d{0,15}$/.test(candidate.providerKey)) throw new Error('Invalid directory identity');
  return db.begin(async tx => {
    const [feed] = await tx`select f.show_id from podcast_feeds f join podcast_feed_aliases a on a.source_id=f.source_id
      where f.source_id=${sourceId} and a.url=${candidate.feedUrl} for update of f`;
    if (!feed) throw new Error('Directory feed requires verified curated alias');
    await tx`insert into media_providers(id,mode_id,name,url,attribution) values
      ('podcasts-index','podcasts','Podcast Index','https://podcastindex.org','Podcast Index') on conflict do nothing`;
    await tx`insert into media_identity_aliases(mode_id,kind,provider_id,provider_item_id,media_item_id)
      values ('podcasts','show','podcasts-index',${candidate.providerKey},${feed.show_id}) on conflict do nothing`;
    const [alias] = await tx`select media_item_id from media_identity_aliases where mode_id='podcasts' and kind='show'
      and provider_id='podcasts-index' and provider_item_id=${candidate.providerKey}`;
    if (alias.media_item_id !== feed.show_id) throw new Error('Directory identity already belongs to another show');
    return feed.show_id as string;
  });
}
