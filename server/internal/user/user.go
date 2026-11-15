// Package user implements email/password registration and authentication
// (argon2id, constant-time verification) and the /me profile endpoint.
package user

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors safe to surface to clients.
var (
	ErrEmailTaken     = errors.New("email already registered")
	ErrBadCredentials = errors.New("invalid email or password")
	ErrDisabled       = errors.New("account is disabled")
	ErrNotFound       = errors.New("user not found")
	ErrInvalidEmail   = errors.New("invalid email")
	ErrWeakPassword   = errors.New("password must be at least 8 characters")
)

// User is the persisted account record.
type User struct {
	ID           uuid.UUID
	Email        string
	DisplayName  string
	PasswordHash string
	CreatedAt    time.Time
	DisabledAt   *time.Time
}

// Store is the persistence contract for users (user + identity rows).
type Store interface {
	// CreateUser inserts the user and its 'email_password' identity atomically.
	CreateUser(ctx context.Context, u *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)

	// Disable soft-deletes the user (disabled_at = now). Idempotent.
	Disable(ctx context.Context, id uuid.UUID) error
}
