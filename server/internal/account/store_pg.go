package account

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vesviet-team/vietnam-accounting-api/internal/auth"
	"github.com/vesviet-team/vietnam-accounting-api/internal/sync"
)

const timeRFC3339 = time.RFC3339Nano

func nowRFC3339() string { return time.Now().UTC().Format(time.RFC3339Nano) }

// PGStore implements Store by composing the auth session store and a pool.
// The sync tables (learning_progress, test_attempts, active_days,
// workbench_snapshots) are deleted inside the same transaction as the rest
// of the child data so account removal is atomic.
type PGStore struct {
	pool *pgxpool.Pool
	auth auth.Store
	sync sync.Store
}

func NewPGStore(pool *pgxpool.Pool, authStore auth.Store, syncStore sync.Store) *PGStore {
	return &PGStore{pool: pool, auth: authStore, sync: syncStore}
}

func (s *PGStore) ListSessions(ctx context.Context, userID uuid.UUID) ([]SessionInfo, error) {
	sessions, err := s.auth.ListSessionsForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]SessionInfo, 0, len(sessions))
	for _, sess := range sessions {
		info := SessionInfo{
			ID:        sess.ID.String(),
			DeviceID:  sess.DeviceID,
			CreatedAt: sess.CreatedAt.UTC().Format(timeRFC3339),
			ExpiresAt: sess.ExpiresAt.UTC().Format(timeRFC3339),
		}
		if sess.LastUsedAt != nil {
			v := sess.LastUsedAt.UTC().Format(timeRFC3339)
			info.LastUsedAt = &v
		}
		out = append(out, info)
	}
	return out, nil
}

// RevokeSessionForUser revokes the session only when it belongs to the
// user; otherwise ErrNotFound (no cross-user existence oracle).
func (s *PGStore) RevokeSessionForUser(ctx context.Context, userID, sessionID uuid.UUID) error {
	sess, err := s.auth.GetSessionByID(ctx, sessionID)
	if errors.Is(err, auth.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if sess.UserID != userID {
		return ErrNotFound
	}
	return s.auth.RevokeSession(ctx, sessionID)
}

// Export returns the full account data: profile metadata + every synced
// learning entity (progress, attempts, active days, workbench snapshots).
func (s *PGStore) Export(ctx context.Context, userID uuid.UUID) (map[string]any, error) {
	learning, err := s.sync.ExportAll(ctx, userID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"exported_at": nowRFC3339(),
		"user_id":     userID.String(),
		"learning":    learning,
	}, nil
}

// DeleteAll soft-deletes the user and removes every child-data row in one
// transaction: learning data, backup blobs, identities, authorization
// codes, sessions (revoked). The users row itself stays with disabled_at
// set so the email cannot be re-registered by someone else.
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
		`DELETE FROM backup_blobs WHERE user_id = $1`,
		`DELETE FROM identities WHERE user_id = $1`,
		`DELETE FROM authorization_codes WHERE user_id = $1`,
		`UPDATE oauth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
		`UPDATE users SET disabled_at = now() WHERE id = $1`,
	} {
		if _, err := tx.Exec(ctx, q, userID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
