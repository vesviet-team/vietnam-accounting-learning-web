package user

import (
	"strings"
	"testing"
)

func TestHashPassword_VerifyRoundTrip(t *testing.T) {
	pw := "S3cure-P@ssw0rd!"
	hash, err := HashPassword(pw)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !strings.HasPrefix(hash, "$argon2id$v=19$m=65536,t=3,p=") {
		t.Fatalf("unexpected hash format: %q", hash[:30])
	}
	ok, err := VerifyPassword(hash, pw)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !ok {
		t.Fatal("correct password must verify")
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
