import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Sql, TransactionSql } from 'postgres';
import { approvedUrl } from '../../ingestion/address';
import type { ApplyDocument } from '../../ingestion/store';
import { IngestionError } from '../../ingestion/errors';
import { feedInterval, normalizePodcastFeed } from './feed';

/** Privileged curation only. Bind an approved existing source once; feed moves keep that source ID. */
export async function bindCuratedFeed(db: Sql, sourceId: string, provenance: string, attribution: string) {
  if (!provenance.trim() || !attribution.trim()) throw new Error('Provenance and attribution required');
  return db.begin(async tx => {
    const [source] = await tx`select * from ingestion_sources where id=${sourceId} and kind='feed' for update`;
    if (!source) throw new Error('Feed source required');
    const [existing] = await tx`select show_id from podcast_feeds where source_id=${sourceId}`;
    if (existing) return existing.show_id as string;
    const id = randomUUID();
    await tx`insert into media_items(id,mode_id,kind,provider_id,provider_item_id,name,summary)
      values (${id},'podcasts','show','podcasts-curated',${`show:${sourceId}`},'Pending feed','')`;
    await tx`insert into podcast_shows(media_item_id) values (${id})`;
    await tx`insert into podcast_feeds(source_id,show_id,provenance,attribution) values (${sourceId},${id},${provenance},${attribution})`;
    await alias(tx, 'show', sourceId, id);
    await feedAlias(tx, source.url, sourceId);
    return id;
  });
}
async function alias(tx: TransactionSql, kind: 'show' | 'episode', key: string, id: string) {
  await tx`insert into media_identity_aliases(mode_id,kind,provider_id,provider_item_id,media_item_id)
    values ('podcasts',${kind},'podcasts-curated',${key},${id}) on conflict do nothing`;
}
async function feedAlias(tx: TransactionSql, url: string, sourceId: string) {
  await tx`insert into podcast_feed_aliases(url,source_id) values (${url},${sourceId}) on conflict do nothing`;
  const [owner] = await tx`select source_id from podcast_feed_aliases where url=${url}`;
  if (owner?.source_id !== sourceId) throw new IngestionError('source_changed');
}

/** Executed only inside complete()'s lease-fenced transaction; no network or user-state writes. */
export const applyPodcastFeed: ApplyDocument = async (tx, result, source) => {
  if (source.kind !== 'feed') return;
  const [feed] = await tx`select show_id from podcast_feeds where source_id=${source.id}`;
  if (!feed || !result.document) throw new IngestionError('source_changed');
  const finalUrl = approvedUrl(result.finalUrl, source.origins).href;
  const normalized = normalizePodcastFeed(result.document);
  await feedAlias(tx, source.url, source.id);
  await feedAlias(tx, finalUrl, source.id);
  await tx`update media_items set provider_metadata=${tx.json({author:normalized.author,copyright:normalized.copyright,topics:normalized.topics})},name=${normalized.title}, summary=${normalized.description},provider_updated_at=clock_timestamp(),updated_at=clock_timestamp() where id=${feed.show_id}`;
  await tx`update podcast_shows set description=${normalized.description},language=${normalized.language},explicit=${normalized.explicit},updated_at=clock_timestamp() where media_item_id=${feed.show_id}`;
  for (const episode of normalized.episodes) {
    const primary = `episode:${feed.show_id}:${episode.key}`;
    const [media] = await tx`insert into media_items(id,mode_id,kind,provider_id,provider_item_id,name,summary,provider_updated_at,provider_metadata)
      values (${randomUUID()},'podcasts','episode','podcasts-curated',${primary},${episode.title},${episode.description},clock_timestamp(),${tx.json({author:episode.author,copyright:episode.copyright})})
      on conflict(provider_id,provider_item_id) do update set provider_metadata=excluded.provider_metadata,name=excluded.name,summary=excluded.summary,provider_updated_at=excluded.provider_updated_at,updated_at=clock_timestamp() returning id`;
    await tx`insert into podcast_episodes(media_item_id,show_id,identity_key,description,published_at,explicit,duration_seconds)
      values (${media.id},${feed.show_id},${episode.key},${episode.description},${episode.publishedAt},${episode.explicit},${episode.duration})
      on conflict(media_item_id) do update set description=excluded.description,published_at=excluded.published_at,explicit=excluded.explicit,duration_seconds=excluded.duration_seconds,updated_at=clock_timestamp()`;
    await alias(tx, 'episode', `${feed.show_id}:${episode.key}`, media.id);
    await tx`update podcast_enclosures set active=false where episode_id=${media.id}`;
    for (const enclosure of episode.enclosures) {
      await tx`insert into podcast_enclosures(episode_id,url,mime,bytes) values (${media.id},${enclosure.url},${enclosure.mime},${enclosure.bytes})
        on conflict(episode_id,url) do update set mime=excluded.mime,bytes=excluded.bytes,active=true,updated_at=clock_timestamp()`;
    }
  }
  // Omitted rolling-feed episodes retain identity, metadata, enclosures and saved state.
  const interval = feedInterval(normalized);
  await tx`update ingestion_sources set interval_seconds=${interval},next_run=clock_timestamp()+(${interval}*(1+random()*0.1))*interval '1 second' where id=${source.id}`;
};

/** Operator-facing freshness/outcome view, bounded and free of raw feed documents/URLs. */
export async function podcastIngestionStatus(db: Sql) {
  return db`select f.source_id,f.show_id,s.enabled,s.last_success,s.next_run,
    j.status,j.error_code,j.attempts from podcast_feeds f join ingestion_sources s on s.id=f.source_id
    left join lateral (select status,error_code,attempts from ingestion_jobs where source_id=f.source_id order by created_at desc,id desc limit 1) j on true
    order by s.last_success nulls first,f.source_id limit 100`;
}
