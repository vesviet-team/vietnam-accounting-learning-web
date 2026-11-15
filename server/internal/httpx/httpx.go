// Package httpx contains small HTTP helpers shared by all handlers.
package httpx

import (
	"encoding/json"
	"net/http"
)

// AccessClaims is the minimal bearer-token identity handlers need,
// decoupled from the auth package to avoid import cycles.
type AccessClaims struct {
	Subject   string // user id
	SessionID string // oauth session id (sid)
	Scope     string
}

// BearerVerifier verifies an HTTP Bearer access token and returns claims.
type BearerVerifier interface {
	ParseBearerClaims(r *http.Request) (AccessClaims, error)
}

// JSON writes v as an HTTP JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes an OAuth2/RFC 6749-style JSON error. description must never
// contain internal details (stack traces, SQL, secrets).
func OAuthError(w http.ResponseWriter, status int, code, description string) {
	body := map[string]string{"error": code}
	if description != "" {
		body["error_description"] = description
	}
	JSON(w, status, body)
}

// Plain writes a plain-text response.
func Plain(w http.ResponseWriter, status int, text string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(text))
}
