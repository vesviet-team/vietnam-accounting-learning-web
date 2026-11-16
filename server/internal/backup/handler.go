package backup

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// Handler serves PUT/GET /sync/backup.
type Handler struct {
	Store        Store
	Keys         httpx.BearerVerifier
	SessionValid func(ctx context.Context, userID, sessionID uuid.UUID) (bool, error)
}

type putRequest struct {
	Payload  json.RawMessage `json:"payload"`
	Revision int64           `json:"revision"`
	DeviceID string          `json:"device_id"`
}

// Put PUT /sync/backup
// Body: {"payload": <any JSON, opaque>, "revision": <monotonic bigint>,
// "device_id": "..."}. A revision <= the stored revision returns 409 with
// the current revision; a greater revision is stored as-is.
func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.claims(w, r, "write")
	if !ok {
		return
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return
	}

	var in putRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, MaxPayloadBytes)).Decode(&in); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed or oversized JSON body")
		return
	}
	if len(in.Payload) == 0 {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "payload is required")
		return
	}
	if in.Revision < 1 {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "revision must be a positive integer")
		return
	}
	deviceID := in.DeviceID
	if len(deviceID) > 128 {
		deviceID = deviceID[:128]
	}

	blob, err := h.Store.SaveBlobIfNewer(r.Context(), userID, in.Payload, in.Revision, deviceID)
	if errors.Is(err, ErrConflict) {
		httpx.JSON(w, http.StatusConflict, map[string]any{
			"error":    "revision_conflict",
			"revision": blob.Revision,
		})
		return
	}
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"revision":   blob.Revision,
		"updated_at": blob.UpdatedAt.UTC().Format(time.RFC3339Nano),
	})
}

// Get GET /sync/backup — returns the latest blob and its revision.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.claims(w, r, "read")
	if !ok {
		return
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return
	}

	blob, err := h.Store.GetBlob(r.Context(), userID)
	if errors.Is(err, ErrNotFound) {
		httpx.OAuthError(w, http.StatusNotFound, "not_found", "no backup stored yet")
		return
	}
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"payload":    json.RawMessage(blob.Payload),
		"revision":   blob.Revision,
		"device_id":  blob.DeviceID,
		"updated_at": blob.UpdatedAt.UTC().Format(time.RFC3339Nano),
	})
}

func (h *Handler) claims(w http.ResponseWriter, r *http.Request, requiredScope string) (httpx.AccessClaims, bool) {
	claims, err := h.Keys.ParseBearerClaims(r)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return httpx.AccessClaims{}, false
	}
	if requiredScope != "" && !httpx.HasScope(claims.Scope, requiredScope) {
		httpx.OAuthError(w, http.StatusForbidden, "insufficient_scope", "missing required scope: "+requiredScope)
		return httpx.AccessClaims{}, false
	}
	if h.SessionValid != nil {
		uid, uerr := uuid.Parse(claims.Subject)
		sid, serr := uuid.Parse(claims.SessionID)
		if uerr != nil || serr != nil {
			httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid session required")
			return httpx.AccessClaims{}, false
		}
		ok, verr := h.SessionValid(r.Context(), uid, sid)
		if verr != nil {
			httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
			return httpx.AccessClaims{}, false
		}
		if !ok {
			httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "session is no longer active")
			return httpx.AccessClaims{}, false
		}
	}
	return claims, true
}
