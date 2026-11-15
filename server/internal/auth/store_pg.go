package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore implements Store on top of pgx.
type PGStore struct {
	pool *pgxpool.Pool
}

func NewPGStore(pool *pgxpool.Pool) *PGStore { return &PGStore{pool: pool} }

func (s *PGStore) CreateAuthCode(ctx context.Context, code AuthCode) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO authorization_codes
			(code_hash, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		code.CodeHash, code.ClientID, code.UserID, code.RedirectURI,
		code.Scope, code.CodeChallenge, code.CodeChallengeMethod, code.ExpiresAt,
	)
	return err
}

// ConsumeAuthCode is atomic single-use: the UPDATE only matches unused,
// unexpired codes. Cause (used vs expired vs unknown) is diagnosed with a
// follow-up read for precise error mapping.
func (s *PGStore) ConsumeAuthCode(ctx context.Context, codeHash string) (AuthCode, error) {
	var ac AuthCode
	err := s.pool.QueryRow(ctx, `
		UPDATE authorization_codes SET used_at = now()
		WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()
		RETURNING code_hash, client_id, user_id, redirect_uri, scope,
		          code_challenge, code_challenge_method, expires_at, used_at`,
		codeHash,
	).Scan(&ac.CodeHash, &ac.ClientID, &ac.UserID, &ac.RedirectURI, &ac.Scope,
		&ac.CodeChallenge, &ac.CodeChallengeMethod, &ac.ExpiresAt, &ac.UsedAt)
	if err == nil {
		return ac, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return AuthCode{}, err
	}

	// Diagnose why the conditional update did not match.
	var usedAt *time.Time
	var expiresAt time.Time
	diag := s.pool.QueryRow(ctx,
		"SELECT used_at, expires_at FROM authorization_codes WHERE code_hash = $1", codeHash,
	)
	if err2 := diag.Scan(&usedAt, &expiresAt); err2 != nil {
		return AuthCode{}, ErrNotFound
	}
	if usedAt != nil {
		return AuthCode{}, ErrCodeUsed
	}
	if time.Now().After(expiresAt) {
		return AuthCode{}, ErrCodeExpired
	}
	return AuthCode{}, ErrNotFound
}

func (s *PGStore) CreateSession(ctx context.Context, sess Session) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO oauth_sessions
			(id, user_id, device_id, refresh_hash, rotated_from, scope, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		sess.ID, sess.UserID, sess.DeviceID, sess.RefreshHash,
		sess.RotatedFrom, sess.Scope, sess.ExpiresAt,
	)
	return err
}

const sessionCols = `id, user_id, device_id, refresh_hash, rotated_from, scope, revoked_at, created_at, last_used_at, expires_at`

func scanSession(row pgx.Row) (Session, error) {
	var sess Session
	err := row.Scan(&sess.ID, &sess.UserID, &sess.DeviceID, &sess.RefreshHash,
		&sess.RotatedFrom, &sess.Scope, &sess.RevokedAt, &sess.CreatedAt,
		&sess.LastUsedAt, &sess.ExpiresAt)
	return sess, err
}

func (s *PGStore) GetSessionByRefreshHash(ctx context.Context, refreshHash string) (Session, error) {
	sess, err := scanSession(s.pool.QueryRow(ctx,
		"SELECT "+sessionCols+" FROM oauth_sessions WHERE refresh_hash = $1", refreshHash))
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	return sess, err
}

func (s *PGStore) RevokeSession(ctx context.Context, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		"UPDATE oauth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", id)
	return err
}

// RevokeFamily revokes the whole rotation chain of the given session:
// walk up the rotated_from ancestors to the root, then revoke the root and
// every descendant (which includes the starting session itself).
func (s *PGStore) RevokeFamily(ctx context.Context, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		WITH RECURSIVE up AS (
			SELECT s.* FROM oauth_sessions s WHERE s.id = $1
			UNION
			SELECT p.* FROM oauth_sessions p JOIN up u ON p.id = u.rotated_from
		),
		roots AS (SELECT id FROM up WHERE rotated_from IS NULL),
		down AS (
			SELECT id FROM roots
			UNION
			SELECT c.id FROM oauth_sessions c JOIN down d ON c.rotated_from = d.id
		)
		UPDATE oauth_sessions SET revoked_at = now()
		WHERE id IN (SELECT id FROM down) AND revoked_at IS NULL`,
		id,
	)
	return err
}

func (s *PGStore) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		"UPDATE oauth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", userID)
	return err
}

func (s *PGStore) TouchSession(ctx context.Context, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		"UPDATE oauth_sessions SET last_used_at = now() WHERE id = $1", id)
	return err
}
