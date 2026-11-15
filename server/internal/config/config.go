// Package config loads and validates service configuration from environment variables.
package config

import (
	"crypto/rsa"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Config is the fully-validated runtime configuration of the service.
type Config struct {
	Port int

	DatabaseURL string

	// JWTSigningKey is the parsed RSA private key used to sign access tokens (RS256).
	JWTSigningKey *rsa.PrivateKey
	// JWTSigningKeyPEM is the raw PEM source (never logged).
	JWTSigningKeyPEM []byte

	OAuthIssuer string

	// P0 supports exactly one static first-party client.
	OAuthClientID          string
	OAuthClientRedirectURI string
}

// Load reads configuration from the environment. It returns a descriptive
// error (never panics) when required variables are missing or malformed.
func Load(getenv func(string) string) (*Config, error) {
	cfg := &Config{}

	cfg.Port = 8080
	if v := strings.TrimSpace(getenv("PORT")); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil || p < 1 || p > 65535 {
			return nil, fmt.Errorf("config: PORT must be an integer in [1,65535], got %q", v)
		}
		cfg.Port = p
	}

	cfg.DatabaseURL = strings.TrimSpace(getenv("DATABASE_URL"))
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required (postgres connection string, e.g. postgres://user:pass@host:5432/db?sslmode=disable)")
	}

	keyPEM := getenv("JWT_SIGNING_KEY")
	keyPEM = strings.ReplaceAll(keyPEM, "\\n", "\n")
	keyPEM = strings.TrimSpace(keyPEM)
	if keyPEM == "" {
		return nil, fmt.Errorf("config: JWT_SIGNING_KEY is required (PEM-encoded RSA private key used for RS256)")
	}
	priv, err := parseRSAPrivateKey([]byte(keyPEM))
	if err != nil {
		return nil, fmt.Errorf("config: JWT_SIGNING_KEY is not a valid RSA private key: %w", err)
	}
	cfg.JWTSigningKey = priv
	cfg.JWTSigningKeyPEM = []byte(keyPEM)

	cfg.OAuthIssuer = strings.TrimRight(strings.TrimSpace(getenv("OAUTH_ISSUER")), "/")
	if cfg.OAuthIssuer == "" {
		cfg.OAuthIssuer = "https://hoa.tanhdev.com"
	}

	cfg.OAuthClientID = strings.TrimSpace(getenv("OAUTH_CLIENT_ID"))
	if cfg.OAuthClientID == "" {
		return nil, fmt.Errorf("config: OAUTH_CLIENT_ID is required (P0 supports exactly one static first-party client)")
	}

	cfg.OAuthClientRedirectURI = strings.TrimSpace(getenv("OAUTH_CLIENT_REDIRECT_URI"))
	if cfg.OAuthClientRedirectURI == "" {
		return nil, fmt.Errorf("config: OAUTH_CLIENT_REDIRECT_URI is required (must match the redirect URI registered for the client)")
	}

	return cfg, nil
}

// LoadFromEnv is Load using os.Getenv.
func LoadFromEnv() (*Config, error) {
	return Load(os.Getenv)
}

func parseRSAPrivateKey(pemBytes []byte) (*rsa.PrivateKey, error) {
	key, err := jwt.ParseRSAPrivateKeyFromPEM(pemBytes)
	if err != nil {
		return nil, err
	}
	if key.N == nil || key.E == 0 {
		return nil, fmt.Errorf("empty RSA key material")
	}
	return key, nil
}
