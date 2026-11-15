package config

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"strings"
	"testing"
)

func testEnv(t *testing.T, extra map[string]string) func(string) string {
	base := map[string]string{
		"DATABASE_URL":              "postgres://u:p@localhost:5432/db?sslmode=disable",
		"OAUTH_CLIENT_ID":           "vietnam-accounting-web",
		"OAUTH_CLIENT_REDIRECT_URI": "https://hoa.tanhdev.com/oauth/callback",
		"JWT_SIGNING_KEY":           mustPEM(t),
	}
	for k, v := range extra {
		base[k] = v
	}
	return func(key string) string { return base[key] }
}

func mustPEM(t *testing.T) string {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("gen key: %v", err)
	}
	return string(pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(priv),
	}))
}

func TestLoad_HappyPath(t *testing.T) {
	cfg, err := Load(testEnv(t, nil))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.Port != 8080 {
		t.Fatalf("port = %d, want default 8080", cfg.Port)
	}
	if cfg.OAuthIssuer != "https://hoa.tanhdev.com" {
		t.Fatalf("issuer = %q, want default", cfg.OAuthIssuer)
	}
	if cfg.JWTSigningKey == nil {
		t.Fatal("signing key not parsed")
	}
}

func TestLoad_MissingDatabaseURL_FailsGracefully(t *testing.T) {
	_, err := Load(testEnv(t, map[string]string{"DATABASE_URL": ""}))
	if err == nil {
		t.Fatal("expected error for missing DATABASE_URL")
	}
	if !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Fatalf("error should name DATABASE_URL, got: %v", err)
	}
}

func TestLoad_MissingJWTKey(t *testing.T) {
	_, err := Load(testEnv(t, map[string]string{"JWT_SIGNING_KEY": ""}))
	if err == nil || !strings.Contains(err.Error(), "JWT_SIGNING_KEY") {
		t.Fatalf("err = %v, want JWT_SIGNING_KEY error", err)
	}
}

func TestLoad_BadJWTKey(t *testing.T) {
	_, err := Load(testEnv(t, map[string]string{"JWT_SIGNING_KEY": "not a pem"}))
	if err == nil {
		t.Fatal("expected error for invalid PEM")
	}
	block := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: []byte("garbage")})
	_, err = Load(testEnv(t, map[string]string{"JWT_SIGNING_KEY": string(block)}))
	if err == nil {
		t.Fatal("expected error for invalid RSA key material")
	}
}

func TestLoad_MissingClientConfig(t *testing.T) {
	_, err := Load(testEnv(t, map[string]string{"OAUTH_CLIENT_ID": ""}))
	if err == nil || !strings.Contains(err.Error(), "OAUTH_CLIENT_ID") {
		t.Fatalf("err = %v, want OAUTH_CLIENT_ID error", err)
	}
	_, err = Load(testEnv(t, map[string]string{"OAUTH_CLIENT_REDIRECT_URI": ""}))
	if err == nil || !strings.Contains(err.Error(), "OAUTH_CLIENT_REDIRECT_URI") {
		t.Fatalf("err = %v, want OAUTH_CLIENT_REDIRECT_URI error", err)
	}
}

func TestLoad_PortValidation(t *testing.T) {
	if _, err := Load(testEnv(t, map[string]string{"PORT": "not-a-port"})); err == nil {
		t.Fatal("expected error for invalid PORT")
	}
	if _, err := Load(testEnv(t, map[string]string{"PORT": "70000"})); err == nil {
		t.Fatal("expected error for out-of-range PORT")
	}
	cfg, err := Load(testEnv(t, map[string]string{"PORT": "9090"}))
	if err != nil || cfg.Port != 9090 {
		t.Fatalf("port = %d err = %v", cfg.Port, err)
	}
}

func TestLoad_IssuerTrailingSlashTrimmed(t *testing.T) {
	cfg, err := Load(testEnv(t, map[string]string{"OAUTH_ISSUER": "https://hoa.tanhdev.com/"}))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.OAuthIssuer != "https://hoa.tanhdev.com" {
		t.Fatalf("issuer = %q, trailing slash must be trimmed", cfg.OAuthIssuer)
	}
}
