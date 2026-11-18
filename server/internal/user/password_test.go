package user

import (
	"encoding/base64"
	"fmt"
	"strings"
	"testing"

	"golang.org/x/crypto/argon2"
)

func TestHashPassword_VerifyRoundTrip(t *testing.T) {
	pw := "S3cure-P@ssw0rd!"
	hash, err := HashPassword(pw)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !strings.HasPrefix(hash, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Fatalf("unexpected hash format: %q", hash)
	}
	ok, err := VerifyPassword(hash, pw)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !ok {
		t.Fatal("correct password must verify")
	}
}

func TestVerifyPassword_Legacy64MiBHashCompatibility(t *testing.T) {
	pw := "Legacy-64MiB-Pass!"
	salt := []byte("0123456789abcdef")
	key := argon2.IDKey([]byte(pw), salt, 3, 64*1024, 2, 32)
	legacy := fmt.Sprintf("$argon2id$v=19$m=65536,t=3,p=2$%s$%s",
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	)
	ok, err := VerifyPassword(legacy, pw)
	if err != nil {
		t.Fatalf("verify legacy hash: %v", err)
	}
	if !ok {
		t.Fatal("legacy 64 MiB hash must verify after parameter tuning")
	}
}

func TestVerifyPassword_RejectsOutOfBoundsParams(t *testing.T) {
	excessive := "$argon2id$v=19$m=1048576,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
	if _, err := VerifyPassword(excessive, "pw"); err == nil {
		t.Fatal("expected error for excessive argon2 memory parameter")
	}
}

func TestVerifyPassword_WrongPassword(t *testing.T) {
	hash, _ := HashPassword("correct horse battery staple")
	ok, err := VerifyPassword(hash, "wrong password")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if ok {
		t.Fatal("wrong password must not verify")
	}
}

func TestHashPassword_UniqueSalts(t *testing.T) {
	h1, _ := HashPassword("same-password")
	h2, _ := HashPassword("same-password")
	if h1 == h2 {
		t.Fatal("two hashes of the same password must differ (random salt)")
	}
}

func TestVerifyPassword_MalformedHash(t *testing.T) {
	if _, err := VerifyPassword("not-a-hash", "pw"); err == nil {
		t.Fatal("expected error for malformed hash")
	}
	bcryptStyle := "$2a$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvwxyz0123456789abcd"
	if _, err := VerifyPassword(bcryptStyle, "pw"); err == nil {
		t.Fatal("expected error for non-argon2 hash")
	}
}
