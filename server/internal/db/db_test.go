package db

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestConnect_InvalidURL(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	if _, err := Connect(ctx, "://not-a-valid-url"); err == nil || !strings.Contains(err.Error(), "invalid DATABASE_URL") {
		t.Fatalf("expected invalid DATABASE_URL error, got %v", err)
	}
}

func TestConnect_RespectsContextDeadline(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	start := time.Now()
	_, err := Connect(ctx, "postgres://user:pass@127.0.0.1:1/db?sslmode=disable")
	if err == nil || !strings.Contains(err.Error(), "cannot reach database") {
		t.Fatalf("expected cannot reach database error, got %v", err)
	}
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Fatalf("Connect exceeded deadline handling window: %v", elapsed)
	}
}
