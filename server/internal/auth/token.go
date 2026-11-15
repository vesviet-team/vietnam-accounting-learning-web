package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// RefreshCookieName is the httpOnly refresh-token cookie set by the token
// endpoint so a SPA keeps its session across reloads without ever storing
// the refresh token in web storage. The JSON body also carries the refresh
// token for non-cookie clients (backwards compatible with P0).
const RefreshCookieName = "vnacc_rt"

// setRefreshCookie writes the httpOnly refresh cookie (Secure + SameSite
// Strict; the service is always reached through HTTPS in production).
func setRefreshCookie(w http.ResponseWriter, value string) {
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshCookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(RefreshTokenTTL.Seconds()),
	})
}

func clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}

// TokenHandler serves POST /oauth2/token with grant_type =
// authorization_code (PKCE S256 required) and refresh_token (rotation with
// reuse detection).
type TokenHandler struct {
	ClientID string
	Store    Store
	Keys     *Keys
	// UserActive reports whether the user still exists and is not disabled.
	UserActive func(ctx context.Context, userID uuid.UUID) (bool, error)
}

// Token endpoint (RFC 6749 section 3.2). All responses include
// Cache-Control: no-store.
func (h *TokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed form")
		return
	}
	// First-party public client: client_id must match the static config.
	if r.PostForm.Get("client_id") != h.ClientID {
		httpx.OAuthError(w, http.StatusUnauthorized, "invalid_client", "unknown client")
		return
	}

	switch r.PostForm.Get("grant_type") {
	case "authorization_code":
		h.authorizationCodeGrant(w, r)
	case "refresh_token":
		h.refreshGrant(w, r)
	case "":
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "grant_type is required")
	default:
		httpx.OAuthError(w, http.StatusBadRequest, "unsupported_grant_type", "supported: authorization_code, refresh_token")
	}
}

func (h *TokenHandler) authorizationCodeGrant(w http.ResponseWriter, r *http.Request) {
	code := r.PostForm.Get("code")
	verifier := r.PostForm.Get("code_verifier")
	redirectURI := r.PostForm.Get("redirect_uri")
	if code == "" || verifier == "" {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "code and code_verifier are required")
		return
	}

	ac, err := h.Store.ConsumeAuthCode(r.Context(), hashToken(code))
	if err != nil {
		switch {
		case errors.Is(err, ErrCodeUsed):
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "authorization code already used")
		case errors.Is(err, ErrCodeExpired):
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "authorization code expired")
		default:
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "unknown authorization code")
		}
		return
	}

	if ac.ClientID != h.ClientID || redirectURI != ac.RedirectURI {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "redirect_uri mismatch")
		return
	}

	if err := VerifyPKCE(ac.CodeChallengeMethod, ac.CodeChallenge, verifier); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "PKCE verification failed")
		return
	}

	active, err := h.UserActive(r.Context(), ac.UserID)
	if err != nil || !active {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "user is not active")
		return
	}

	now := time.Now()
	refresh, err := randomToken(32)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	session := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      ac.UserID,
		DeviceID:    sanitizeDeviceID(r.Header.Get("X-Device-ID")),
		RefreshHash: hashToken(refresh),
		Scope:       ac.Scope,
		ExpiresAt:   now.Add(RefreshTokenTTL),
	}
	if err := h.Store.CreateSession(r.Context(), session); err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	h.issue(w, ac.UserID, session.ID, ac.Scope, refresh)
}

// refreshGrant performs rotation: the old session row (holding the old
// refresh hash) is revoked and a new session links back via rotated_from.
// Presenting a refresh token whose session is already revoked means reuse:
// the entire family is revoked. The refresh token may come from the form
// field or the httpOnly cookie.
func (h *TokenHandler) refreshGrant(w http.ResponseWriter, r *http.Request) {
	raw := r.PostForm.Get("refresh_token")
	if raw == "" {
		if c, cerr := r.Cookie(RefreshCookieName); cerr == nil {
			raw = c.Value
		}
	}
	if raw == "" {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "refresh_token is required")
		return
	}

	session, err := h.Store.GetSessionByRefreshHash(r.Context(), hashToken(raw))
	if err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "unknown refresh token")
		return
	}

	if session.RevokedAt != nil {
		// Reuse detected: revoke the whole rotation family.
		_ = h.Store.RevokeFamily(r.Context(), session.ID)
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "refresh token reuse detected; session family revoked")
		return
	}

	now := time.Now()
	if now.After(session.ExpiresAt) {
		_ = h.Store.RevokeSession(r.Context(), session.ID)
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_grant", "refresh token expired")
		return
	}

	refresh, err := randomToken(32)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	newSession := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      session.UserID,
		DeviceID:    session.DeviceID,
		RefreshHash: hashToken(refresh),
		RotatedFrom: &session.ID,
		Scope:       session.Scope,
		ExpiresAt:   now.Add(RefreshTokenTTL),
	}
	if err := h.Store.CreateSession(r.Context(), newSession); err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	if err := h.Store.RevokeSession(r.Context(), session.ID); err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	h.issue(w, session.UserID, newSession.ID, session.Scope, refresh)
}

func (h *TokenHandler) issue(w http.ResponseWriter, userID, sessionID uuid.UUID, scope, refresh string) {
	access, err := h.Keys.SignAccessToken(userID, sessionID, scope, time.Now())
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	setRefreshCookie(w, refresh)
	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":  access,
		"token_type":    "Bearer",
		"expires_in":    int(AccessTokenTTL.Seconds()),
		"refresh_token": refresh,
		"scope":         scope,
	})
}

func sanitizeDeviceID(raw string) string {
	var b strings.Builder
	for _, c := range raw {
		if c >= 0x20 && c <= 0x7e {
			b.WriteRune(c)
		}
	}
	s := b.String()
	if len(s) > 128 {
		s = s[:128]
	}
	return s
}
