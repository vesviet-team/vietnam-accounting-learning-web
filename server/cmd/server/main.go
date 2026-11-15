// Command server wires configuration, database, migration and all HTTP
// handlers, then serves with graceful shutdown.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/account"
	"github.com/vesviet-team/vietnam-accounting-api/internal/auth"
	"github.com/vesviet-team/vietnam-accounting-api/internal/backup"
	"github.com/vesviet-team/vietnam-accounting-api/internal/config"
	"github.com/vesviet-team/vietnam-accounting-api/internal/db"
	"github.com/vesviet-team/vietnam-accounting-api/internal/middleware"
	"github.com/vesviet-team/vietnam-accounting-api/internal/sync"
	"github.com/vesviet-team/vietnam-accounting-api/internal/user"
	"github.com/vesviet-team/vietnam-accounting-api/migrations"
)

func main() {
	if err := run(); err != nil {
		// Fail gracefully: a clear error on stderr, non-zero exit, no panic.
		fmt.Fprintln(os.Stderr, "vietnam-accounting-api: fatal:", err)
		os.Exit(1)
	}
}

func run() error {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.LoadFromEnv()
	if err != nil {
		return err // message is descriptive and contains no secret values
	}
	logger.Info("config_loaded",
		"port", cfg.Port,
		"issuer", cfg.OAuthIssuer,
		"client_id", cfg.OAuthClientID,
	)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Database: connect then apply embedded migrations.
	connectCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	pool, err := db.Connect(connectCtx, cfg.DatabaseURL)
	cancel()
	if err != nil {
		return fmt.Errorf("cannot start (is DATABASE_URL reachable?): %w", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, migrations.FS()); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}
	logger.Info("database_ready")

	// Services.
	keys := auth.NewKeys(cfg.JWTSigningKey, cfg.OAuthIssuer)
	authStore := auth.NewPGStore(pool)
	userStore := user.NewPGStore(pool)
	users := user.NewService(userStore)

	tokenHandler := &auth.TokenHandler{
		ClientID: cfg.OAuthClientID,
		Store:    authStore,
		Keys:     keys,
		UserActive: func(ctx context.Context, userID uuid.UUID) (bool, error) {
			_, err := users.GetActiveByID(ctx, userID)
			if errors.Is(err, user.ErrNotFound) || errors.Is(err, user.ErrDisabled) {
				return false, nil
			}
			return err == nil, err
		},
	}
	authorizeHandler := auth.NewAuthorizeHandler(
		cfg.OAuthClientID, cfg.OAuthClientRedirectURI, cfg.OAuthIssuer, users, authStore)
	userHandler := &user.Handler{Service: users, Keys: keys}
	backupHandler := &backup.Handler{Store: backup.NewPGStore(pool), Keys: keys}
	syncStore := sync.NewPGStore(pool)
	syncHandler := &sync.Handler{Store: syncStore, Keys: keys}
	accountHandler := &account.Handler{
		Store: account.NewPGStore(pool, authStore, syncStore),
		Keys:  keys,
		Users: users,
	}

	// Router (Go 1.22 method patterns).
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpxPlain(w, http.StatusOK, "ok")
	})

	mux.HandleFunc("GET /oauth2/auth", authorizeHandler.Authorize)
	mux.HandleFunc("POST /oauth2/auth", authorizeHandler.AuthorizeSubmit)
	mux.Handle("POST /oauth2/token", middleware.RateLimit(30, time.Minute)(tokenHandler))
	mux.HandleFunc("GET /oauth2/jwks", keys.JWKSHandler)
	mux.HandleFunc("POST /oauth2/revoke", tokenHandler.Revoke)
	mux.HandleFunc("POST /oauth2/logout", tokenHandler.Logout)
	mux.HandleFunc("POST /oauth2/logout-all", tokenHandler.LogoutAll)

	mux.Handle("GET /me", middleware.RateLimit(120, time.Minute)(http.HandlerFunc(userHandler.Me)))
	mux.HandleFunc("POST /auth/register", userHandler.Register)

	mux.HandleFunc("PUT /sync/backup", backupHandler.Put)
	mux.HandleFunc("GET /sync/backup", backupHandler.Get)

	// P1 per-entity sync + account management (bearer-authenticated,
	// rate-limited; payloads are never logged).
	mux.Handle("GET /sync/pull", middleware.RateLimit(120, time.Minute)(http.HandlerFunc(syncHandler.Pull)))
	mux.Handle("POST /sync/push", middleware.RateLimit(120, time.Minute)(http.HandlerFunc(syncHandler.Push)))
	mux.Handle("POST /sync/merge-anonymous", middleware.RateLimit(30, time.Minute)(http.HandlerFunc(syncHandler.MergeAnonymous)))

	mux.Handle("GET /me/sessions", middleware.RateLimit(120, time.Minute)(http.HandlerFunc(accountHandler.Sessions)))
	mux.Handle("POST /me/sessions/revoke", middleware.RateLimit(30, time.Minute)(http.HandlerFunc(accountHandler.RevokeSession)))
	mux.Handle("GET /me/export", middleware.RateLimit(10, time.Minute)(http.HandlerFunc(accountHandler.Export)))
	mux.Handle("POST /me/delete", middleware.RateLimit(10, time.Minute)(http.HandlerFunc(accountHandler.Delete)))

	// Middleware chain: recover -> logging -> request-id -> CORS -> mux.
	handler := middleware.Recover(logger)(
		middleware.Logging(logger)(
			middleware.RequestID(
				middleware.CORS(mux),
			),
		),
	)

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case <-ctx.Done():
		logger.Info("shutdown_signal_received")
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}
	logger.Info("shutdown_complete")
	return nil
}

func httpxPlain(w http.ResponseWriter, status int, text string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(text))
}
