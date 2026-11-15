package db

import (
	"context"
	"fmt"
	"io/fs"
	"regexp"
	"sort"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Execer is the minimal SQL surface the migrator needs.
// *pgxpool.Pool and *pgx.Tx satisfy it.
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Migrate applies all pending *.sql migrations from fsys, in filename order,
// tracking applied versions in schema_migrations.
func Migrate(ctx context.Context, ex Execer, fsys fs.FS) error {
	if _, err := ex.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    bigint PRIMARY KEY,
			name       text        NOT NULL,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("db: create schema_migrations: %w", err)
	}

	entries, err := fs.Glob(fsys, "*.sql")
	if err != nil {
		return fmt.Errorf("db: list migrations: %w", err)
	}
	sort.Strings(entries)

	for _, name := range entries {
		version, err := parseVersion(name)
		if err != nil {
			return fmt.Errorf("db: migration %s: %w", name, err)
		}

		var already int64
		if err := ex.QueryRow(ctx,
			"SELECT count(*) FROM schema_migrations WHERE version = $1", version,
		).Scan(&already); err != nil {
			return fmt.Errorf("db: check migration %s: %w", name, err)
		}
		if already > 0 {
			continue
		}

		body, err := fs.ReadFile(fsys, name)
		if err != nil {
			return fmt.Errorf("db: read migration %s: %w", name, err)
		}

		if _, err := ex.Exec(ctx, string(body)); err != nil {
			return fmt.Errorf("db: apply migration %s: %w", name, err)
		}
		if _, err := ex.Exec(ctx,
			"INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", version, name,
		); err != nil {
			return fmt.Errorf("db: record migration %s: %w", name, err)
		}
	}
	return nil
}

var versionRe = regexp.MustCompile(`^(\d+)_.*\.sql$`)

func parseVersion(name string) (int64, error) {
	m := versionRe.FindStringSubmatch(name)
	if m == nil {
		return 0, fmt.Errorf("invalid migration filename (want NNNN_name.sql)")
	}
	v, err := strconv.ParseInt(m[1], 10, 64)
	if err != nil {
		return 0, err
	}
	return v, nil
}
