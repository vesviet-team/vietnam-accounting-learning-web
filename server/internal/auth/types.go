// Package auth implements the OAuth 2.1 authorization server core:
// authorization endpoint (login + consent form), PKCE (S256 only),
// token endpoint with authorization_code and refresh_token grants,
// refresh rotation with reuse detection (family revocation), RFC 7009
// revocation and logout endpoints.
package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors returned by Store implementations and mapped to
// OAuth error responses by handlers. Messages are safe to log.
var (
	ErrNotFound       = errors.New("auth: not found")
	ErrCodeUsed       = errors.New("auth: authorization code already used")
	ErrCodeExpired    = errors.New("auth: authorization code expired")
	ErrSessionRevoked = errors.New("auth: session already revoked")
	ErrPKCE           = errors.New("auth: PKCE verification failed")
	ErrPKCEMethod     = errors.New("auth: PKCE method not allowed")
)

// Session is one device's grant: holds the current (rotated) refresh token
// hash and links to the previous session in the rotation chain via RotatedFrom.
type Session struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	DeviceID    string
	RefreshHash string
	RotatedFrom *uuid.UUID
	Scope       string
	RevokedAt   *time.Time
	CreatedAt   time.Time
	LastUsedAt  *time.Time
	ExpiresAt   time.Time
}

// AuthCode is a single-use, 10-minute authorization code record.
// Only the SHA-256 hash of the code is persisted.
type AuthCode struct {
	CodeHash            string
	ClientID            string
	UserID              uuid.UUID
	RedirectURI         string
	Scope               string
	CodeChallenge       string
	CodeChallengeMethod string
	ExpiresAt           time.Time
	UsedAt              *time.Time
}

// Store is the persistence contract of the authorization server.
// Implementations must make ConsumeAuthCode and session rotation atomic.
type Store interface {
	CreateAuthCode(ctx context.Context, code AuthCode) error

	// ConsumeAuthCode atomically marks the code as used (single-use) and
	// returns it. It returns ErrNotFound, ErrCodeUsed or ErrCodeExpired and
	// must not modify the row in those cases.
	ConsumeAuthCode(ctx context.Context, codeHash string) (AuthCode, error)

	CreateSession(ctx context.Context, s Session) error

	// GetSessionByRefreshHash looks up a session by the SHA-256 hash of the
	// presented refresh token. Old hashes stay in the DB (each rotation
	// step is its own row), which is what makes reuse detection possible.
	GetSessionByRefreshHash(ctx context.Context, refreshHash string) (Session, error)

	RevokeSession(ctx context.Context, id uuid.UUID) error

	// RevokeFamily revokes the entire rotation chain containing id:
	// all its ancestors (via rotated_from) and all descendants.
	RevokeFamily(ctx context.Context, id uuid.UUID) error

	// RevokeAllForUser revokes every active session of the user.
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error

	// ListSessionsForUser returns the active (non-revoked, unexpired)
	// sessions of the user — one per device — newest first.
	ListSessionsForUser(ctx context.Context, userID uuid.UUID) ([]Session, error)

	// GetSessionByID returns one session row (any state).
	GetSessionByID(ctx context.Context, id uuid.UUID) (Session, error)

	TouchSession(ctx context.Context, id uuid.UUID) error
}
