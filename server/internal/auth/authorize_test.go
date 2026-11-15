package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/user"
)

type fakeUsers struct {
	validEmail string
}

func (f fakeUsers) Authenticate(_ context.Context, email, password string) (*user.User, error) {
	if email == f.validEmail && password == "correct-password" {
		return &user.User{ID: uuid.Must(uuid.NewV7()), Email: email, DisplayName: "Tester"}, nil
	}
	return nil, user.ErrBadCredentials
}

func TestAuthorize_GetRequiresPKCEAndValidClient(t *testing.T) {
	h := NewAuthorizeHandler("test-client", "https://hoa.tanhdev.com/oauth/callback", "https://hoa.tanhdev.com", fakeUsers{validEmail: "a@b.c"}, newMemStore())

	// Unknown redirect_uri: must NOT redirect (redirect target untrusted).
	q := url.Values{
		"response_type":         {"code"},
		"client_id":             {"test-client"},
		"redirect_uri":          {"https://evil.example"},
		"scope":                 {"read"},
		"code_challenge":        {s256Challenge(t, validVerifier)},
		"code_challenge_method": {"S256"},
	}
	req := httptest.NewRequest(http.MethodGet, "/oauth2/auth?"+q.Encode(), nil)
	rec := httptest.NewRecorder()
	h.Authorize(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown redirect_uri status = %d, want 400", rec.Code)
	}

	// Missing PKCE: redirect with error to the VALID redirect_uri.
	q.Del("code_challenge")
	q.Set("redirect_uri", "https://hoa.tanhdev.com/oauth/callback")
	req = httptest.NewRequest(http.MethodGet, "/oauth2/auth?"+q.Encode(), nil)
	rec = httptest.NewRecorder()
	h.Authorize(rec, req)
	if rec.Code != http.StatusFound {
		t.Fatalf("missing PKCE status = %d, want 302", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "https://hoa.tanhdev.com/oauth/callback?") || !strings.Contains(loc, "error=invalid_request") {
		t.Fatalf("unexpected error redirect: %q", loc)
	}

	// plain method rejected.
	q.Set("code_challenge", s256Challenge(t, validVerifier))
	q.Set("code_challenge_method", "plain")
	req = httptest.NewRequest(http.MethodGet, "/oauth2/auth?"+q.Encode(), nil)
	rec = httptest.NewRecorder()
	h.Authorize(rec, req)
	loc = rec.Header().Get("Location")
	if !strings.Contains(loc, "error=invalid_request") {
		t.Fatalf("plain method must be rejected, got %q", loc)
	}

	// Happy path: renders HTML login + consent form with CSRF cookie.
	q.Set("code_challenge_method", "S256")
	q.Set("state", "st123")
	req = httptest.NewRequest(http.MethodGet, "/oauth2/auth?"+q.Encode(), nil)
	rec = httptest.NewRecorder()
	h.Authorize(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("happy path status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Fatalf("Content-Type = %q", ct)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `name="code_challenge_method" value="S256"`) {
		t.Fatal("form must carry code_challenge_method hidden field")
	}
	if !strings.Contains(body, `name="state" value="st123"`) {
		t.Fatal("form must carry state hidden field")
	}
	if !strings.Contains(body, "cấp quyền") {
		t.Fatal("consent text missing")
	}
	var csrf *http.Cookie
	for _, c := range rec.Result().Cookies() {
		if c.Name == csrfCookie {
			csrf = c
		}
	}
	if csrf == nil {
		t.Fatal("CSRF cookie not set")
	}
	if csrf.SameSite != http.SameSiteStrictMode || !csrf.HttpOnly || !csrf.Secure {
		t.Fatalf("CSRF cookie flags wrong: %+v", csrf)
	}
}

func TestAuthorize_SubmitBadCSRF(t *testing.T) {
	store := newMemStore()
	h := NewAuthorizeHandler("test-client", "https://hoa.tanhdev.com/oauth/callback", "https://hoa.tanhdev.com", fakeUsers{validEmail: "a@b.c"}, store)
	form := validAuthorizeForm(t)
	form.Set("csrf_token", "wrong")
	_, rec := doSubmit(h, form, testCSRF)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad CSRF status = %d, want 401", rec.Code)
	}
	if len(store.codes) != 0 {
		t.Fatal("no code must be created on CSRF failure")
	}
}

func TestAuthorize_SubmitBadPassword(t *testing.T) {
	store := newMemStore()
	h := NewAuthorizeHandler("test-client", "https://hoa.tanhdev.com/oauth/callback", "https://hoa.tanhdev.com", fakeUsers{validEmail: "a@b.c"}, store)
	form := validAuthorizeForm(t)
	form.Set("email", "a@b.c")
	form.Set("password", "wrong-password")
	_, rec := doSubmit(h, form, testCSRF)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad password status = %d, want 401", rec.Code)
	}
	if len(store.codes) != 0 {
		t.Fatal("no code must be created on bad password")
	}
}

func TestAuthorize_SubmitIssuesCodeAndRedirects(t *testing.T) {
	store := newMemStore()
	h := NewAuthorizeHandler("test-client", "https://hoa.tanhdev.com/oauth/callback", "https://hoa.tanhdev.com", fakeUsers{validEmail: "a@b.c"}, store)
	form := validAuthorizeForm(t)
	form.Set("email", "a@b.c")
	form.Set("password", "correct-password")
	form.Set("state", "xyz")
	_, rec := doSubmit(h, form, testCSRF)
	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	loc, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("bad location: %v", err)
	}
	if loc.Scheme+"://"+loc.Host+loc.Path != "https://hoa.tanhdev.com/oauth/callback" {
		t.Fatalf("redirect = %q", loc)
	}
	if loc.Query().Get("code") == "" {
		t.Fatal("code missing in redirect")
	}
	if loc.Query().Get("state") != "xyz" {
		t.Fatal("state not echoed")
	}
	if len(store.codes) != 1 {
		t.Fatalf("expected 1 code stored, got %d", len(store.codes))
	}
	// Code must expire in ~10 minutes.
	for _, c := range store.codes {
		if time.Until(c.ExpiresAt) > AuthCodeTTL || time.Until(c.ExpiresAt) < AuthCodeTTL-time.Minute {
			t.Fatalf("code TTL wrong: %v", time.Until(c.ExpiresAt))
		}
	}
}

// testCSRF is the 64-char CSRF token shared between cookie and form field.
const testCSRF = "correct-correct-correct-correct-correct-correct-12"

func validAuthorizeForm(t *testing.T) url.Values {
	return url.Values{
		"client_id":             {"test-client"},
		"redirect_uri":          {"https://hoa.tanhdev.com/oauth/callback"},
		"response_type":         {"code"},
		"scope":                 {"read write"},
		"state":                 {"xyz"},
		"code_challenge":        {s256Challenge(t, validVerifier)},
		"code_challenge_method": {"S256"},
		"csrf_token":            {testCSRF},
	}
}

func doSubmit(h *AuthorizeHandler, form url.Values, csrf string) (*http.Request, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, "/oauth2/auth", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.AddCookie(&http.Cookie{Name: csrfCookie, Value: csrf})
	rec := httptest.NewRecorder()
	h.AuthorizeSubmit(rec, req)
	return req, rec
}
