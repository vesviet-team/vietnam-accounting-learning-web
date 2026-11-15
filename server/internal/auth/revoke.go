package auth

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// RevokeHandler serves POST /oauth2/revoke (RFC 7009). Token hints:
// refresh_token (form field) or an access token (Bearer / form field).
// Per RFC 7009 the endpoint always responds 200, even for unknown tokens.
func (h *TokenHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed form")
		return
	}
	if r.PostForm.Get("client_id") != h.ClientID {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_client", "unknown client")
		return
	}

	token := r.PostForm.Get("token")
	if token == "" {
		// RFC 7009: invalid request only if token is missing entirely.
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "token is required")
		return
	}

	// Try as refresh token first (most common hint).
	if session, err := h.Store.GetSessionByRefreshHash(r.Context(), hashToken(token)); err == nil {
		_ = h.Store.RevokeSession(r.Context(), session.ID)
		writeJSON(w, http.StatusOK, map[string]bool{"revoked": true})
		return
	}

	// Try as access token: revoke the session it belongs to.
	if claims, err := h.Keys.VerifyAccessToken(token); err == nil {
		if sid, perr := uuid.Parse(claims.Sid); perr == nil {
			_ = h.Store.RevokeSession(r.Context(), sid)
		}
	}

	// Unknown/invalid token: still 200 per RFC 7009 (no token guessing).
	writeJSON(w, http.StatusOK, map[string]bool{"revoked": true})
}

// LogoutHandler serves POST /oauth2/logout: revokes the current session
// (identified by Bearer access token sid, or by refresh_token form field).
func (h *TokenHandler) Logout(w http.ResponseWriter, r *http.Request) {
	h.logout(w, r, false)
}

// LogoutAllHandler serves POST /oauth2/logout-all: revokes every active
// session of the user (full family revocation).
func (h *TokenHandler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	h.logout(w, r, true)
}

func (h *TokenHandler) logout(w http.ResponseWriter, r *http.Request, all bool) {
	if err := r.ParseForm(); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed form")
		return
	}

	// Identify caller: Bearer access token first, else refresh_token form field.
	var (
		userID    uuid.UUID
		sessionID uuid.UUID
		known     bool
	)
	if claims, err := h.Keys.ParseBearer(r); err == nil {
		if sid, perr := uuid.Parse(claims.Sid); perr == nil {
			userID, _ = uuid.Parse(claims.Subject)
			sessionID = sid
			known = true
		}
	} else if raw := r.PostForm.Get("refresh_token"); raw != "" {
		if session, serr := h.Store.GetSessionByRefreshHash(r.Context(), hashToken(raw)); serr == nil {
			userID = session.UserID
			sessionID = session.ID
			known = true
		}
	}

	if !known {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_token", "no valid session presented")
		return
	}

	var err error
	if all {
		err = h.Store.RevokeAllForUser(r.Context(), userID)
	} else {
		err = h.Store.RevokeSession(r.Context(), sessionID)
	}
	if err != nil && !errors.Is(err, ErrNotFound) {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	clearRefreshCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"revoked": true})
}
