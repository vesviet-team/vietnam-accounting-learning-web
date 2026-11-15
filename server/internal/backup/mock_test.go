package backup

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
)

// memStore implements Store with LWW semantics mirroring the pgx
// conditional upsert.
type memStore struct {
	mu    sync.Mutex
	blobs map[uuid.UUID]Blob
}

func newMemStore() *memStore { return &memStore{blobs: map[uuid.UUID]Blob{}} }

func (m *memStore) SaveBlobIfNewer(_ context.Context, userID uuid.UUID, payload []byte, revision int64, deviceID string) (Blob, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.blobs[userID]; ok && existing.Revision >= revision {
		return Blob{Revision: existing.Revision}, ErrConflict
	}
	b := Blob{
		Payload:   payload,
		Revision:  revision,
		DeviceID:  deviceID,
		UpdatedAt: time.Now(),
	}
	m.blobs[userID] = b
	return b, nil
}

func (m *memStore) GetBlob(_ context.Context, userID uuid.UUID) (Blob, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, ok := m.blobs[userID]
	if !ok {
		return Blob{}, ErrNotFound
	}
	return b, nil
}
