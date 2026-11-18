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
	"net/netip"
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

// AllowedOrigin is the single default origin permitted by CORS.
const AllowedOrigin = "https://hoa.tanhdev.com"

// CORS sets CORS headers for the default allowed origin only.
func CORS(next http.Handler) http.Handler {
	return CORSWithOrigins([]string{AllowedOrigin})(next)
}

// CORSWithOrigins sets CORS headers only when the request Origin matches one
// of the configured origins.
func CORSWithOrigins(origins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(origins))
	for _, o := range origins {
		o = strings.TrimRight(strings.TrimSpace(o), "/")
		if o != "" {
			allowed[o] = true
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && allowed[origin] {
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

const maxRateLimiterBuckets = 10000

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok || now.After(b.windowEnd) {
		if !ok && len(rl.buckets) >= maxRateLimiterBuckets {
			for k, existing := range rl.buckets {
				if now.After(existing.windowEnd) {
					delete(rl.buckets, k)
				}
			}
			// Bound memory even under same-window distributed flood.
			if len(rl.buckets) >= maxRateLimiterBuckets {
				return false
			}
		}
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

// RateLimitRemoteAddr limits requests per raw TCP peer ONLY without honoring
// forwarding headers. Kept as a helper for non-proxied deployments; behind
// trusted cluster proxies use RateLimit (which uses trusted-proxy ClientIP).
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
// forwarding headers.
func remoteAddrHost(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// isTrustedProxyIP returns true when addr belongs to loopback, private RFC 1918 /
// ULA cluster networks, or link-local hops operated by the reverse proxy chain.
func isTrustedProxyIP(addr netip.Addr) bool {
	addr = addr.Unmap()
	return addr.IsLoopback() || addr.IsPrivate() || addr.IsLinkLocalUnicast()
}

// ClientIP extracts the caller IP safely across the cluster proxy chain:
// forwarding headers are inspected ONLY when the immediate TCP peer is a
// trusted internal proxy, and X-Forwarded-For is scanned from right to left to
// select the first non-proxy hop (preventing leftmost header spoofing).
func ClientIP(r *http.Request) string {
	peerHost := remoteAddrHost(r)
	peerAddr, err := netip.ParseAddr(strings.TrimSpace(peerHost))
	if err != nil || !isTrustedProxyIP(peerAddr) {
		return peerHost
	}

	if cfIP := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); cfIP != "" {
		if addr, err := netip.ParseAddr(cfIP); err == nil && !isTrustedProxyIP(addr) {
			return addr.Unmap().String()
		}
	}

	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		var lastValid string
		for i := len(parts) - 1; i >= 0; i-- {
			candidate := strings.TrimSpace(parts[i])
			if candidate == "" {
				continue
			}
			addr, err := netip.ParseAddr(candidate)
			if err != nil {
				continue
			}
			addr = addr.Unmap()
			if lastValid == "" {
				lastValid = addr.String()
			}
			if !isTrustedProxyIP(addr) {
				return addr.String()
			}
		}
		if xRealIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); xRealIP != "" {
			if addr, err := netip.ParseAddr(xRealIP); err == nil {
				return addr.Unmap().String()
			}
		}
		if lastValid != "" {
			return lastValid
		}
	}

	if xRealIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); xRealIP != "" {
		if addr, err := netip.ParseAddr(xRealIP); err == nil {
			return addr.Unmap().String()
		}
	}

	return peerHost
}
