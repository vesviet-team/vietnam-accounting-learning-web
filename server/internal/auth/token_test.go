package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func newTokenHandler(t *testing.T, store Store) *TokenHandler {
	t.Helper()
	return &TokenHandler{
		ClientID:   "test-client",
		Store:      store,
		Keys:       newTestKeys(t),
		UserActive: func(_ context.Context, _ uuid.UUID) (bool, error) { return true, nil },
	}
}

func postToken(t *testing.T, h *TokenHandler, form url.Values) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/oauth2/token", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("decode response %q: %v", rec.Body.String(), err)
	}
	return m
}

// seedCode inserts an unused authorization code into the store and returns
// the raw code (the store only ever sees its hash).
func seedCode(t *testing.T, store *memStore, opts ...func(*AuthCode)) (string, AuthCode) {
	t.Helper()
	raw, err := randomToken(32)
	if err != nil {
		t.Fatalf("random: %v", err)
	}
	ac := AuthCode{
		CodeHash:            hashToken(raw),
		ClientID:            "test-client",
		UserID:              uuid.Must(uuid.NewV7()),
		RedirectURI:         "https://hoa.tanhdev.com/oauth/callback",
		Scope:               "read write",
		CodeChallenge:       s256Challenge(t, validVerifier),
		CodeChallengeMethod: "S256",
		ExpiresAt:           time.Now().Add(AuthCodeTTL),
	}
	for _, f := range opts {
		f(&ac)
	}
	if err := store.CreateAuthCode(context.Background(), ac); err != nil {
		t.Fatalf("seed code: %v", err)
	}
	return raw, ac
}

const validVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" // RFC 7636 Appendix B

func tokenFormForCode(raw string) url.Values {
	return url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {"test-client"},
		"code":          {raw},
		"redirect_uri":  {"https://hoa.tanhdev.com/oauth/callback"},
		"code_verifier": {validVerifier},
	}
}

func TestToken_AuthorizationCode_Success(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	raw, ac := seedCode(t, store)

	rec := postToken(t, h, tokenFormForCode(raw))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := decodeBody(t, rec)
	if body["token_type"] != "Bearer" {
		t.Fatalf("token_type = %v", body["token_type"])
	}
	if body["expires_in"].(float64) != 900 {
		t.Fatalf("expires_in = %v, want 900", body["expires_in"])
	}
	access, _ := body["access_token"].(string)
	refresh, _ := body["refresh_token"].(string)
	if access == "" || refresh == "" {
		t.Fatal("missing access_token or refresh_token")
	}
	// Access token must carry the right claims.
	claims, err := h.Keys.VerifyAccessToken(access)
	if err != nil {
		t.Fatalf("verify access: %v", err)
	}
	if claims.Subject != ac.UserID.String() {
		t.Fatalf("sub mismatch")
	}
	if claims.Scope != "read write" {
		t.Fatalf("scope = %q", claims.Scope)
	}
	if claims.Sid == "" {
		t.Fatal("sid claim missing")
	}
	// Session persisted with the refresh hash, 30-day expiry.
	sess, err := store.session(uuid.MustParse(claims.Sid))
	if err != nil {
		t.Fatalf("session not persisted: %v", err)
	}
	if sess.RefreshHash != hashToken(refresh) {
		t.Fatal("session refresh hash mismatch (refresh must be stored hashed)")
	}
	if time.Until(sess.ExpiresAt) < 29*24*time.Hour {
		t.Fatalf("session expiry too short: %v", sess.ExpiresAt)
	}
}

