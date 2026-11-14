-- Additive personal state; existing favourites and radio history stay unchanged.
CREATE TABLE podcast_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id uuid NOT NULL REFERENCES podcast_shows(media_item_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,show_id)
);
CREATE INDEX podcast_follows_recent_idx ON podcast_follows(user_id,created_at DESC,show_id);
CREATE INDEX podcast_follows_show_idx ON podcast_follows(show_id);
CREATE TABLE podcast_saves (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES podcast_episodes(media_item_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,episode_id)
);
CREATE INDEX podcast_saves_recent_idx ON podcast_saves(user_id,created_at DESC,episode_id);
CREATE INDEX podcast_saves_episode_idx ON podcast_saves(episode_id);
CREATE TABLE podcast_listening (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES podcast_episodes(media_item_id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 0 CHECK(version >= 0),
  session_id uuid,
  sequence integer NOT NULL DEFAULT 0 CHECK(sequence >= 0),
  position_seconds double precision NOT NULL DEFAULT 0 CHECK(position_seconds >= 0 AND position_seconds <= 604800),
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,episode_id)
);
CREATE INDEX podcast_listening_episode_idx ON podcast_listening(episode_id);
CREATE INDEX podcast_listening_recent_idx ON podcast_listening(user_id,updated_at DESC,episode_id);
ALTER TABLE podcast_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_listening ENABLE ROW LEVEL SECURITY;
