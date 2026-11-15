package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// Access token lifetime (15 minutes) and refresh token lifetime (30 days).
const (
	AccessTokenTTL  = 15 * time.Minute
	RefreshTokenTTL = 30 * 24 * time.Hour
	AuthCodeTTL     = 10 * time.Minute
)

// AccessClaims is the access token claim set: sub (user), sid (session),
// scope, iss, exp, iat, jti.
type AccessClaims struct {
	jwt.RegisteredClaims
	Sid   string `json:"sid,omitempty"`
	Scope string `json:"scope,omitempty"`
}

// Keys holds the RS256 signing key and mints/verifies access tokens.
// The private key itself is never exposed or logged.
type Keys struct {
	priv   *rsa.PrivateKey
	kid    string
	issuer string
}

// NewKeys builds a Keys from a parsed RSA private key.
func NewKeys(priv *rsa.PrivateKey, issuer string) *Keys {
	sum := sha256.Sum256(priv.N.Bytes())
	return &Keys{
		priv:   priv,
		kid:    hex.EncodeToString(sum[:8]),
		issuer: issuer,
	}
}

// SignAccessToken mints a signed RS256 access token for the given
// user/session/scope.
func (k *Keys) SignAccessToken(userID, sessionID uuid.UUID, scope string, now time.Time) (string, error) {
	claims := AccessClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    k.issuer,
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
		Sid:   sessionID.String(),
		Scope: scope,
	}
	return jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(k.priv)
}

// VerifyAccessToken verifies signature (RS256 only), issuer and expiry.
func (k *Keys) VerifyAccessToken(token string) (*AccessClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &AccessClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return &k.priv.PublicKey, nil
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(k.issuer), jwt.WithExpirationRequired())
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*AccessClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("auth: invalid access token")
	}
	return claims, nil
}

// JWKS returns the public JSON Web Key Set for the signing key.
func (k *Keys) JWKS() map[string]any {
	pub := k.priv.PublicKey
	return map[string]any{
		"keys": []map[string]any{{
			"kty": "RSA",
			"use": "sig",
			"alg": "RS256",
			"kid": k.kid,
			"n":   base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
			"e":   base64.RawURLEncoding.EncodeToString(bigEndianE(pub.E)),
		}},
	}
}

// JWKSHandler serves GET /oauth2/jwks.
func (k *Keys) JWKSHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, k.JWKS())
}

// ParseBearer extracts and verifies the Bearer access token of a request.
func (k *Keys) ParseBearer(r *http.Request) (*AccessClaims, error) {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return nil, errors.New("auth: missing bearer token")
	}
	raw := strings.TrimSpace(h[len(prefix):])
	if raw == "" {
		return nil, errors.New("auth: empty bearer token")
	}
	return k.VerifyAccessToken(raw)
}

// ParseBearerClaims implements httpx.BearerVerifier: verifies the Bearer
// token and returns transport-neutral claims for other packages.
func (k *Keys) ParseBearerClaims(r *http.Request) (httpx.AccessClaims, error) {
	c, err := k.ParseBearer(r)
	if err != nil {
		return httpx.AccessClaims{}, err
	}
	return httpx.AccessClaims{Subject: c.Subject, SessionID: c.Sid, Scope: c.Scope}, nil
}

func bigEndianE(e int) []byte {
	// Exponent is almost always 65537; encode minimal big-endian bytes.
	if e == 0 {
		return []byte{0}
	}
	var buf []byte
	for ; e > 0; e >>= 8 {
		buf = append([]byte{byte(e)}, buf...)
	}
	return buf
}

// randomToken returns a URL-safe random token (used for codes and refresh
// tokens). Only its hash is ever persisted.
func randomToken(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken is the persistent representation of codes and refresh tokens.
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	_ = enc.Encode(v)
}