func TestToken_AuthorizationCode_SingleUse(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	raw, _ := seedCode(t, store)

	rec := postToken(t, h, tokenFormForCode(raw))
	if rec.Code != http.StatusOK {
		t.Fatalf("first exchange failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = postToken(t, h, tokenFormForCode(raw))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("second exchange status = %d, want 400", rec.Code)
	}
	body := decodeBody(t, rec)
	if body["error"] != "invalid_grant" {
		t.Fatalf("error = %v, want invalid_grant", body["error"])
	}
}

func TestToken_AuthorizationCode_Expired(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	raw, _ := seedCode(t, store, func(ac *AuthCode) { ac.ExpiresAt = time.Now().Add(-time.Minute) })

	rec := postToken(t, h, tokenFormForCode(raw))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if decodeBody(t, rec)["error"] != "invalid_grant" {
		t.Fatal("want invalid_grant")
	}
}

func TestToken_AuthorizationCode_PKCEWrongVerifier(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	raw, _ := seedCode(t, store)

	form := tokenFormForCode(raw)
	form.Set("code_verifier", strings.Repeat("x", 43))
	rec := postToken(t, h, form)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestToken_AuthorizationCode_PKCEPlainRejected(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	// Seed a code with method "plain" — impossible per schema CHECK, but the
	// handler must still reject non-S256 methods defensively.
	raw, _ := randomToken(32)
	ac := AuthCode{
		CodeHash:            hashToken(raw),
		ClientID:            "test-client",
		UserID:              uuid.Must(uuid.NewV7()),
		RedirectURI:         "https://hoa.tanhdev.com/oauth/callback",
		Scope:               "read",
		CodeChallenge:       validVerifier,
		CodeChallengeMethod: "plain",
		ExpiresAt:           time.Now().Add(AuthCodeTTL),
	}
	_ = store.CreateAuthCode(context.Background(), ac)

	form := tokenFormForCode(raw)
	rec := postToken(t, h, form)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 (plain must be rejected)", rec.Code)
	}
}

func TestToken_AuthorizationCode_UnknownClient(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	form := tokenFormForCode("whatever")
	form.Set("client_id", "evil-client")
	rec := postToken(t, h, form)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
	if decodeBody(t, rec)["error"] != "invalid_client" {
		t.Fatal("want invalid_client")
	}
}

func TestToken_AuthorizationCode_RedirectMismatch(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	raw, _ := seedCode(t, store)
	form := tokenFormForCode(raw)
	form.Set("redirect_uri", "https://evil.example/callback")
	rec := postToken(t, h, form)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestToken_RefreshRotation(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)

	// Seed an initial session (as issued after an authorization code exchange).
	s1 := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      uuid.Must(uuid.NewV7()),
		DeviceID:    "device-1",
		RefreshHash: hashToken("refresh-1"),
		Scope:       "read write",
		ExpiresAt:   time.Now().Add(RefreshTokenTTL),
	}
	_ = store.CreateSession(context.Background(), s1)

	// 1) First refresh succeeds and rotates.
	rec := postToken(t, h, url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"test-client"},
		"refresh_token": {"refresh-1"},
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("first refresh status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := decodeBody(t, rec)
	newRefresh, _ := body["refresh_token"].(string)
	if newRefresh == "" || newRefresh == "refresh-1" {
		t.Fatalf("refresh not rotated: %v", newRefresh)
	}

	// Old session revoked; new session links back via rotated_from.
	if !store.isRevoked(s1.ID) {
		t.Fatal("old session must be revoked after rotation")
	}
	var s2 *Session
	store.mu.Lock()
	for _, s := range store.sessions {
		if s.RotatedFrom != nil && *s.RotatedFrom == s1.ID {
			s2 = s
		}
	}
	store.mu.Unlock()
	if s2 == nil {
		t.Fatal("rotated session missing rotated_from link")
	}
	if s2.RefreshHash != hashToken(newRefresh) {
		t.Fatal("new session does not hold the new refresh hash")
	}

	// 2) Reuse of the OLD refresh token -> family revocation.
	rec = postToken(t, h, url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"test-client"},
		"refresh_token": {"refresh-1"},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("reuse status = %d, want 400", rec.Code)
	}
	if decodeBody(t, rec)["error"] != "invalid_grant" {
		t.Fatal("want invalid_grant on reuse")
	}
	if !store.isRevoked(s2.ID) {
		t.Fatal("family revocation must revoke the rotated (current) session too")
	}

	// 3) Even the NEW refresh token is now unusable.
	rec = postToken(t, h, url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"test-client"},
		"refresh_token": {newRefresh},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("post-reuse refresh status = %d, want 400", rec.Code)
	}
}

func TestToken_RefreshExpired(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	s := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      uuid.Must(uuid.NewV7()),
		RefreshHash: hashToken("expired-refresh"),
		Scope:       "read",
		ExpiresAt:   time.Now().Add(-time.Hour),
	}
	_ = store.CreateSession(context.Background(), s)

	rec := postToken(t, h, url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"test-client"},
		"refresh_token": {"expired-refresh"},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", rec.Code)
	}
	if !store.isRevoked(s.ID) {
		t.Fatal("expired session must be revoked")
	}
}

func TestToken_RefreshUnknown(t *testing.T) {
	h := newTokenHandler(t, newMemStore())
	rec := postToken(t, h, url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"test-client"},
		"refresh_token": {"totally-unknown"},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestToken_UnsupportedGrant(t *testing.T) {
	h := newTokenHandler(t, newMemStore())
	rec := postToken(t, h, url.Values{
		"grant_type": {"password"},
		"client_id":  {"test-client"},
		"username":   {"a@b.c"},
		"password":   {"secret"},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", rec.Code)
	}
	if decodeBody(t, rec)["error"] != "unsupported_grant_type" {
		t.Fatal("want unsupported_grant_type (password grant must not exist)")
	}
}

func TestToken_NoStoreCacheHeader(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	raw, _ := seedCode(t, store)
	rec := postToken(t, h, tokenFormForCode(raw))
	if cc := rec.Header().Get("Cache-Control"); cc != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", cc)
	}
}

func TestRevoke_RFC7009(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	s := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      uuid.Must(uuid.NewV7()),
		RefreshHash: hashToken("revoke-me"),
		Scope:       "read",
		ExpiresAt:   time.Now().Add(RefreshTokenTTL),
	}
	_ = store.CreateSession(context.Background(), s)

	postRevoke := func(form url.Values) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/oauth2/revoke", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		rec := httptest.NewRecorder()
		h.Revoke(rec, req)
		return rec
	}

	// Revoking a refresh token revokes its session.
	rec := postRevoke(url.Values{
		"client_id":       {"test-client"},
		"token":           {"revoke-me"},
		"token_type_hint": {"refresh_token"},
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if !store.isRevoked(s.ID) {
		t.Fatal("session must be revoked")
	}

	// Unknown token still returns 200 per RFC 7009 (no token guessing).
	rec = postRevoke(url.Values{"client_id": {"test-client"}, "token": {"unknown"}})
	if rec.Code != http.StatusOK {
		t.Fatalf("unknown token status = %d, want 200", rec.Code)
	}

	// Missing client fails.
	rec = postRevoke(url.Values{"token": {"x"}})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad client status = %d, want 401", rec.Code)
	}
}

