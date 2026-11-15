package user

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
)

type memUserStore struct {
	mu     sync.Mutex
	byMail map[string]*User
	byID   map[string]*User
}

func newMemUserStore() *memUserStore {
	return &memUserStore{byMail: map[string]*User{}, byID: map[string]*User{}}
}

func (m *memUserStore) CreateUser(_ context.Context, u *User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.byMail[strings.ToLower(u.Email)]; exists {
		return ErrEmailTaken
	}
	cp := *u
	m.byMail[strings.ToLower(cp.Email)] = &cp
	m.byID[cp.ID.String()] = &cp
	return nil
}

func (m *memUserStore) GetByEmail(_ context.Context, email string) (*User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.byMail[strings.ToLower(email)]
	if !ok {
		return nil, ErrNotFound
	}
	cp := *u
	return &cp, nil
}

func (m *memUserStore) GetByID(_ context.Context, id uuid.UUID) (*User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.byID[id.String()]
	if !ok {
		return nil, ErrNotFound
	}
	cp := *u
	return &cp, nil
}

func (m *memUserStore) Disable(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.byID[id.String()]
	if !ok {
		return ErrNotFound
	}
	now := time.Now()
	u.DisabledAt = &now
	return nil
}

func TestRegisterAndAuthenticate(t *testing.T) {
	ctx := context.Background()
	s := NewService(newMemUserStore())

	u, err := s.Register(ctx, "Hoa@TanhDev.com ", "correct-password", "Hoa")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if u.Email != "hoa@tanhdev.com" {
		t.Fatalf("email not normalized: %q", u.Email)
	}

	// Correct credentials.
	got, err := s.Authenticate(ctx, "hoa@tanhdev.com", "correct-password")
	if err != nil {
		t.Fatalf("authenticate: %v", err)
	}
	if got.ID != u.ID {
		t.Fatal("user id mismatch")
	}

	// Wrong password (constant-time path must still reject).
	if _, err := s.Authenticate(ctx, "hoa@tanhdev.com", "wrong-password"); !errors.Is(err, ErrBadCredentials) {
		t.Fatalf("err = %v, want ErrBadCredentials", err)
	}

	// Unknown email must also yield ErrBadCredentials (not ErrNotFound) so
	// callers cannot distinguish account existence.
	if _, err := s.Authenticate(ctx, "ghost@tanhdev.com", "correct-password"); !errors.Is(err, ErrBadCredentials) {
		t.Fatalf("err = %v, want ErrBadCredentials", err)
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	ctx := context.Background()
	s := NewService(newMemUserStore())
	if _, err := s.Register(ctx, "dup@tanhdev.com", "password-1", ""); err != nil {
		t.Fatalf("first register: %v", err)
	}
	if _, err := s.Register(ctx, "dup@tanhdev.com", "password-2", ""); !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("err = %v, want ErrEmailTaken", err)
	}
}

func TestRegister_Validation(t *testing.T) {
	ctx := context.Background()
	s := NewService(newMemUserStore())
	cases := []struct {
		email, pw string
		want      error
	}{
		{"not-an-email", "password-1", ErrInvalidEmail},
		{"ok@tanhdev.com", "short", ErrWeakPassword},
	}
	for _, c := range cases {
		if _, err := s.Register(ctx, c.email, c.pw, ""); !errors.Is(err, c.want) {
			t.Fatalf("Register(%q,%q) err = %v, want %v", c.email, c.pw, err, c.want)
		}
	}
}

func TestAuthenticate_DisabledUser(t *testing.T) {
	ctx := context.Background()
	store := newMemUserStore()
	s := NewService(store)
	u, err := s.Register(ctx, "off@tanhdev.com", "password-1", "")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	store.mu.Lock()
	now := time.Now()
	store.byMail["off@tanhdev.com"].DisabledAt = &now
	store.mu.Unlock()

	if _, err := s.Authenticate(ctx, "off@tanhdev.com", "password-1"); !errors.Is(err, ErrDisabled) {
		t.Fatalf("err = %v, want ErrDisabled", err)
	}
	if _, err := s.GetActiveByID(ctx, u.ID); !errors.Is(err, ErrDisabled) {
		t.Fatalf("GetActiveByID err = %v, want ErrDisabled", err)
	}
}
