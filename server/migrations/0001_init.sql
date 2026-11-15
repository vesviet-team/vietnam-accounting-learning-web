-- P0 schema for vietnam-accounting-api.
-- Idempotence is handled by the embedded migrator (schema_migrations table).

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id            uuid PRIMARY KEY,
    email         citext UNIQUE,
    display_name  text        NOT NULL DEFAULT '',
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    disabled_at   timestamptz
);

CREATE TABLE identities (
    id         uuid PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       text        NOT NULL CHECK (type IN ('email_password')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_identities_user_id ON identities(user_id);

CREATE TABLE oauth_sessions (
    id           uuid PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id    text        NOT NULL DEFAULT '',
    refresh_hash text        NOT NULL,
    rotated_from uuid        REFERENCES oauth_sessions(id) ON DELETE SET NULL,
    scope        text        NOT NULL,
    revoked_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    expires_at   timestamptz NOT NULL
);

-- Refresh token rotation chain lookup (family revocation).
CREATE INDEX idx_oauth_sessions_rotated_from ON oauth_sessions(rotated_from);
CREATE INDEX idx_oauth_sessions_user_id ON oauth_sessions(user_id);

CREATE TABLE authorization_codes (
    code_hash             text PRIMARY KEY,
    client_id             text        NOT NULL,
    user_id               uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri          text        NOT NULL,
    scope                 text        NOT NULL,
    code_challenge        text        NOT NULL,
    code_challenge_method text        NOT NULL CHECK (code_challenge_method IN ('S256')),
    expires_at            timestamptz NOT NULL,
    used_at               timestamptz
);

CREATE INDEX idx_authorization_codes_user_id ON authorization_codes(user_id);

CREATE TABLE backup_blobs (
    user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload    jsonb       NOT NULL,
    revision   bigint      NOT NULL,
    device_id  text        NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
);
