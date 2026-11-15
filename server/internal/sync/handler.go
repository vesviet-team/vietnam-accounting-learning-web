package sync

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// MaxPayloadBytes limits push/merge bodies (matches the P0 backup limit).
const MaxPayloadBytes = 8 << 20

// Handler serves GET /sync/pull, POST /sync/push and
// POST /sync/merge-anonymous. All require a Bearer access token. Learning
// payload contents are never logged.
type Handler struct {
	Store Store
	Keys  httpx.BearerVerifier
}

func (h *Handler) claims(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	c, err := h.Keys.ParseBearerClaims(r)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return uuid.Nil, false
	}
	userID, err := uuid.Parse(c.Subject)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return uuid.Nil, false
	}
	return userID, true
}

// Pull GET /sync/pull?cursor=<seq>&kinds=progress,attempts,active_days,workbench
// Returns entities changed after the cursor plus the new cursor.
func (h *Handler) Pull(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.claims(w, r)
	if !ok {
		return
	}
	var cursor int64
	if raw := r.URL.Query().Get("cursor"); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || v < 0 {
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "cursor must be a non-negative integer")
			return
		}
		cursor = v
	}
	kinds := strings.Split(r.URL.Query().Get("kinds"), ",")
	res, err := h.Store.Pull(r.Context(), userID, cursor, kinds)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// Push POST /sync/push — batch merge from one device; responds with the
// canonical state and cursor.
func (h *Handler) Push(w http.ResponseWriter, r *http.Request) {
	in, ok := h.decode(w, r)
	if !ok {
		return
	}
	userID, ok := h.claims(w, r)
	if !ok {
		return
	}
	state, err := h.Store.Merge(r.Context(), userID, *in)
	if err != nil {
		if isBadRequest(err) {
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	httpx.JSON(w, http.StatusOK, state)
}

// MergeAnonymous POST /sync/merge-anonymous — same merge policy applied to
// the anonymous snapshot captured by the client right after login.
func (h *Handler) MergeAnonymous(w http.ResponseWriter, r *http.Request) {
	h.Push(w, r)
}

func (h *Handler) decode(w http.ResponseWriter, r *http.Request) (*PushInput, bool) {
	var in PushInput
	err := json.NewDecoder(http.MaxBytesReader(w, r.Body, MaxPayloadBytes)).Decode(&in)
	if err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed or oversized JSON body")
		return nil, false
	}
	if in.Progress == nil && len(in.Attempts) == 0 && len(in.ActiveDays) == 0 && len(in.Workbench) == 0 {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "at least one entity is required")
		return nil, false
	}
	if len(in.DeviceID) > 128 {
		in.DeviceID = in.DeviceID[:128]
	}
	return &in, true
}

// isBadRequest reports whether the error is a validation message safe to
// echo back to the client.
func isBadRequest(err error) bool {
	msg := err.Error()
	return strings.HasPrefix(msg, "sync:")
}
