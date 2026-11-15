// Package sync implements P1 per-entity learning-data sync:
// GET /sync/pull, POST /sync/push and POST /sync/merge-anonymous.
//
// Conflict policy is local-authoritative with per-entity merge semantics:
//   - test_attempts: union by client-generated uuid (append-only, no loss)
//   - active_days: union by (user, day)
//   - learning_progress: field-wise max/union (completed_days union,
//     milestone_scores max-per-day, current_day max, revision = max)
//   - workbench_snapshots: last-write-wins on the client revision
//
// No learning payload is ever logged.
package sync

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
)

// Entity kinds accepted by the pull "kinds" filter.
const (
	KindProgress   = "progress"
	KindAttempts   = "attempts"
	KindActiveDays = "active_days"
	KindWorkbench  = "workbench"
)

// ProgressInput is the client's local learning-progress state for one push.
type ProgressInput struct {
	CompletedDays   []int          `json:"completed_days"`
	MilestoneScores map[string]int `json:"milestone_scores"` // milestone day -> highest score
	CurrentDay      int            `json:"current_day"`
	Regime          string         `json:"regime"`
	Revision        int64          `json:"revision"`
	DeviceID        string         `json:"device_id"`
}

// AttemptInput is one milestone attempt. ID is a client-generated uuid so
// re-pushes from any device are idempotent.
type AttemptInput struct {
	ID           string          `json:"id"`
	MilestoneDay int             `json:"milestone_day"`
	Answers      json.RawMessage `json:"answers"`
	Score        int             `json:"score"`
	Passed       bool            `json:"passed"`
	DokBreakdown json.RawMessage `json:"dok_breakdown"`
	ItemResults  json.RawMessage `json:"item_results"`
	AttemptTS    string          `json:"attempt_ts"`
	DeviceID     string          `json:"device_id"`
}

// ActiveDayInput is one calendar day of learning activity (VN date).
type ActiveDayInput struct {
	Day    string `json:"day"` // YYYY-MM-DD
	Source string `json:"source"`
}

// WorkbenchInput is one workbench snapshot (journalizer or cogs).
type WorkbenchInput struct {
	ID       string          `json:"id"`
	Kind     string          `json:"kind"` // 'journalizer' | 'cogs'
	Payload  json.RawMessage `json:"payload"`
	Revision int64           `json:"revision"`
	DeviceID string          `json:"device_id"`
}

// PushInput is the batch body of /sync/push and /sync/merge-anonymous.
type PushInput struct {
	DeviceID   string           `json:"device_id"`
	Progress   *ProgressInput   `json:"progress"`
	Attempts   []AttemptInput   `json:"attempts"`
	ActiveDays []ActiveDayInput `json:"active_days"`
	Workbench  []WorkbenchInput `json:"workbench"`
}

// ProgressEntity is the canonical server-side progress state.
type ProgressEntity struct {
	CompletedDays   []int          `json:"completed_days"`
	MilestoneScores map[string]int `json:"milestone_scores"`
	CurrentDay      int            `json:"current_day"`
	Regime          string         `json:"regime"`
	Revision        int64          `json:"revision"`
	DeviceID        string         `json:"device_id"`
	UpdatedAt       string         `json:"updated_at,omitempty"`
}

// AttemptEntity is the canonical server-side attempt row.
type AttemptEntity struct {
	ID           string          `json:"id"`
	MilestoneDay int             `json:"milestone_day"`
	Answers      json.RawMessage `json:"answers"`
	Score        int             `json:"score"`
	Passed       bool            `json:"passed"`
	DokBreakdown json.RawMessage `json:"dok_breakdown,omitempty"`
	ItemResults  json.RawMessage `json:"item_results,omitempty"`
	AttemptTS    string          `json:"attempt_ts"`
	DeviceID     string          `json:"device_id,omitempty"`
}

// ActiveDayEntity is the canonical server-side active day.
type ActiveDayEntity struct {
	Day    string `json:"day"`
	Source string `json:"source"`
}

// WorkbenchEntity is the canonical server-side workbench snapshot.
type WorkbenchEntity struct {
	ID        string          `json:"id"`
	Kind      string          `json:"kind"`
	Payload   json.RawMessage `json:"payload"`
	Revision  int64           `json:"revision"`
	DeviceID  string          `json:"device_id,omitempty"`
	UpdatedAt string          `json:"updated_at,omitempty"`
}

// State is the canonical full state of all synced entities plus the pull
// cursor (max seq observed).
type State struct {
	Cursor     int64             `json:"cursor"`
	Progress   *ProgressEntity   `json:"progress"`
	Attempts   []AttemptEntity   `json:"attempts"`
	ActiveDays []ActiveDayEntity `json:"active_days"`
	Workbench  []WorkbenchEntity `json:"workbench"`
}

// PullResult is a subset state (only kinds requested, only rows changed
// after the cursor).
type PullResult struct {
	Cursor     int64             `json:"cursor"`
	Progress   *ProgressEntity   `json:"progress"`
	Attempts   []AttemptEntity   `json:"attempts"`
	ActiveDays []ActiveDayEntity `json:"active_days"`
	Workbench  []WorkbenchEntity `json:"workbench"`
}

// Store is the persistence contract for the sync engine.
type Store interface {
	// Merge applies the batch with the per-entity policy above and returns
	// the canonical full state afterwards. Used by both push and
	// merge-anonymous (merging into an empty account is the same operation).
	Merge(ctx context.Context, userID uuid.UUID, in PushInput) (State, error)

	// Pull returns entities with seq > cursor (filtered by kinds, empty =
	// all kinds) plus the new cursor.
	Pull(ctx context.Context, userID uuid.UUID, cursor int64, kinds []string) (PullResult, error)

	// ExportAll returns every stored entity of the user for /me/export.
	ExportAll(ctx context.Context, userID uuid.UUID) (State, error)

	// DeleteAll removes all learning-data rows of the user.
	DeleteAll(ctx context.Context, userID uuid.UUID) error

	// HasAnyData reports whether the user has any synced learning data.
	HasAnyData(ctx context.Context, userID uuid.UUID) (bool, error)
}
