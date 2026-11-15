package backup

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore implements Store on pgx with an atomic conditional upsert.
type PGStore struct {
	pool *pgxpool.Pool
}

func NewPGStore(pool *pgxpool.Pool) *PGStore { return &PGStore{pool: pool} }

// SaveBlobIfNewer: INSERT ... ON CONFLICT DO UPDATE ... WHERE stored.revision < new.
// The RETURNING row is produced only when the write happened; otherwise a
// follow-up read returns the current revision for the 409 response.
func (s *PGStore) SaveBlobIfNewer(ctx context.Context, userID uuid.UUID, payload []byte, revision int64, deviceID string) (Blob, error) {
	var stored Blob
	err := s.pool.QueryRow(ctx, `
		INSERT INTO backup_blobs (user_id, payload, revision, device_id, updated_at)
		VALUES ($1, $2::jsonb, $3, $4, now())
		ON CONFLICT (user_id) DO UPDATE
		SET payload = $2::jsonb, revision = $3, device_id = $4, updated_at = now()
		WHERE backup_blobs.revision < $3
		RETURNING payload, revision, device_id, updated_at`,
		userID, string(payload), revision, deviceID,
	).Scan(&stored.Payload, &stored.Revision, &stored.DeviceID, &stored.UpdatedAt)
	if err == nil {
		return stored, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Blob{}, err
	}

	// No row returned: the stored revision is >= attempted (or a concurrent
	// writer raced ahead). Read the current revision for the conflict reply.
	var current int64
	qerr := s.pool.QueryRow(ctx,
		"SELECT revision FROM backup_blobs WHERE user_id = $1", userID,
	).Scan(&current)
	if errors.Is(qerr, pgx.ErrNoRows) {
		return Blob{Revision: revision}, ErrConflict
	}
	if qerr != nil {
		return Blob{}, qerr
	}
	return Blob{Revision: current}, ErrConflict
}

func (s *PGStore) GetBlob(ctx context.Context, userID uuid.UUID) (Blob, error) {
	var b Blob
	err := s.pool.QueryRow(ctx,
		"SELECT payload, revision, device_id, updated_at FROM backup_blobs WHERE user_id = $1", userID,
	).Scan(&b.Payload, &b.Revision, &b.DeviceID, &b.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Blob{}, ErrNotFound
	}
	if err != nil {
		return Blob{}, err
	}
	return b, nil
}
