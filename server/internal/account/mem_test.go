package account

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
)

// memStore implements Store for unit tests: sessions + learning data in
// memory, mirroring the PG composition.
type memStore struct {
	mu       sync.Mutex
	sessions map[uuid.UUID]*sessionRow
	progress map[uuid.UUID]map[string]any
	attempts map[uuid.UUID][]map[string]any
	days     map[uuid.UUID][]string
	deleted  map[uuid.UUID]bool
}

type sessionRow struct {
	id      uuid.UUID
	userID  uuid.UUID
	device  string
	revoked bool
}

func newMemStore() *memStore {
	return &memStore{
		sessions: map[uuid.UUID]*sessionRow{},
		progress: map[uuid.UUID]map[string]any{},
		attempts: map[uuid.UUID][]map[string]any{},
		days:     map[uuid.UUID][]string{},
		deleted:  map[uuid.UUID]bool{},
	}
}

func (m *memStore) addSession(id, userID uuid.UUID, device string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[id] = &sessionRow{id: id, userID: userID, device: device}
}

func (m *memStore) ListSessions(_ context.Context, userID uuid.UUID) ([]SessionInfo, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := []SessionInfo{}
	for _, s := range m.sessions {
		if s.userID == userID && !s.revoked {
			out = append(out, SessionInfo{
				ID:        s.id.String(),
				DeviceID:  s.device,
				CreatedAt: time.Now().UTC().Format(timeRFC3339),
				ExpiresAt: time.Now().Add(24 * time.Hour).UTC().Format(timeRFC3339),
			})
		}
	}
	return out, nil
}

func (m *memStore) RevokeSessionForUser(_ context.Context, userID, sessionID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[sessionID]
	if !ok || s.userID != userID || s.revoked {
		return ErrNotFound
	}
	s.revoked = true
	return nil
}

func (m *memStore) Export(_ context.Context, userID uuid.UUID) (map[string]any, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.deleted[userID] {
		return map[string]any{
			"exported_at": time.Now().UTC().Format(time.RFC3339Nano),
			"user_id":     userID.String(),
			"learning": map[string]any{
				"progress": nil, "attempts": []any{}, "active_days": []any{}, "workbench": []any{},
			},
		}, nil
	}
	return map[string]any{
		"exported_at": time.Now().UTC().Format(time.RFC3339Nano),
		"user_id":     userID.String(),
		"learning": map[string]any{
			"progress":    m.progress[userID],
			"attempts":    m.attempts[userID],
			"active_days": m.days[userID],
		},
	}, nil
}

func (m *memStore) DeleteAll(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.progress, userID)
	delete(m.attempts, userID)
	delete(m.days, userID)
	for _, s := range m.sessions {
		if s.userID == userID {
			s.revoked = true
		}
	}
	m.deleted[userID] = true
	return nil
}

func (m *memStore) seedData(userID uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.progress[userID] = map[string]any{"current_day": 7, "revision": 3}
	m.attempts[userID] = []map[string]any{{"id": uuid.Must(uuid.NewV7()).String(), "score": 88}}
	m.days[userID] = []string{"2026-11-14", "2026-11-15"}
}
