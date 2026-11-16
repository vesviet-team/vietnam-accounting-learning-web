// Package middleware provides cross-cutting HTTP middleware:
// request-id, structured logging, panic recovery, CORS and in-memory
// rate limiting.
//
// Logging policy: only metadata (method, path, status, duration, IP,
// request-id) is ever logged. Tokens, passwords, authorization codes,
// cookies and bodies are NEVER logged.
package middleware

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type ctxKey int

const (
	ctxKeyRequestID ctxKey = iota
	ctxKeyClaims
)

// RequestID returns the request id stored by the RequestID middleware.
func RequestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyRequestID).(string); ok {
		return v
	}
	return ""
}

// RequestID assigns a request id (honoring an incoming X-Request-ID) and
// stores it in the context and response header.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" || len(id) > 64 {
			id = uuid.NewString()
		}
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKeyRequestID, id)))
	})
}

// statusRecorder captures the response status for logging.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// Unwrap lets ResponseController reach the underlying writer (flusher etc.).
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// Logging logs one line per request with metadata only.
func Logging(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			log.Info("http_request",
				"request_id", RequestIDFromContext(r.Context()),
				"method", r.Method,
				"path", r.URL.Path,
				"status", rec.status,
				"duration_ms", time.Since(start).Milliseconds(),
				"remote_ip", ClientIP(r),
			)
		})
	}
}

// Recover converts panics into 500 responses; the error detail is logged,
// but a generic body is returned to the client (no internals leaked).
func Recover(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Error("panic_recovered",
						"request_id", RequestIDFromContext(r.Context()),
						"method", r.Method,
						"path", r.URL.Path,
						"panic", rec,
					)
					http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// AllowedOrigin is the single origin permitted by CORS.
const AllowedOrigin = "https://hoa.tanhdev.com"

// CORS sets CORS headers for the allowed origin only.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == AllowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Device-ID, X-Request-ID")
			w.Header().Set("Access-Control-Max-Age", "600")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// rateLimiter is a tiny fixed-window in-memory limiter keyed by string
// (client IP). Good enough for P0; swap for a shared limiter later.
type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	buckets map[string]*bucket
}

type bucket struct {
	count     int
	windowEnd time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{limit: limit, window: window, buckets: make(map[string]*bucket)}
	go func() {
		for {
			time.Sleep(window)
			rl.mu.Lock()
			now := time.Now()
			for k, b := range rl.buckets {
				if now.After(b.windowEnd) {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok || now.After(b.windowEnd) {
		rl.buckets[key] = &bucket{count: 1, windowEnd: now.Add(rl.window)}
		return true
	}
	if b.count >= rl.limit {
		return false
	}
	b.count++
	return true
}

// RateLimit limits requests per client IP. Keyed independently per call site.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	return rateLimitBy(limit, window, ClientIP)
}

// RateLimitRemoteAddr limits requests per remote address (TCP peer) ONLY —
// X-Forwarded-For is deliberately ignored. Used for credential endpoints
// (login/register) where a spoofed XFF must not rotate the bucket key.
//
// TODO: the effective key behind the nginx proxy is the proxy pod IP, so all
// clients share one bucket per replica; move to a trusted-proxy-aware key
// (or a shared limiter) when needed.
func RateLimitRemoteAddr(limit int, window time.Duration) func(http.Handler) http.Handler {
	return rateLimitBy(limit, window, remoteAddrHost)
}

func rateLimitBy(limit int, window time.Duration, keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	rl := newRateLimiter(limit, window)
	retryAfter := strconv.Itoa(int((window + time.Second - 1) / time.Second))
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !rl.allow(keyFn(r)) {
				w.Header().Set("Retry-After", retryAfter)
				http.Error(w, `{"error":"slow_down"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// remoteAddrHost returns the host part of RemoteAddr without honoring any
// forwarding headers (untrusted for rate-limit keys).
func remoteAddrHost(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// ClientIP extracts the remote client IP (X-Forwarded-For first hop when
// present, otherwise RemoteAddr). Trusted because the service sits behind
// the cluster ingress.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i >= 0 {
			xff = xff[:i]
		}
		return strings.TrimSpace(xff)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
