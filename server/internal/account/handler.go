package account

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
	"github.com/vesviet-team/vietnam-accounting-api/internal/user"
)

// Handler serves the /me/sessions, /me/export and /me/delete endpoints.
type Handler struct {
	Store      Store
	Keys       httpx.BearerVerifier
	Users      *user.Service
	SyncDelete func(ctx context.Context, userID uuid.UUID) error
}

func (h *Handler) claims(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	c, err := h.Keys.ParseBearerClaims(r)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return uuid.Nil, false
	}
	id, err := uuid.Parse(c.Subject)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return uuid.Nil, false
	}
	// The user must still be active (soft-delete cuts off all access).
	if _, err := h.Users.GetActiveByID(r.Context(), id); err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "user is not active")
		return uuid.Nil, false
	}
	return id, true
}

// Sessions GET /me/sessions — active device grants of the user.
func (h *Handler) Sessions(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.claims(w, r)
	if !ok {
		return
	}
	sessions, err := h.Store.ListSessions(r.Context(), userID)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	// Mark the session the caller is presenting as current.
	claims, _ := h.Keys.ParseBearerClaims(r)
	current := uuid.Nil
	if claims.SessionID != "" {
		current, _ = uuid.Parse(claims.SessionID)
	}
	for i := range sessions {
		sid, _ := uuid.Parse(sessions[i].ID)
		sessions[i].Current = sid == current
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"sessions": sessions})
}

// RevokeSession POST /me/sessions/revoke — body {"session_id": "..."}.
// Revoking a foreign session id returns 404 (no existence leak across users).
func (h *Handler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.claims(w, r)
	if !ok {
		return
	}
	var in struct {
		SessionID string `json:"session_id"`
	}
	if err := decodeStrict(w, r, &in, 4<<10); err != nil {
		return
	}
	sid, err := uuid.Parse(in.SessionID)
	if err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "session_id must be a uuid")
		return
	}
	if err := h.Store.RevokeSessionForUser(r.Context(), userID, sid); err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.OAuthError(w, http.StatusNotFound, "not_found", "no such active session for this user")
			return
		}
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"revoked": true})
}

// Export GET /me/export — full account data as a JSON download.
func (h *Handler) Export(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.claims(w, r)
	if !ok {
		return
	}
	data, err := h.Store.Export(r.Context(), userID)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition",
		`attachment; filename="vnacc-export-`+time.Now().UTC().Format("2006-01-02")+`.json"`)
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(data)
}

// Delete POST /me/delete — soft-delete the user (disabled_at) and remove
// every child-data row (GDPR / NĐ 13/2023 right to erasure). The response
// is 200 even when the store already considered the user gone.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.claims(w, r)
	if !ok {
		return
	}
	if err := h.Store.DeleteAll(r.Context(), userID); err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	// Belt-and-braces soft-delete through the user service too (idempotent).
	_ = h.Users.Disable(r.Context(), userID)
	httpx.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}
