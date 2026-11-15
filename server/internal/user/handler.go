package user

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// Handler serves /auth/register and /me.
type Handler struct {
	Service *Service
	Keys    httpx.BearerVerifier
}

// Register POST /auth/register
// Body: {"email": "...", "password": "...", "display_name": "..."}
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&in); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed JSON body")
		return
	}
	u, err := h.Service.Register(r.Context(), in.Email, in.Password, in.DisplayName)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmailTaken):
			httpx.OAuthError(w, http.StatusConflict, "email_taken", "email already registered")
		case errors.Is(err, ErrInvalidEmail):
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "invalid email")
		case errors.Is(err, ErrWeakPassword):
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "password must be at least 8 characters")
		default:
			httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		}
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]string{
		"id":           u.ID.String(),
		"email":        u.Email,
		"display_name": u.DisplayName,
	})
}

// Me GET /me — profile resolved from the Bearer access token.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims, err := h.Keys.ParseBearerClaims(r)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "valid bearer token required")
		return
	}
	u, err := h.Service.GetActiveByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, ErrDisabled) {
			httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "user is not active")
			return
		}
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{
		"id":           u.ID.String(),
		"email":        u.Email,
		"display_name": u.DisplayName,
		"scope":        claims.Scope,
	})
}
