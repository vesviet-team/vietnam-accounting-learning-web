package auth

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strings"
)

// verifierRe chars allowed by RFC 7636 section 4.1:
// ALPHA / DIGIT / "-" / "." / "_" / "~"
const verifierCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"

// VerifyPKCE validates a code_verifier against a stored code_challenge
// per RFC 7636. Only S256 is accepted; "plain" is explicitly rejected
// (OAuth 2.1 requirement).
//
// Reference vector (RFC 7636 Appendix B):
//
//	code_verifier   = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
//	code_challenge  = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
func VerifyPKCE(method, challenge, verifier string) error {
	if !strings.EqualFold(method, "S256") {
		return ErrPKCEMethod
	}
	if err := validateVerifier(verifier); err != nil {
		return err
	}
	sum := sha256.Sum256([]byte(verifier))
	computed := base64.RawURLEncoding.EncodeToString(sum[:])
	if subtle.ConstantTimeCompare([]byte(computed), []byte(challenge)) != 1 {
		return ErrPKCE
	}
	return nil
}

func validateVerifier(verifier string) error {
	if len(verifier) < 43 || len(verifier) > 128 {
		return ErrPKCE
	}
	for _, c := range verifier {
		if !strings.ContainsRune(verifierCharset, c) {
			return ErrPKCE
		}
	}
	return nil
}
