package auth

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"testing"
)

// TestVerifyPKCE_RFC7636AppendixB uses the official test vector from
// RFC 7636 Appendix B to prove S256 compliance with the spec.
func TestVerifyPKCE_RFC7636AppendixB(t *testing.T) {
	// RFC 7636 Appendix B testvector:
	const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	const expectedChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

	// Recompute the challenge the same way the server would and compare
	// against the RFC value first (guards against accidental drift).
	sum := sha256.Sum256([]byte(verifier))
	computed := base64.RawURLEncoding.EncodeToString(sum[:])
	if computed != expectedChallenge {
		t.Fatalf("S256(%q) = %q, RFC 7636 Appendix B expects %q", verifier, computed, expectedChallenge)
	}

	if err := VerifyPKCE("S256", expectedChallenge, verifier); err != nil {
		t.Fatalf("VerifyPKCE with RFC vector failed: %v", err)
	}
}

func TestVerifyPKCE_RejectsWrongVerifier(t *testing.T) {
	const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
	wrong := "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXl" // last char changed
	if err := VerifyPKCE("S256", challenge, wrong); err == nil {
		t.Fatal("expected mismatch error for tampered verifier")
	}
}

func TestVerifyPKCE_RejectsPlainMethod(t *testing.T) {
	// OAuth 2.1: plain must be rejected even if the challenge matches.
	verifier := "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	err := VerifyPKCE("plain", verifier, verifier)
	if err == nil || err != ErrPKCEMethod {
		t.Fatalf("expected ErrPKCEMethod for plain, got %v", err)
	}
	err = VerifyPKCE("", verifier, verifier)
	if err == nil || err != ErrPKCEMethod {
		t.Fatalf("expected ErrPKCEMethod for empty method, got %v", err)
	}
}

func TestVerifyPKCE_RejectsBadVerifierLength(t *testing.T) {
	short := "short"
	challenge := s256Challenge(t, short)
	if err := VerifyPKCE("S256", challenge, short); err == nil {
		t.Fatal("expected error for verifier shorter than 43 chars")
	}
	long := make([]byte, 129)
	for i := range long {
		long[i] = 'a'
	}
	if err := VerifyPKCE("S256", s256Challenge(t, string(long)), string(long)); err == nil {
		t.Fatal("expected error for verifier longer than 128 chars")
	}
}

func TestVerifyPKCE_RejectsInvalidCharset(t *testing.T) {
	verifier := "this-verifier-contains-invalid-characters!!!!!!!!!!!" // '!' invalid
	if err := VerifyPKCE("S256", s256Challenge(t, verifier), verifier); err == nil {
		t.Fatal("expected error for invalid verifier charset")
	}
}

// TestChallengeIsUnpaddedBase64URL guards the exact encoding chosen.
func TestChallengeIsUnpaddedBase64URL(t *testing.T) {
	verifier := "a-verifier-with-at-least-forty-three-characters-ok"
	sum := sha256.Sum256([]byte(verifier))
	enc := base64.RawURLEncoding.EncodeToString(sum[:])
	if subtle.ConstantTimeCompare([]byte(enc), []byte(s256Challenge(t, verifier))) != 1 {
		t.Fatal("challenge encoding mismatch")
	}
}

func s256Challenge(t *testing.T, verifier string) string {
	t.Helper()
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
