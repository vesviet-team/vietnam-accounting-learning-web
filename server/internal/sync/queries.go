package sync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// execer is the minimal SQL surface used inside a transaction.
type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func truncateDeviceID(raw string) string {
	if len(raw) > 128 {
		return raw[:128]
	}
	return raw
}

// marshalScores encodes the milestone-scores map as compact JSON. Nil maps
// yield '{}' so the SQL jsonb merge never sees NULL.
func marshalScores(scores map[string]int) []byte {
	if len(scores) == 0 {
		return []byte("{}")
	}
	b, err := json.Marshal(scores)
	if err != nil {
		return []byte("{}")
	}
	return b
}

func nullableJSON(raw json.RawMessage) any {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	return []byte(raw)
}

func parseDay(day string) (time.Time, error) {
	if day == "" {
		return time.Time{}, errors.New("sync: active day must be YYYY-MM-DD")
	}
	d, err := time.Parse("2006-01-02", day)
	if err != nil {
		return time.Time{}, errors.New("sync: active day must be YYYY-MM-DD")
	}
	return d, nil
}

func parseTimestamp(raw string) *time.Time {
	if raw == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05"} {
		if t, err := time.Parse(layout, raw); err == nil {
			return &t
		}
	}
	return nil
}

func rfc3339(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }

// loadProgress returns the progress row only when its seq is greater than
// minSeq (nil when absent or unchanged since the cursor).
func (s *PGStore) loadProgress(ctx context.Context, userID uuid.UUID, minSeq int64) (*ProgressEntity, error) {
	var (
		p         ProgressEntity
		scores    []byte
		updatedAt time.Time
		seq       int64
	)
	err := s.pool.QueryRow(ctx, `
		SELECT completed_days, milestone_scores, current_day, regime, revision, device_id, seq, updated_at
		FROM learning_progress WHERE user_id = $1`, userID,
	).Scan(&p.CompletedDays, &scores, &p.CurrentDay, &p.Regime, &p.Revision, &p.DeviceID, &seq, &updatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if seq <= minSeq {
		return nil, nil
	}
	if err := json.Unmarshal(scores, &p.MilestoneScores); err != nil {
		p.MilestoneScores = map[string]int{}
	}
	if p.MilestoneScores == nil {
		p.MilestoneScores = map[string]int{}
	}
	if p.CompletedDays == nil {
		p.CompletedDays = []int{}
	}
	p.UpdatedAt = rfc3339(updatedAt)
	return &p, nil
}

func (s *PGStore) loadAttempts(ctx context.Context, userID uuid.UUID, minSeq int64) ([]AttemptEntity, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, milestone_day, answers, score, passed, dok_breakdown, item_results, attempt_ts, device_id, seq
		FROM test_attempts WHERE user_id = $1 AND seq > $2 ORDER BY seq`, userID, minSeq)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AttemptEntity{}
	for rows.Next() {
		var (
			e            AttemptEntity
			id           uuid.UUID
			answers      []byte
			dok, results []byte
			ts           time.Time
			seq          int64
		)
		if err := rows.Scan(&id, &e.MilestoneDay, &answers, &e.Score, &e.Passed,
			&dok, &results, &ts, &e.DeviceID, &seq); err != nil {
			return nil, err
		}
		e.ID = id.String()
		e.Answers = json.RawMessage(answers)
		if len(dok) > 0 {
			e.DokBreakdown = json.RawMessage(dok)
		}
		if len(results) > 0 {
			e.ItemResults = json.RawMessage(results)
		}
		e.AttemptTS = rfc3339(ts)
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *PGStore) loadActiveDays(ctx context.Context, userID uuid.UUID, minSeq int64) ([]ActiveDayEntity, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT day, source, seq FROM active_days WHERE user_id = $1 AND seq > $2 ORDER BY seq`, userID, minSeq)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ActiveDayEntity{}
	for rows.Next() {
		var (
			day time.Time
			e   ActiveDayEntity
			seq int64
		)
		if err := rows.Scan(&day, &e.Source, &seq); err != nil {
			return nil, err
		}
		e.Day = day.Format("2006-01-02")
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *PGStore) loadWorkbench(ctx context.Context, userID uuid.UUID, minSeq int64) ([]WorkbenchEntity, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, kind, payload, revision, device_id, seq, updated_at
		FROM workbench_snapshots WHERE user_id = $1 AND seq > $2 ORDER BY seq`, userID, minSeq)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WorkbenchEntity{}
	for rows.Next() {
		var (
			e         WorkbenchEntity
			id        uuid.UUID
			payload   []byte
			updatedAt time.Time
			seq       int64
		)
		if err := rows.Scan(&id, &e.Kind, &payload, &e.Revision, &e.DeviceID, &seq, &updatedAt); err != nil {
			return nil, err
		}
		e.ID = id.String()
		e.Payload = json.RawMessage(payload)
		e.UpdatedAt = rfc3339(updatedAt)
		out = append(out, e)
	}
	return out, rows.Err()
}

// seqOf looks up the current seq of a row (used to advance the pull cursor).
// column is one of the fixed, caller-defined literals below — never user input.
func (s *PGStore) seqOf(ctx context.Context, userID uuid.UUID, table, column, value string) (int64, bool, error) {
	if table != "test_attempts" && table != "active_days" && table != "workbench_snapshots" {
		return 0, false, errors.New("sync: unknown table")
	}
	if column != "id" && column != "day" && column != "kind" {
		return 0, false, errors.New("sync: unknown column")
	}
	var cast string
	switch column {
	case "day":
		cast = "$3::date"
	default:
		cast = "$3"
	}
	q := fmt.Sprintf("SELECT seq FROM %s WHERE user_id = $1 AND %s = %s", table, column, cast)
	var seq int64
	err := s.pool.QueryRow(ctx, q, userID, value).Scan(&seq)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return seq, true, nil
}

func (s *PGStore) progressSeq(ctx context.Context, userID uuid.UUID) (int64, bool, error) {
	var seq int64
	err := s.pool.QueryRow(ctx,
		"SELECT seq FROM learning_progress WHERE user_id = $1", userID).Scan(&seq)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return seq, true, nil
}
