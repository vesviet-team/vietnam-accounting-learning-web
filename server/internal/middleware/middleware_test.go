package middleware

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestRequestID(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if RequestIDFromContext(r.Context()) == "" {
			t.Error("request id missing in context")
		}
		w.WriteHeader(200)
	})
	h := RequestID(next)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("X-Request-ID") == "" {
		t.Fatal("X-Request-ID header not set")
	}

	// Incoming X-Request-ID honored.
	req = httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-ID", "fixed-id-42")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if got := rec.Header().Get("X-Request-ID"); got != "fixed-id-42" {
		t.Fatalf("X-Request-ID = %q, want fixed-id-42", got)
	}
}

func TestRecover(t *testing.T) {
	h := Recover(discardLogger())(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req) // must not panic
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "boom") {
		t.Fatal("panic detail must not leak to the client")
	}
}

func TestCORS(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	h := CORS(next)

	// Allowed origin gets CORS headers.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Origin", AllowedOrigin)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != AllowedOrigin {
		t.Fatal("CORS header missing for allowed origin")
	}

	// Any other origin gets none.
	req = httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("CORS header must not be set for foreign origins")
	}

	// Preflight short-circuits with 204.
	req = httptest.NewRequest(http.MethodOptions, "/", nil)
	req.Header.Set("Origin", AllowedOrigin)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want 204", rec.Code)
	}
}

func TestRateLimit(t *testing.T) {
	limit := 3
	mw := RateLimit(limit, time.Minute)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	h := mw(next)

	ok, limited := 0, 0
	for i := 0; i < limit+2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/oauth2/token", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code == http.StatusOK {
			ok++
		} else if rec.Code == http.StatusTooManyRequests {
			limited++
		} else {
			t.Fatalf("unexpected status %d", rec.Code)
		}
	}
	if ok != limit {
		t.Fatalf("ok = %d, want %d", ok, limit)
	}
	if limited != 2 {
		t.Fatalf("limited = %d, want 2", limited)
	}

	// Different IP is independent.
	req := httptest.NewRequest(http.MethodPost, "/oauth2/token", nil)
	req.RemoteAddr = "10.0.0.2:1234"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("independent IP status = %d, want 200", rec.Code)
	}
}

func TestClientIP_XForwardedFor(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.168.1.1:5555"
	req.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
	if got := ClientIP(req); got != "203.0.113.7" {
		t.Fatalf("ClientIP = %q, want 203.0.113.7", got)
	}
	req.Header.Del("X-Forwarded-For")
	if got := ClientIP(req); got != "192.168.1.1" {
		t.Fatalf("ClientIP = %q, want 192.168.1.1", got)
	}
}
