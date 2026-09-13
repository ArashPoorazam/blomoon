ALTER TABLE radio_curated_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_stream_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_health_worker ENABLE ROW LEVEL SECURITY;
ALTER VIEW radio_directory SET (security_invoker = true);
