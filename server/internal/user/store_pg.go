package user

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore implements Store on pgx.
type PGStore struct {
	pool *pgxpool.Pool
}

func NewPGStore(pool *pgxpool.Pool) *PGStore { return &PGStore{pool: pool} }

const userCols = `id, coalesce(email::text, ''), display_name, password_hash, created_at, disabled_at`

func scanUser(row pgx.Row) (*User, error) {
	var u User
	if err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash, &u.CreatedAt, &u.DisabledAt); err != nil {
		return nil, err
	}
	return &u, nil
}

// CreateUser inserts the user and the 'email_password' identity in one
// transaction; unique-violation on email maps to ErrEmailTaken.
func (s *PGStore) CreateUser(ctx context.Context, u *User) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, email, display_name, password_hash, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		u.ID, u.Email, u.DisplayName, u.PasswordHash, u.CreatedAt,
	)
	if isUniqueViolation(err) {
		return ErrEmailTaken
	}
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO identities (id, user_id, type) VALUES ($1, $2, 'email_password')`,
		uuid.Must(uuid.NewV7()), u.ID,
	)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PGStore) GetByEmail(ctx context.Context, email string) (*User, error) {
	u, err := scanUser(s.pool.QueryRow(ctx,
		"SELECT "+userCols+" FROM users WHERE email = $1", email))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (s *PGStore) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	u, err := scanUser(s.pool.QueryRow(ctx,
		"SELECT "+userCols+" FROM users WHERE id = $1", id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

// Disable soft-deletes the user (idempotent).
func (s *PGStore) Disable(ctx context.Context, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		"UPDATE users SET disabled_at = now() WHERE id = $1 AND disabled_at IS NULL", id)
	return err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
