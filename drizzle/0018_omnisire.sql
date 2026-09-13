CREATE TABLE admin_settings (id text PRIMARY KEY, value jsonb NOT NULL, version integer NOT NULL DEFAULT 0);
CREATE TABLE admin_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, resource text NOT NULL, action text NOT NULL, changes jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX admin_audit_date_idx ON admin_audit(created_at);
CREATE TABLE user_suspensions (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE media_blocks (key text PRIMARY KEY, mode_id text NOT NULL, point_id uuid NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX media_blocks_point_idx ON media_blocks(mode_id,point_id);
CREATE TABLE admin_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mode_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('sync','recheck')), target_id text NOT NULL DEFAULT '', actor_id uuid, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed')), attempts integer NOT NULL DEFAULT 0, lease_token uuid, lease_until timestamptz, result text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX admin_jobs_status_idx ON admin_jobs(status,created_at);
CREATE TABLE monitor_samples (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), received_at timestamptz NOT NULL DEFAULT now(), snapshot jsonb NOT NULL);
CREATE INDEX monitor_samples_date_idx ON monitor_samples(received_at);
CREATE TABLE admin_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), severity text NOT NULL, event text NOT NULL, resource text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX admin_events_date_idx ON admin_events(created_at);
INSERT INTO admin_audit(id,actor_id,resource,action,changes,created_at) SELECT id,actor_id,'radio:'||station_id,action,changes,created_at FROM radio_admin_audit ON CONFLICT DO NOTHING;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;

-- Serialize session creation with moderation so racing logins cannot bypass suspension.
CREATE FUNCTION omnisire_session_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM users WHERE id=NEW.user_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM user_suspensions WHERE user_id=NEW.user_id) THEN
    RAISE EXCEPTION 'Account access denied' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER omnisire_session_access BEFORE INSERT ON sessions FOR EACH ROW EXECUTE FUNCTION omnisire_session_access();
-- Covers all account creation paths, including direct password verification transactions.
CREATE FUNCTION omnisire_registration_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('settings:application'));
  IF EXISTS(SELECT 1 FROM admin_settings WHERE id='application' AND value->>'registrationEnabled'='false') THEN
    RAISE EXCEPTION 'Registration is closed' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER omnisire_registration_access BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION omnisire_registration_access();

-- Persist the current curated source set so unblocking cannot revive retired addresses.
ALTER TABLE radio_curated_stations ADD COLUMN stream_urls text[] NOT NULL DEFAULT '{}';
UPDATE radio_curated_stations c SET stream_urls=coalesce(
  (SELECT ARRAY(SELECT jsonb_array_elements_text(a.changes->'after'->'streams'))
   FROM radio_admin_audit a WHERE a.station_id=c.station_id AND a.action IN ('create','update')
   AND jsonb_typeof(a.changes->'after'->'streams')='array' ORDER BY a.created_at DESC LIMIT 1),
  ARRAY[c.record->>'streamUrl']
);
