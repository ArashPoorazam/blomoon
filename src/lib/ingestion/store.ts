import "server-only";
import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { approvedUrl } from "./address";
import { INGESTION_LIMITS as limits, type FetchResult } from "./contracts";
import { IngestionError, type IngestionFailure } from "./errors";

export type IngestionSource = {
  id: string; kind: "feed" | "guide"; url: string; origins: string[]; enabled: boolean; revision: number;
  interval_seconds: number; etag: string | null; last_modified: string | null; validator_url: string | null;
};
export type IngestionJob = { id: string; source_id: string; revision: number; lease_token: string; attempts: number; source: IngestionSource };
export type SourceConfig = { id?: string; kind: "feed" | "guide"; url: string; origins: string[]; enabled?: boolean; intervalSeconds?: number };
export type ApplyDocument = (tx: TransactionSql, result: FetchResult, source: IngestionSource) => Promise<void>;

/** Internal worker/operator API only. Never expose URLs or callbacks through a public route. */
export function createIngestionStore(db: Sql) {
  return {
    async configureSource(config: SourceConfig) {
      if (!["feed", "guide"].includes(config.kind) || config.origins.length < 1 || config.origins.length > 8) throw new IngestionError("unapproved_origin");
      for (const origin of config.origins) if (approvedUrl(origin, config.origins).origin !== origin) throw new IngestionError("unapproved_origin");
      const url = approvedUrl(config.url, config.origins).href;
      const interval = config.intervalSeconds ?? 3600;
      if (!Number.isInteger(interval) || interval < 60 || interval > 86400) throw new Error("Invalid ingestion interval");
      const id = config.id ?? randomUUID();
      await db.begin(async tx => {
        await tx`insert into ingestion_sources(id,kind,url,origins,enabled,interval_seconds) values
          (${id},${config.kind},${url},${config.origins},${config.enabled ?? true},${interval})
          on conflict(id) do update set kind=excluded.kind,url=excluded.url,origins=excluded.origins,enabled=excluded.enabled,
          interval_seconds=excluded.interval_seconds,revision=ingestion_sources.revision+1,next_run=clock_timestamp(),
          etag=null,last_modified=null,validator_url=null,updated_at=clock_timestamp()`;
        await tx`update ingestion_jobs set status='failed',error_code='source_changed',lease_token=null,lease_until=null,updated_at=clock_timestamp()
          where source_id=${id} and status in ('queued','running')`;
      });
      return id;
    },
    async enqueue(sourceId: string, key: string) {
      if (!key.length || key.length > 200) throw new Error("Invalid ingestion dedupe key");
      return db.begin(async tx => {
        const [source] = await tx<IngestionSource[]>`select * from ingestion_sources where id=${sourceId} and enabled for update`;
        if (!source) throw new IngestionError("source_changed");
        return enqueue(tx, source, key);
      });
    },
    async schedule() {
      return db.begin(async tx => {
        const sources = await tx<(IngestionSource & { next_run: Date })[]>`select * from ingestion_sources s where enabled and next_run<=clock_timestamp()
          and not exists(select 1 from ingestion_jobs j where j.source_id=s.id and j.status in ('queued','running'))
          order by next_run,id limit 100 for update skip locked`;
        for (const source of sources) {
          await enqueue(tx, source, `${source.revision}:${source.next_run.toISOString()}`);
          await tx`update ingestion_sources set next_run=clock_timestamp()+(${source.interval_seconds}*(1+random()*0.1))*interval '1 second' where id=${source.id}`;
        }
        return sources.length;
      });
    },
    async claim(): Promise<IngestionJob | null> {
      return db.begin(async tx => {
        // Short cross-process claim lock enforces the global worker budget; jobs use SKIP LOCKED.
        await tx`select pg_advisory_xact_lock(72409191)`;
        await tx`update ingestion_jobs set status='failed',error_code='lease_lost',lease_token=null,lease_until=null,updated_at=clock_timestamp()
          where status='running' and lease_until<=clock_timestamp() and attempts>=${limits.attempts}`;
        const [job] = await tx<Omit<IngestionJob, "source">[]>`update ingestion_jobs set status='running',attempts=attempts+1,
          lease_token=${randomUUID()},lease_until=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp()
          where id=(select j.id from ingestion_jobs j join ingestion_sources s on s.id=j.source_id
          where s.enabled and s.revision=j.revision and j.attempts<${limits.attempts} and j.due_at<=clock_timestamp()
          and (j.status='queued' or (j.status='running' and j.lease_until<=clock_timestamp()))
          and (select count(*) from ingestion_jobs where status='running' and lease_until>clock_timestamp())<${limits.concurrency}
          order by j.due_at,j.id limit 1 for update of j skip locked) returning *`;
        if (!job) return null;
        const [source] = await tx<IngestionSource[]>`select * from ingestion_sources where id=${job.source_id}`;
        return { ...job, source };
      });
    },
    async heartbeat(job: IngestionJob) {
      const rows = await db`update ingestion_jobs j set lease_until=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp()
        where id=${job.id} and lease_token=${job.lease_token} and status='running' and lease_until>clock_timestamp()
        and exists(select 1 from ingestion_sources s where s.id=j.source_id and s.enabled and s.revision=j.revision) returning id`;
      return rows.length === 1;
    },
    async complete(job: IngestionJob, result: FetchResult, apply?: ApplyDocument) {
      await db.begin(async tx => {
        await tx`set local statement_timeout='5s'`;
        const [source] = await tx<IngestionSource[]>`select * from ingestion_sources where id=${job.source_id} for update`;
        if (!source?.enabled || source.revision !== job.revision) throw new IngestionError("lease_lost");
        const locked = await tx`select id from ingestion_jobs where id=${job.id} and lease_token=${job.lease_token}
          and status='running' and lease_until>clock_timestamp() for update`;
        if (!locked.length) throw new IngestionError("lease_lost");
        if (result.status === "modified") {
          if (!result.document) throw new IngestionError("invalid_xml");
          if (Buffer.byteLength(JSON.stringify(result.document)) > limits.outputBytes) throw new IngestionError("too_large");
          await apply?.(tx, result, source);
          await tx`insert into ingestion_documents(source_id,revision,document) values (${source.id},${source.revision},${tx.json(result.document)})
            on conflict(source_id) do update set revision=excluded.revision,document=excluded.document,updated_at=clock_timestamp()`;
        } else {
          const current = await tx`select source_id from ingestion_documents where source_id=${source.id} and revision=${source.revision}`;
          if (!current.length) throw new IngestionError("invalid_xml");
        }
        await tx`update ingestion_sources set etag=${result.status === "not_modified" ? result.etag ?? source.etag : result.etag},
          last_modified=${result.status === "not_modified" ? result.lastModified ?? source.last_modified : result.lastModified},
          validator_url=${result.finalUrl},last_success=clock_timestamp(),updated_at=clock_timestamp() where id=${source.id}`;
        // Fence again after applying domain writes. Any expiry rolls back ALL writes, not just job status.
        const done = await tx`update ingestion_jobs set status='succeeded',lease_token=null,lease_until=null,error_code=null,updated_at=clock_timestamp()
          where id=${job.id} and lease_token=${job.lease_token} and lease_until>clock_timestamp() returning id`;
        if (!done.length) throw new IngestionError("lease_lost");
      });
    },
    async fail(job: IngestionJob, code: IngestionFailure) {
      const rows = await db`update ingestion_jobs set status=case when attempts>=${limits.attempts} then 'failed' else 'queued' end,
        due_at=clock_timestamp()+(least(300,5*power(2,attempts-1))*(0.8+random()*0.4))*interval '1 second',
        error_code=${code},lease_token=null,lease_until=null,updated_at=clock_timestamp()
        where id=${job.id} and status='running' and lease_token=${job.lease_token} and lease_until>clock_timestamp() returning id`;
      return rows.length === 1;
    },
    async failedJobs() {
      return db`select id,source_id,revision,attempts,error_code,created_at,updated_at from ingestion_jobs where status='failed' order by updated_at desc limit 100`;
    },
    async acquireHost(host: string) {
      return db.begin(async tx => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${host},72409192))`;
        await tx`delete from ingestion_host_slots where expires_at<=clock_timestamp()`;
        const token = randomUUID();
        const rows = await tx`insert into ingestion_host_slots(token,host,expires_at)
          select ${token},${host},clock_timestamp()+interval '30 seconds'
          where (select count(*) from ingestion_host_slots where host=${host} and expires_at>clock_timestamp())<${limits.hostConcurrency} returning token`;
        return rows.length ? token : null;
      });
    },
    async releaseHost(token: string) { await db`delete from ingestion_host_slots where token=${token}`; },
  };
}
async function enqueue(tx: TransactionSql, source: IngestionSource, key: string) {
  const [created] = await tx<{ id: string }[]>`insert into ingestion_jobs(source_id,revision,dedupe_key) values (${source.id},${source.revision},${key}) on conflict do nothing returning id`;
  if (created) return created.id;
  const [existing] = await tx<{ id: string }[]>`select id from ingestion_jobs where source_id=${source.id} and (dedupe_key=${key} or status in ('queued','running')) order by (dedupe_key=${key}) desc limit 1`;
  return existing.id;
}
export type IngestionStore = ReturnType<typeof createIngestionStore>;
