# Ingestion primitives (P05)

P05 supplies durable jobs, safe fetching, parser isolation and transactional publication hooks for P06 podcast feeds and P12 guides. It does not register either mode, approve a publisher, or ingest a real catalog. Existing radio workers retain their queues and behavior; the address classifier was extracted unchanged into `src/lib/network/publicAddress.ts` for reuse.

## Queue and publication

`createIngestionStore` takes a dedicated PostgreSQL client. Trusted curation calls `configureSource` with a stable source ID, feed/guide kind, HTTPS URL, explicit approved origins and a 60–86,400 second schedule. Updating configuration increments its revision, invalidates active jobs and clears conditional validators, while retaining the last good document. P06 owns the relationship between source IDs and canonical show/feed identities.

`enqueue(sourceId, dedupeKey)` accepts an identity, never a URL. A unique source/key constraint deduplicates requests even after completion; a partial unique index permits only one queued/running job per source. Use a new key for an explicit retry. The scheduler keys work by source revision and scheduled time, processes at most 100 due sources, adds 0–10% jitter, and skips active/disabled sources.

Claims use `FOR UPDATE SKIP LOCKED`, a short advisory lock for the four-job global budget, a random token, and a 60-second database-clock lease. Heartbeats run every 10 seconds without overlapping requests. Expired leases cannot be renewed. Crashed jobs can be reclaimed up to three total attempts; explicit failures use exponential 5/10/20-second backoff with 0.8–1.2 jitter. Exhausted jobs remain inspectable. A later scheduled cycle is a new job, not unlimited retries of the failed job.

`complete` locks the source and job, validates revision/enabled state/token/expiry, then calls optional `apply(tx, result, source)`. Domain writes MUST use that transaction and stable identity upserts. Do not perform network calls or external side effects inside it. Expiry is checked again after domain writes; failure rolls back domain writes, snapshot, validators and completion together. SQL statements have a five-second timeout. Callbacks are trusted application code and must themselves be bounded.

Failures never delete or replace the last good document or its validators. HTTP 304 updates freshness only when a document for the current revision exists. Snapshots are **untrusted source data**, not display-safe HTML: P06/P12 adapters must normalize fields and use `sanitizeDisplayHtml` for display HTML. Its allowlist permits paragraphs, breaks, emphasis and lists; it removes attributes, links, images, scripts and embeds.

Failed-job inspection returns at most 100 rows with identity, attempts and error category, omitting URLs, lease tokens and documents. P14 can add operational retention and dashboards. Database effects are fenced and idempotent; external effects are not made exactly-once by this queue.

## Fetch and parser isolation

The coordinator owns a restricted database credential. Each publisher job runs in a bundled child with only constant `NODE_ENV=production`; no inherited secrets, `NODE_OPTIONS`, proxy variables or application configuration. It can read only its bundle, cannot write files/spawn processes/use addons, has a 128 MiB V8 heap limit and a 20-second deadline. The parent also kills it after 20 seconds or cancellation. IPC only coordinates approved-host slots and bounded results. After fetching, the child drops network and filesystem permissions before parsing. Node permissions are defense in depth for trusted code, not an arbitrary-code sandbox.

The coordinator CLI rejects superuser, bypass-RLS, role/database-creation and replication privileges. It also rejects access to unrelated public tables/views and source-URL/insert privileges. The optional role setup grants access only to ingestion tables and scheduling/cache/freshness columns of sources. Publisher children never receive even that scoped DB credential.

