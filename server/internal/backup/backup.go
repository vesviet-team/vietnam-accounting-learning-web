// Package backup implements backup-to-cloud (P0): opaque JSON blobs stored
// per user with last-write-wins conflict resolution on a monotonic
// client-supplied revision. The server never inspects payload contents
// (the client may encrypt them); only metadata is validated.
package backup

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ErrConflict is returned by SaveBlobIfNewer when the stored revision is
// already >= the attempted revision. The caller reads the current revision
// from the returned Blob.
var (
	ErrConflict = errors.New("backup: revision conflict")
	ErrNotFound = errors.New("backup: blob not found")
)

// MaxPayloadBytes limits blob size (P0: 8 MiB).
const MaxPayloadBytes = 8 << 20

// Blob is one stored backup snapshot.
type Blob struct {
	Payload   []byte
	Revision  int64
	DeviceID  string
	UpdatedAt time.Time
}

// Store is the persistence contract for backup blobs.
type Store interface {
	// SaveBlobIfNewer stores the payload atomically only when revision is
	// strictly greater than the stored revision. On success it returns the
	// stored blob metadata; on stale revision it returns ErrConflict and
	// the current blob (revision only, payload may be nil).
	SaveBlobIfNewer(ctx context.Context, userID uuid.UUID, payload []byte, revision int64, deviceID string) (Blob, error)

	GetBlob(ctx context.Context, userID uuid.UUID) (Blob, error)
}
