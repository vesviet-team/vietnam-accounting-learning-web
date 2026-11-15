-- P1 schema: per-entity learning sync (multi-device).
-- Merge policy (server-side, see internal/sync):
--   learning_progress  = max/union merge (completed_days union, milestone_scores max-per-day,
--                        current_day max, revision = max(existing, incoming))
--   test_attempts      = union by uuid (ON CONFLICT DO NOTHING) — append-only
--   active_days        = union by (user_id, day)
--   workbench_snapshots= LWW on client-supplied revision
--
-- `seq` is a server-assigned globally monotonic number (one shared sequence)
-- used ONLY for pull cursors: GET /sync/pull?cursor=N returns rows with
-- seq > N. Client-supplied `revision` columns are the LWW/merge revisions.
-- Idempotence is handled by the embedded migrator (schema_migrations table).

CREATE SEQUENCE IF NOT EXISTS sync_entity_seq;

CREATE TABLE learning_progress (
    user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_days   integer[]   NOT NULL DEFAULT '{}',
    milestone_scores jsonb       NOT NULL DEFAULT '{}',
    current_day      int         NOT NULL DEFAULT 1,
    regime           text        NOT NULL DEFAULT '',
    revision         bigint      NOT NULL DEFAULT 1,
    device_id        text        NOT NULL DEFAULT '',
    seq              bigint      NOT NULL DEFAULT nextval('sync_entity_seq'),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Append-only attempt log. id (uuid) is generated client-side so the same
-- attempt can be re-pushed from multiple devices without duplication.
CREATE TABLE test_attempts (
    id            uuid PRIMARY KEY,
    user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_day int         NOT NULL,
    answers       jsonb       NOT NULL DEFAULT '{}',
    score         int         NOT NULL DEFAULT 0,
    passed        boolean     NOT NULL DEFAULT false,
    dok_breakdown jsonb,
    item_results  jsonb,
    attempt_ts    timestamptz NOT NULL DEFAULT now(),
    device_id     text        NOT NULL DEFAULT '',
    seq           bigint      NOT NULL DEFAULT nextval('sync_entity_seq')
);

CREATE INDEX idx_test_attempts_user_milestone ON test_attempts(user_id, milestone_day);
CREATE INDEX idx_test_attempts_user_seq ON test_attempts(user_id, seq);

CREATE TABLE active_days (
    user_id uuid   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     date   NOT NULL,
    source  text   NOT NULL DEFAULT '',
    seq     bigint NOT NULL DEFAULT nextval('sync_entity_seq'),
    PRIMARY KEY (user_id, day)
);

CREATE INDEX idx_active_days_user_seq ON active_days(user_id, seq);

-- One snapshot per (user, kind). LWW: an incoming row is applied only when
-- its revision is strictly greater than the stored one.
CREATE TABLE workbench_snapshots (
    id         uuid PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       text        NOT NULL CHECK (kind IN ('journalizer', 'cogs')),
    payload    jsonb       NOT NULL DEFAULT '{}',
    revision   bigint      NOT NULL,
    device_id  text        NOT NULL DEFAULT '',
    seq        bigint      NOT NULL DEFAULT nextval('sync_entity_seq'),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, kind)
);