| Bound | Implementation |
| --- | --- |
| Destination | HTTPS on port 443, no URL credentials/fragments, at most eight explicitly approved origins. GET only; no arbitrary headers, cookies, auth or proxy configuration. |
| SSRF | Reject nonpublic IPv4/IPv6 and DNS sets containing any unsafe address. Revalidate each redirect, including same-host redirects. Connect to the validated IP while retaining TLS hostname/Host; no second DNS lookup. |
| Redirects/headers | At most three redirects, approved origins only; 8 KiB response headers. Native HTTPS certificate validation remains enabled. |
| Conditional requests | ETag/Last-Modified go only to the exact URL of the last successful validators. Strip on different redirect resources; reject unsolicited 304; do not save validators from failed parses. |
| Concurrency | Four global active jobs; two distributed host slots per hostname, including redirect destinations. Slots expire after 30 seconds; child lifetime is at most 20 seconds. Cancellation kills the child before releasing its slots. |
| Time | Fifteen seconds covers DNS, host waits, redirects and body reading. Host-capacity waits use jitter. |
| Bytes | 2 MiB compressed/wire body and 4 MiB decompressed body. Gzip, deflate and Brotli pass through both counters. Reject excess Content-Length and unsupported encoding. |
| XML | UTF-8 only; 32 levels, 50,000 elements, 32 attributes/element, 65,536 characters per text/attribute field. Reject DTDs, custom entities, XInclude namespace and non-XML processing instructions. No external resolution. RSS/Atom/RDF feed roots and XMLTV `tv` guide root. |
| Result | 12 MiB serialized result/document, one last-good snapshot per source. No raw-response HTTP endpoint. |

Private-address rejection is enforced by the fetch implementation; parser network access is disabled entirely. No production firewall was deployed. P15 must still apply infrastructure egress controls and container resource limits.

## Operation and rollback

Use Node **26.12.1**, PostgreSQL **17** and migration **0021**. The additive migration does not rewrite radio/account data. Keep its tables on application rollback and stop the ingestion worker.

```sh
npm ci
npm run ingestion:build
# Set BLOMOON_INGESTION_DATABASE_URL to a dedicated restricted worker login.
# This worker does not load .env.local or use the application's DATABASE_URL.
npm run ingestion:worker -- --once
npm run ingestion:worker -- --failed
npm run ingestion:worker
```

Each daemon processes one job at a time; independently started workers share the four-job budget. Empty configuration makes no publisher request. SIGINT/SIGTERM cancels the child and closes the DB pool. No production service was automatically added.

Before an authorized deployment, apply `scripts/ingestion-role.sql` **once** using an operator account: `psql --set ON_ERROR_STOP=1 --single-transaction --file scripts/ingestion-role.sql`. It creates a NOLOGIN group and RLS policies. Provision a dedicated LOGIN separately, grant the group, and deliver its credential outside the repository. Source curation remains privileged; future domain-write grants must be explicit in P06/P12.

`Dockerfile.ingestion` defines an optional non-root image that builds the isolated bundle. It was not built or deployed in P05. A future authorized container deployment should supply only the scoped DB URL, use a read-only filesystem, drop capabilities, disallow privilege escalation, set memory/CPU/PID limits, and restrict egress. The local bundle and restricted child were tested directly.

## Verification and references

DB tests require an explicitly disposable local PostgreSQL 17 database named `blomoon_p05_*`. The migration checker creates/drops randomly named databases:

```sh
P05_DISPOSABLE=1 P05_TEST_DATABASE_URL=postgres://user@127.0.0.1:55439/postgres \
  node --import tsx scripts/check-ingestion-migration.mts
DATABASE_URL=postgres://user@127.0.0.1:55439/blomoon_p05_suite npm run db:migrate
DATABASE_URL=postgres://user@127.0.0.1:55439/blomoon_p05_suite \
  INGESTION_INTEGRATION=1 npm test -- src/lib/ingestion/store.integration.test.ts
```

See [P05 evidence](evidence/P05.md). HTTP/DNS fixtures contact no publishers. Primary references checked for implementation: [Node permissions](https://nodejs.org/api/permissions.html), [sax entity behavior](https://github.com/isaacs/sax-js#regarding-doctypes-and-entitys), [sanitize-html maintained package](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html), and [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). Dependencies are pinned to `sax` 1.6.1, `sanitize-html` 2.18.2 and bundler `esbuild` 0.28.2; integration behavior was tested on the required Node runtime.


P06 continuation: [approved podcast source profiles](podcast-sources.md) add a source-specific larger-feed budget, fully validated DNS-address fallback and flushed child IPC output. Default P05 budgets remain in effect for other feeds/guides. See P06 evidence for live-provider and regression results.
