package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func newTestKeys(t *testing.T) *Keys {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate rsa key: %v", err)
	}
	return NewKeys(priv, "https://hoa.tanhdev.com")
}

func TestAccessTokenRoundTrip(t *testing.T) {
	keys := newTestKeys(t)
	userID := uuid.Must(uuid.NewV7())
	sid := uuid.Must(uuid.NewV7())

	token, err := keys.SignAccessToken(userID, sid, "read write", time.Now())
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	claims, err := keys.VerifyAccessToken(token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.Subject != userID.String() {
		t.Fatalf("sub = %q, want %q", claims.Subject, userID)
	}
	if claims.Sid != sid.String() {
		t.Fatalf("sid = %q, want %q", claims.Sid, sid)
	}
	if claims.Scope != "read write" {
		t.Fatalf("scope = %q", claims.Scope)
	}
	if claims.Issuer != "https://hoa.tanhdev.com" {
		t.Fatalf("iss = %q", claims.Issuer)
	}
}

func TestAccessToken_ExpiredRejected(t *testing.T) {
	keys := newTestKeys(t)
	token, err := keys.SignAccessToken(uuid.New(), uuid.New(), "read", time.Now().Add(-2*AccessTokenTTL))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := keys.VerifyAccessToken(token); err == nil {
		t.Fatal("expected expired token to be rejected")
	}
}

func TestAccessToken_WrongIssuerRejected(t *testing.T) {
	priv, _ := rsa.GenerateKey(rand.Reader, 2048)
	attacker := NewKeys(priv, "https://evil.example")
	token, err := attacker.SignAccessToken(uuid.New(), uuid.New(), "read", time.Now())
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	keys := newTestKeys(t)
	// Signed by another key AND wrong issuer: both must fail verification.
	if _, err := keys.VerifyAccessToken(token); err == nil {
		t.Fatal("expected token from foreign key/issuer to be rejected")
	}
}

func TestAccessToken_AlgorithmConfusionRejected(t *testing.T) {
	keys := newTestKeys(t)
	// alg=none token with HS256-style forgery attempts must fail.
	forged := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4In0.forged"
	if _, err := keys.VerifyAccessToken(forged); err == nil {
		t.Fatal("expected forged token to be rejected")
	}
	if _, err := keys.VerifyAccessToken(""); err == nil {
		t.Fatal("expected empty token to be rejected")
	}
}

func TestJWKS(t *testing.T) {
	keys := newTestKeys(t)
	jwks := keys.JWKS()
	keysList, ok := jwks["keys"].([]map[string]any)
	if !ok || len(keysList) != 1 {
		t.Fatalf("unexpected JWKS shape: %#v", jwks)
	}
	k := keysList[0]
	if k["kty"] != "RSA" || k["alg"] != "RS256" || k["use"] != "sig" {
		t.Fatalf("unexpected JWK fields: %#v", k)
	}
	n, _ := k["n"].(string)
	e, _ := k["e"].(string)
	if len(n) < 300 { // 2048-bit modulus in base64 is ~342 chars
		t.Fatalf("modulus too short: %d chars", len(n))
	}
	if strings.ContainsAny(n, "+/=") {
		t.Fatal("JWK encoding must be base64url without padding")
	}
	if e != "AQAB" { // 65537
		t.Fatalf("exponent = %q, want AQAB", e)
	}
}
