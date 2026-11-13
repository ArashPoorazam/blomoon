-- Operator-applied to the target database after migration 0021, never automatically by migrations.
-- Creates a NOLOGIN group, with no password or infrastructure secret in the repository.
-- Grant it to a dedicated LOGIN role provisioned separately, then use that login only for ingestion.
CREATE ROLE blomoon_ingestion NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT USAGE ON SCHEMA public TO blomoon_ingestion;
GRANT SELECT ON ingestion_sources, ingestion_jobs, ingestion_documents, ingestion_host_slots TO blomoon_ingestion;
GRANT INSERT, UPDATE ON ingestion_jobs, ingestion_documents TO blomoon_ingestion;
GRANT INSERT, DELETE ON ingestion_host_slots TO blomoon_ingestion;
GRANT UPDATE (next_run, etag, last_modified, validator_url, last_success, updated_at) ON ingestion_sources TO blomoon_ingestion;
CREATE POLICY ingestion_source_worker ON ingestion_sources TO blomoon_ingestion USING (true) WITH CHECK (true);
CREATE POLICY ingestion_job_worker ON ingestion_jobs TO blomoon_ingestion USING (true) WITH CHECK (true);
CREATE POLICY ingestion_document_worker ON ingestion_documents TO blomoon_ingestion USING (true) WITH CHECK (true);
CREATE POLICY ingestion_host_worker ON ingestion_host_slots TO blomoon_ingestion USING (true) WITH CHECK (true);
