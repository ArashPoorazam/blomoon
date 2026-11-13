CREATE TABLE ingestion_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CONSTRAINT ingestion_source_kind CHECK (kind IN ('feed','guide')),
  url text NOT NULL CHECK (length(url) <= 4096), origins text[] NOT NULL CHECK (cardinality(origins) BETWEEN 1 AND 8),
  enabled boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  interval_seconds integer NOT NULL DEFAULT 3600 CONSTRAINT ingestion_source_interval CHECK (interval_seconds BETWEEN 60 AND 86400),
  next_run timestamptz NOT NULL DEFAULT now(), etag text, last_modified text, validator_url text,
  last_success timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ingestion_sources ENABLE ROW LEVEL SECURITY;
CREATE INDEX ingestion_source_due_idx ON ingestion_sources (next_run) WHERE enabled;
--> statement-breakpoint
CREATE TABLE ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id uuid NOT NULL REFERENCES ingestion_sources(id), revision integer NOT NULL,
  dedupe_key text NOT NULL CHECK (length(dedupe_key) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'queued' CONSTRAINT ingestion_job_status CHECK (status IN ('queued','running','succeeded','failed')),
  attempts integer NOT NULL DEFAULT 0 CONSTRAINT ingestion_job_attempts CHECK (attempts BETWEEN 0 AND 3),
  due_at timestamptz NOT NULL DEFAULT now(), lease_token uuid, lease_until timestamptz, error_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'running') = (lease_token IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE UNIQUE INDEX ingestion_job_dedupe_idx ON ingestion_jobs (source_id,dedupe_key);
CREATE UNIQUE INDEX ingestion_job_active_idx ON ingestion_jobs (source_id) WHERE status IN ('queued','running');
CREATE INDEX ingestion_job_due_idx ON ingestion_jobs (due_at) WHERE status IN ('queued','running');
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE ingestion_documents (
  source_id uuid PRIMARY KEY REFERENCES ingestion_sources(id), revision integer NOT NULL, document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), CHECK (octet_length(document::text) <= 12582912)
);
ALTER TABLE ingestion_documents ENABLE ROW LEVEL SECURITY;
CREATE TABLE ingestion_host_slots (token uuid PRIMARY KEY, host text NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX ingestion_host_expiry_idx ON ingestion_host_slots (host,expires_at);
ALTER TABLE ingestion_host_slots ENABLE ROW LEVEL SECURITY;
