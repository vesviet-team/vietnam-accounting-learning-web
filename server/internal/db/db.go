// Package db provides the pgx connection pool and the embedded SQL migrator.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a pgx connection pool for the given database URL and retries
// initial Ping with bounded backoff until ctx expires so pod startup tolerates
// transient database/service readiness races.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db: invalid DATABASE_URL: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("db: cannot create pool: %w", err)
	}

	backoff := 500 * time.Millisecond
	const maxBackoff = 2 * time.Second
	var lastErr error

	for {
		if lastErr = pool.Ping(ctx); lastErr == nil {
			return pool, nil
		}
		if ctx.Err() != nil {
			pool.Close()
			return nil, fmt.Errorf("db: cannot reach database: %w", lastErr)
		}
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			pool.Close()
			return nil, fmt.Errorf("db: cannot reach database: %w", lastErr)
		case <-timer.C:
		}
		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}