func TestLogout_RevokeCurrentSession(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	userID := uuid.Must(uuid.NewV7())
	s1 := Session{ID: uuid.Must(uuid.NewV7()), UserID: userID, RefreshHash: hashToken("r1"), Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	s2 := Session{ID: uuid.Must(uuid.NewV7()), UserID: userID, RefreshHash: hashToken("r2"), Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	_ = store.CreateSession(context.Background(), s1)
	_ = store.CreateSession(context.Background(), s2)

	access, err := h.Keys.SignAccessToken(userID, s1.ID, "read", time.Now())
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/oauth2/logout", nil)
	req.Header.Set("Authorization", "Bearer "+access)
	rec := httptest.NewRecorder()
	h.Logout(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if !store.isRevoked(s1.ID) {
		t.Fatal("current session must be revoked")
	}
	if store.isRevoked(s2.ID) {
		t.Fatal("other sessions must survive /logout")
	}
}

func TestLogoutAll_RevokeEverySession(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	userID := uuid.Must(uuid.NewV7())
	s1 := Session{ID: uuid.Must(uuid.NewV7()), UserID: userID, RefreshHash: hashToken("r1"), Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	s2 := Session{ID: uuid.Must(uuid.NewV7()), UserID: userID, RefreshHash: hashToken("r2"), Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	other := Session{ID: uuid.Must(uuid.NewV7()), UserID: uuid.Must(uuid.NewV7()), RefreshHash: hashToken("r3"), Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	_ = store.CreateSession(context.Background(), s1)
	_ = store.CreateSession(context.Background(), s2)
	_ = store.CreateSession(context.Background(), other)

	access, _ := h.Keys.SignAccessToken(userID, s1.ID, "read", time.Now())
	req := httptest.NewRequest(http.MethodPost, "/oauth2/logout-all", nil)
	req.Header.Set("Authorization", "Bearer "+access)
	rec := httptest.NewRecorder()
	h.LogoutAll(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if !store.isRevoked(s1.ID) || !store.isRevoked(s2.ID) {
		t.Fatal("all user sessions must be revoked")
	}
	if store.isRevoked(other.ID) {
		t.Fatal("other users' sessions must survive")
	}
}

func TestLogout_NoCredentials(t *testing.T) {
	h := newTokenHandler(t, newMemStore())
	req := httptest.NewRequest(http.MethodPost, "/oauth2/logout", nil)
	rec := httptest.NewRecorder()
	h.Logout(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestRefresh_DisabledUserRejectedAndRevoked(t *testing.T) {
	store := newMemStore()
	h := newTokenHandler(t, store)
	userID := uuid.Must(uuid.NewV7())
	s := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      userID,
		RefreshHash: hashToken("rt-disabled"),
		Scope:       "read write",
		ExpiresAt:   time.Now().Add(RefreshTokenTTL),
	}
	_ = store.CreateSession(context.Background(), s)
	h.UserActive = func(_ context.Context, _ uuid.UUID) (bool, error) { return false, nil }

	rec := postToken(t, h, url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"test-client"},
		"refresh_token": {"rt-disabled"},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if !store.isRevoked(s.ID) {
		t.Fatal("disabled user's session must be revoked on refresh attempt")
	}
}

func TestRotateSession_AtomicRejectsSecondRotation(t *testing.T) {
	store := newMemStore()
	userID := uuid.Must(uuid.NewV7())
	s1 := Session{
		ID:          uuid.Must(uuid.NewV7()),
		UserID:      userID,
		RefreshHash: hashToken("r1"),
		Scope:       "read",
		ExpiresAt:   time.Now().Add(RefreshTokenTTL),
	}
	_ = store.CreateSession(context.Background(), s1)

	s2 := Session{ID: uuid.Must(uuid.NewV7()), UserID: userID, RefreshHash: hashToken("r2"), RotatedFrom: &s1.ID, Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	if err := store.RotateSession(context.Background(), s1.ID, s2); err != nil {
		t.Fatalf("first RotateSession failed: %v", err)
	}
	s3 := Session{ID: uuid.Must(uuid.NewV7()), UserID: userID, RefreshHash: hashToken("r3"), RotatedFrom: &s1.ID, Scope: "read", ExpiresAt: time.Now().Add(RefreshTokenTTL)}
	if err := store.RotateSession(context.Background(), s1.ID, s3); err != ErrSessionRevoked {
		t.Fatalf("second RotateSession err = %v, want ErrSessionRevoked", err)
	}
}
