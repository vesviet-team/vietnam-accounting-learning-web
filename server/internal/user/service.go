package user

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Service implements registration and authentication on top of Store.
type Service struct {
	store Store
}

func NewService(store Store) *Service { return &Service{store: store} }

// dummyHash is used to equalize timing when the user does not exist:
// verification still runs one argon2id pass.
var dummyHash = "$argon2id$v=19$m=65536,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// Register validates input, hashes the password (argon2id) and stores the
// user + identity row.
func (s *Service) Register(ctx context.Context, email, password, displayName string) (*User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if !emailRe.MatchString(email) || len(email) > 254 {
		return nil, ErrInvalidEmail
	}
	if len(password) < 8 || len(password) > 1024 {
		return nil, ErrWeakPassword
	}
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		displayName = email
	}
	if len(displayName) > 200 {
		displayName = displayName[:200]
	}
	hash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	u := &User{
		ID:           uuid.Must(uuid.NewV7()),
		Email:        email,
		DisplayName:  displayName,
		PasswordHash: hash,
		CreatedAt:    time.Now(),
	}
	if err := s.store.CreateUser(ctx, u); err != nil {
		if errors.Is(err, ErrEmailTaken) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}
	return u, nil
}

// Authenticate verifies email/password with constant-time comparison.
// A dummy argon2id pass runs when the account is unknown so response
// timing does not reveal account existence.
func (s *Service) Authenticate(ctx context.Context, email, password string) (*User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	u, err := s.store.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			_, _ = VerifyPassword(dummyHash, password)
			return nil, ErrBadCredentials
		}
		return nil, err
	}
	ok, err := VerifyPassword(u.PasswordHash, password)
	if err != nil || !ok {
		return nil, ErrBadCredentials
	}
	if u.DisabledAt != nil {
		return nil, ErrDisabled
	}
	return u, nil
}

// GetActiveByID returns the user when it exists and is not disabled.
func (s *Service) GetActiveByID(ctx context.Context, id uuid.UUID) (*User, error) {
	u, err := s.store.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u.DisabledAt != nil {
		return nil, ErrDisabled
	}
	return u, nil
}

// Disable soft-deletes the user (right to erasure / account closure).
// Idempotent: disabling an already-disabled user succeeds.
func (s *Service) Disable(ctx context.Context, id uuid.UUID) error {
	return s.store.Disable(ctx, id)
}
