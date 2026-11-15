// Package account implements the P1 account-management endpoints:
// GET /me/sessions, POST /me/sessions/revoke, GET /me/export and
// POST /me/delete (soft-delete + full child-data removal, GDPR /
// NĐ 13/2023). All endpoints require a Bearer access token; payloads are
// never logged.
package account

import (
	"context"

	"github.com/google/uuid"
)

// SessionInfo is one device grant shown in the settings UI.
type SessionInfo struct {
	ID         string  `json:"id"`
	DeviceID   string  `json:"device_id"`
	CreatedAt  string  `json:"created_at"`
	LastUsedAt *string `json:"last_used_at"`
	ExpiresAt  string  `json:"expires_at"`
	Current    bool    `json:"current"`
}

// Store aggregates the persistence needed by the account endpoints.
// Session operations delegate to the auth store; data operations to the
// sync store (single-transaction delete).
type Store interface {
	ListSessions(ctx context.Context, userID uuid.UUID) ([]SessionInfo, error)
	RevokeSessionForUser(ctx context.Context, userID, sessionID uuid.UUID) error
	Export(ctx context.Context, userID uuid.UUID) (map[string]any, error)
	DeleteAll(ctx context.Context, userID uuid.UUID) error
}
