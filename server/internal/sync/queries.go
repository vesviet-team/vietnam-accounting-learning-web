package sync

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// normalizeDaySlice returns sorted unique day numbers within [1..30].
func normalizeDaySlice(days []int) []int {
	if len(days) == 0 {
		return []int{}
	}
	seen := make(map[int]bool, len(days))
	out := make([]int, 0, len(days))
	for _, d := range days {
		if d < 1 || d > 30 || seen[d] {
			continue
		}
		seen[d] = true
		out = append(out, d)
	}
	sort.Ints(out)
	return out
}

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
// minSeq (nil when absent or unchanged since the cursor) alongside its seq.
func (s *PGStore) loadProgress(ctx context.Context, userID uuid.UUID, minSeq int64) (*ProgressEntity, int64, error) {
	var (
		p         ProgressEntity
		scores    []byte
		updatedAt time.Time
		seq       int64
	)
	err := s.pool.QueryRow(ctx, `
		SELECT completed_days, saved_days, milestone_scores, current_day, regime, revision, device_id, seq, updated_at
		FROM learning_progress WHERE user_id = $1`, userID,
	).Scan(&p.CompletedDays, &p.SavedDays, &scores, &p.CurrentDay, &p.Regime, &p.Revision, &p.DeviceID, &seq, &updatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, 0, nil
	}
	if err != nil {
		return nil, 0, err
	}
	if seq <= minSeq {
		return nil, 0, nil
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
	if p.SavedDays == nil {
		p.SavedDays = []int{}
	}
	p.UpdatedAt = rfc3339(updatedAt)
	return &p, seq, nil
}

func (s *PGStore) loadAttempts(ctx context.Context, userID uuid.UUID, minSeq int64) ([]AttemptEntity, int64, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, milestone_day, answers, score, passed, dok_breakdown, item_results, attempt_ts, device_id, seq
		FROM test_attempts WHERE user_id = $1 AND seq > $2 ORDER BY seq`, userID, minSeq)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []AttemptEntity{}
	var maxSeq int64
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
			return nil, 0, err
		}
		if seq > maxSeq {
			maxSeq = seq
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
	return out, maxSeq, rows.Err()
}

func (s *PGStore) loadActiveDays(ctx context.Context, userID uuid.UUID, minSeq int64) ([]ActiveDayEntity, int64, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT day, source, seq FROM active_days WHERE user_id = $1 AND seq > $2 ORDER BY seq`, userID, minSeq)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []ActiveDayEntity{}
	var maxSeq int64
	for rows.Next() {
		var (
			day time.Time
			e   ActiveDayEntity
			seq int64
		)
		if err := rows.Scan(&day, &e.Source, &seq); err != nil {
			return nil, 0, err
		}
		if seq > maxSeq {
			maxSeq = seq
		}
		e.Day = day.Format("2006-01-02")
		out = append(out, e)
	}
	return out, maxSeq, rows.Err()
}

func (s *PGStore) loadWorkbench(ctx context.Context, userID uuid.UUID, minSeq int64) ([]WorkbenchEntity, int64, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, kind, payload, revision, device_id, seq, updated_at
		FROM workbench_snapshots WHERE user_id = $1 AND seq > $2 ORDER BY seq`, userID, minSeq)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []WorkbenchEntity{}
	var maxSeq int64
	for rows.Next() {
		var (
			e         WorkbenchEntity
			id        uuid.UUID
			payload   []byte
			updatedAt time.Time
			seq       int64
		)
		if err := rows.Scan(&id, &e.Kind, &payload, &e.Revision, &e.DeviceID, &seq, &updatedAt); err != nil {
			return nil, 0, err
		}
		if seq > maxSeq {
			maxSeq = seq
		}
		e.ID = id.String()
		e.Payload = json.RawMessage(payload)
		e.UpdatedAt = rfc3339(updatedAt)
		out = append(out, e)
	}
	return out, maxSeq, rows.Err()
}
