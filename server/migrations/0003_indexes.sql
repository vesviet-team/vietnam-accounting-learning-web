-- P2 index hardening for OAuth session lookups by refresh_hash.
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_refresh_hash ON oauth_sessions(refresh_hash);
