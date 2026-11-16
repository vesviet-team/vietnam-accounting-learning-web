package auth

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

// memStore is an in-memory Store implementing the same semantics as the
// pgx implementation (single-use codes, rotation rows, family revocation),
// used by unit tests.
type memStore struct {
	mu       sync.Mutex
	codes    map[string]*AuthCode
	sessions map[uuid.UUID]*Session
	// revokedFamilies records RevokeFamily calls (start session id).
	revokedFamilies []uuid.UUID
}

func newMemStore() *memStore {
	return &memStore{
		codes:    make(map[string]*AuthCode),
		sessions: make(map[uuid.UUID]*Session),
	}
}

func (m *memStore) CreateAuthCode(_ context.Context, code AuthCode) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.codes[code.CodeHash] = &code
	return nil
}

func (m *memStore) ConsumeAuthCode(_ context.Context, codeHash string) (AuthCode, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.codes[codeHash]
	if !ok {
		return AuthCode{}, ErrNotFound
	}
	if c.UsedAt != nil {
		return AuthCode{}, ErrCodeUsed
	}
	if time.Now().After(c.ExpiresAt) {
		return AuthCode{}, ErrCodeExpired
	}
	now := time.Now()
	c.UsedAt = &now
	return *c, nil
}

func (m *memStore) CreateSession(_ context.Context, s Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := s
	m.sessions[s.ID] = &cp
	return nil
}

func (m *memStore) RotateSession(_ context.Context, oldSessionID uuid.UUID, newSession Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	old, ok := m.sessions[oldSessionID]
	if !ok || old.RevokedAt != nil {
		return ErrSessionRevoked
	}
	now := time.Now()
	old.RevokedAt = &now
	old.LastUsedAt = &now
	cp := newSession
	m.sessions[newSession.ID] = &cp
	return nil
}

func (m *memStore) GetSessionByRefreshHash(_ context.Context, refreshHash string) (Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.sessions {
		if s.RefreshHash == refreshHash {
			return *s, nil
		}
	}
	return Session{}, ErrNotFound
}

func (m *memStore) RevokeSession(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.sessions[id]; ok && s.RevokedAt == nil {
		now := time.Now()
		s.RevokedAt = &now
	}
	return nil
}

// RevokeFamily walks ancestors + descendants like the recursive SQL CTE.
func (m *memStore) RevokeFamily(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.revokedFamilies = append(m.revokedFamilies, id)

	// Collect ancestors (including start).
	family := map[uuid.UUID]bool{}
	for cur, ok := m.sessions[id]; ok && cur != nil; {
		family[cur.ID] = true
		if cur.RotatedFrom == nil {
			break
		}
		cur = m.sessions[*cur.RotatedFrom]
	}
	// Collect descendants starting from any root found.
	for rootID := range family {
		if s := m.sessions[rootID]; s != nil && s.RotatedFrom == nil {
			m.collectDescendants(rootID, family)
		}
	}
	now := time.Now()
	for fid := range family {
		if s := m.sessions[fid]; s != nil && s.RevokedAt == nil {
			s.RevokedAt = &now
		}
	}
	return nil
}

func (m *memStore) collectDescendants(id uuid.UUID, family map[uuid.UUID]bool) {
	for _, s := range m.sessions {
		if s.RotatedFrom != nil && *s.RotatedFrom == id && !family[s.ID] {
			family[s.ID] = true
			m.collectDescendants(s.ID, family)
		}
	}
}

func (m *memStore) RevokeAllForUser(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	for _, s := range m.sessions {
		if s.UserID == userID && s.RevokedAt == nil {
			s.RevokedAt = &now
		}
	}
	return nil
}

func (m *memStore) ListSessionsForUser(_ context.Context, userID uuid.UUID) ([]Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := []Session{}
	for _, s := range m.sessions {
		if s.UserID == userID && s.RevokedAt == nil && time.Now().Before(s.ExpiresAt) {
			out = append(out, *s)
		}
	}
	// Newest first.
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].CreatedAt.After(out[i].CreatedAt) {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out, nil
}

func (m *memStore) GetSessionByID(_ context.Context, id uuid.UUID) (Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[id]
	if !ok {
		return Session{}, ErrNotFound
	}
	return *s, nil
}

func (m *memStore) TouchSession(_ context.Context, id uuid.UUID) error { return nil }

func (m *memStore) isRevoked(id uuid.UUID) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[id]
	return !ok || s.RevokedAt != nil
}

func (m *memStore) session(id uuid.UUID) (Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[id]
	if !ok {
		return Session{}, errors.New("no session")
	}
	return *s, nil
}
