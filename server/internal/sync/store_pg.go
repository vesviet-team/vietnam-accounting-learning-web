package sync

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore implements Store on pgx. All merge semantics live in SQL so a
// push is one atomic transaction (no read-modify-write races).
type PGStore struct {
	pool *pgxpool.Pool
}

func NewPGStore(pool *pgxpool.Pool) *PGStore { return &PGStore{pool: pool} }

var validKinds = map[string]bool{
	KindProgress: true, KindAttempts: true, KindActiveDays: true, KindWorkbench: true,
}

func normalizeKinds(raw []string) []string {
	if len(raw) == 0 {
		return []string{KindProgress, KindAttempts, KindActiveDays, KindWorkbench}
	}
	var out []string
	for _, k := range raw {
		k = strings.TrimSpace(k)
		if validKinds[k] {
			out = append(out, k)
		}
	}
	if len(out) == 0 {
		return []string{KindProgress, KindAttempts, KindActiveDays, KindWorkbench}
	}
	return out
}

// Merge applies the push batch atomically with the per-entity policy and
// returns the canonical full state.
func (s *PGStore) Merge(ctx context.Context, userID uuid.UUID, in PushInput) (State, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return State{}, err
	}
	defer tx.Rollback(ctx)

	if in.Progress != nil {
		p := in.Progress
		regime := p.Regime
		if len(regime) > 64 {
			regime = regime[:64]
		}
		scores := marshalScores(p.MilestoneScores)
		revision := p.Revision
		if revision < 1 {
			revision = 1
		}
		deviceID := truncateDeviceID(firstNonEmpty(in.DeviceID, p.DeviceID))
		// max/union merge: completed_days union (sorted, deduped),
		// milestone_scores max-per-day, current_day max, revision = max.
		_, err = tx.Exec(ctx, `
			INSERT INTO learning_progress
				(user_id, completed_days, milestone_scores, current_day, regime, revision, device_id, updated_at)
			VALUES ($1,
			        COALESCE($2::int[], '{}'),
			        $3::jsonb,
			        GREATEST(COALESCE($4, 1), 1),
			        $5, $6, $7, now())
			ON CONFLICT (user_id) DO UPDATE SET
				completed_days = (
					SELECT coalesce(array_agg(DISTINCT d ORDER BY d), '{}')
					FROM unnest(learning_progress.completed_days || COALESCE(EXCLUDED.completed_days, '{}')) AS d
				),
				milestone_scores = (
					SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb) FROM (
						SELECT key AS k, max((value #>> '{}')::numeric)::int AS v
						FROM (
							SELECT * FROM jsonb_each(learning_progress.milestone_scores)
							UNION ALL
							SELECT * FROM jsonb_each(EXCLUDED.milestone_scores)
						) pairs
						GROUP BY key
					) merged
				),
				current_day = GREATEST(learning_progress.current_day, EXCLUDED.current_day),
				regime = CASE WHEN EXCLUDED.regime <> '' THEN EXCLUDED.regime ELSE learning_progress.regime END,
				revision = GREATEST(learning_progress.revision, EXCLUDED.revision),
				device_id = EXCLUDED.device_id,
				seq = nextval('sync_entity_seq'),
				updated_at = now()`,
			userID, p.CompletedDays, scores, p.CurrentDay, regime, revision, deviceID,
		)
		if err != nil {
			return State{}, err
		}
	}

	for _, a := range in.Attempts {
		if err := insertAttempt(ctx, tx, userID, a, in.DeviceID); err != nil {
			return State{}, err
		}
	}

	for _, d := range in.ActiveDays {
		day, err := parseDay(d.Day)
		if err != nil {
			return State{}, err
		}
		source := d.Source
		if len(source) > 64 {
			source = source[:64]
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO active_days (user_id, day, source) VALUES ($1, $2, $3)
			ON CONFLICT (user_id, day) DO NOTHING`,
			userID, day, source,
		)
		if err != nil {
			return State{}, err
		}
	}

	for _, w := range in.Workbench {
		if w.Kind != "journalizer" && w.Kind != "cogs" {
			return State{}, errors.New("sync: invalid workbench kind")
		}
		kind := w.Kind
		if len(kind) > 32 {
			kind = kind[:32]
		}
		deviceID := truncateDeviceID(firstNonEmpty(in.DeviceID, w.DeviceID))
		id := uuid.UUID{}
		if w.ID != "" {
			parsed, perr := uuid.Parse(w.ID)
			if perr != nil {
				return State{}, errors.New("sync: invalid workbench id")
			}
			id = parsed
		} else {
			id = uuid.Must(uuid.NewV7())
		}
		// LWW: apply only when strictly newer than stored.
		_, err = tx.Exec(ctx, `
			INSERT INTO workbench_snapshots (id, user_id, kind, payload, revision, device_id, updated_at)
			VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb), $5, $6, now())
			ON CONFLICT (user_id, kind) DO UPDATE SET
				payload = EXCLUDED.payload,
				revision = EXCLUDED.revision,
				device_id = EXCLUDED.device_id,
				seq = nextval('sync_entity_seq'),
				updated_at = now()
			WHERE workbench_snapshots.revision < EXCLUDED.revision`,
			id, userID, kind, []byte(w.Payload), w.Revision, deviceID,
		)
		if err != nil {
			return State{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return State{}, err
	}
	return s.ExportAll(ctx, userID)
}

func insertAttempt(ctx context.Context, tx execer, userID uuid.UUID, a AttemptInput, fallbackDevice string) error {
	id, err := uuid.Parse(a.ID)
	if err != nil {
		return errors.New("sync: attempt id must be a uuid")
	}
	ts := parseTimestamp(a.AttemptTS)
	deviceID := truncateDeviceID(firstNonEmpty(fallbackDevice, a.DeviceID))
	// Union by uuid: existing attempts are never modified or duplicated.
	_, err = tx.Exec(ctx, `
		INSERT INTO test_attempts
			(id, user_id, milestone_day, answers, score, passed, dok_breakdown, item_results, attempt_ts, device_id)
		VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb), $5, $6, $7::jsonb, $8::jsonb, COALESCE($9, now()), $10)
		ON CONFLICT (id) DO NOTHING`,
		id, userID, a.MilestoneDay, []byte(a.Answers), a.Score, a.Passed,
		nullableJSON(a.DokBreakdown), nullableJSON(a.ItemResults), ts, deviceID,
	)
	return err
}

// Pull returns rows with seq > cursor for the requested kinds, plus the
// newest seq among them as the next cursor (never lower than the input).
func (s *PGStore) Pull(ctx context.Context, userID uuid.UUID, cursor int64, kinds []string) (PullResult, error) {
	kindSet := normalizeKinds(kinds)
	res := PullResult{Cursor: cursor, Attempts: []AttemptEntity{}, ActiveDays: []ActiveDayEntity{}, Workbench: []WorkbenchEntity{}}

	for _, k := range kindSet {
		switch k {
		case KindProgress:
			p, err := s.loadProgress(ctx, userID, cursor)
			if err != nil {
				return PullResult{}, err
			}
			res.Progress = p // nil when absent or not changed since cursor
		case KindAttempts:
			rows, err := s.loadAttempts(ctx, userID, cursor)
			if err != nil {
				return PullResult{}, err
			}
			res.Attempts = rows
		case KindActiveDays:
			rows, err := s.loadActiveDays(ctx, userID, cursor)
			if err != nil {
				return PullResult{}, err
			}
			res.ActiveDays = rows
		case KindWorkbench:
			rows, err := s.loadWorkbench(ctx, userID, cursor)
			if err != nil {
				return PullResult{}, err
			}
			res.Workbench = rows
		}
	}

	newCursor := cursor
	for _, a := range res.Attempts {
		if seq, ok, serr := s.seqOf(ctx, userID, "test_attempts", "id", a.ID); serr == nil && ok && seq > newCursor {
			newCursor = seq
		}
	}
	for _, d := range res.ActiveDays {
		if seq, ok, serr := s.seqOf(ctx, userID, "active_days", "day", d.Day); serr == nil && ok && seq > newCursor {
			newCursor = seq
		}
	}
	for _, w := range res.Workbench {
		if seq, ok, serr := s.seqOf(ctx, userID, "workbench_snapshots", "kind", w.Kind); serr == nil && ok && seq > newCursor {
			newCursor = seq
		}
	}
	if res.Progress != nil {
		if seq, ok, serr := s.progressSeq(ctx, userID); serr == nil && ok && seq > newCursor {
			newCursor = seq
		}
	}
	res.Cursor = newCursor
	return res, nil
}

func (s *PGStore) ExportAll(ctx context.Context, userID uuid.UUID) (State, error) {
	st := State{Attempts: []AttemptEntity{}, ActiveDays: []ActiveDayEntity{}, Workbench: []WorkbenchEntity{}}
	p, err := s.loadProgress(ctx, userID, 0)
	if err != nil {
		return State{}, err
	}
	st.Progress = p
	if st.Attempts, err = s.loadAttempts(ctx, userID, 0); err != nil {
		return State{}, err
	}
	if st.ActiveDays, err = s.loadActiveDays(ctx, userID, 0); err != nil {
		return State{}, err
	}
	if st.Workbench, err = s.loadWorkbench(ctx, userID, 0); err != nil {
		return State{}, err
	}
	st.Cursor = 0
	// Cursor = max seq across all rows so the exported cursor never
	// regresses for the client.
	for _, a := range st.Attempts {
		if seq, ok, serr := s.seqOf(ctx, userID, "test_attempts", "id", a.ID); serr == nil && ok && seq > st.Cursor {
			st.Cursor = seq
		}
	}
	for _, d := range st.ActiveDays {
		if seq, ok, serr := s.seqOf(ctx, userID, "active_days", "day", d.Day); serr == nil && ok && seq > st.Cursor {
			st.Cursor = seq
		}
	}
	for _, w := range st.Workbench {
		if seq, ok, serr := s.seqOf(ctx, userID, "workbench_snapshots", "kind", w.Kind); serr == nil && ok && seq > st.Cursor {
			st.Cursor = seq
		}
	}
	if st.Progress != nil {
		if seq, ok, serr := s.progressSeq(ctx, userID); serr == nil && ok && seq > st.Cursor {
			st.Cursor = seq
		}
	}
	return st, nil
}

func (s *PGStore) DeleteAll(ctx context.Context, userID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, q := range []string{
		`DELETE FROM test_attempts WHERE user_id = $1`,
		`DELETE FROM active_days WHERE user_id = $1`,
		`DELETE FROM workbench_snapshots WHERE user_id = $1`,
		`DELETE FROM learning_progress WHERE user_id = $1`,
	} {
		if _, err := tx.Exec(ctx, q, userID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *PGStore) HasAnyData(ctx context.Context, userID uuid.UUID) (bool, error) {
	var n int
	err := s.pool.QueryRow(ctx, `
		SELECT (SELECT count(*) FROM learning_progress WHERE user_id = $1)
		     + (SELECT count(*) FROM test_attempts WHERE user_id = $1)
		     + (SELECT count(*) FROM active_days WHERE user_id = $1)
		     + (SELECT count(*) FROM workbench_snapshots WHERE user_id = $1)`,
		userID).Scan(&n)
	return n > 0, err
}
