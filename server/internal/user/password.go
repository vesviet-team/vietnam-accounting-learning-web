package user

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// OWASP Password Storage Cheat Sheet baseline for argon2id (19 MiB, t=2, p=1),
// keeping per-request heap allocation safe inside memory-constrained pods while
// VerifyPassword remains compatible with legacy higher-cost PHC hashes.
const (
	argonMemoryKiB   uint32 = 19 * 1024
	argonTime        uint32 = 2
	argonParallelism uint8  = 1
	argonKeyLen      uint32 = 32
	argonSaltLen            = 16

	maxVerifyMemoryKiB uint32 = 256 * 1024
	maxVerifyTime      uint32 = 32
	maxVerifyThreads   uint8  = 16
	maxVerifyKeyLen           = 128
	maxVerifySaltLen          = 64
)

// argonSem bounds concurrent argon2id memory arenas per process so bursts of
// login or registration requests cannot spike heap past container cgroup limits.
var argonSem = make(chan struct{}, 2)

func deriveArgon2Key(password string, salt []byte, timeCost, memoryKiB uint32, threads uint8, keyLen uint32) []byte {
	argonSem <- struct{}{}
	defer func() { <-argonSem }()
	return argon2.IDKey([]byte(password), salt, timeCost, memoryKiB, threads, keyLen)
}

// HashPassword derives an argon2id PHC-formatted hash of the password.
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := deriveArgon2Key(password, salt, argonTime, argonMemoryKiB, argonParallelism, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argonMemoryKiB, argonTime, argonParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// VerifyPassword recomputes the argon2id hash using the parameters encoded
// in the stored hash and compares in constant time.
func VerifyPassword(storedHash, password string) (bool, error) {
	parts := strings.Split(storedHash, "$")
	// "" / "argon2id" / "v=19" / "m=...,t=...,p=..." / salt / hash
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errors.New("user: malformed password hash")
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != 19 {
		return false, errors.New("user: unsupported argon2 version")
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false, errors.New("user: malformed argon2 parameters")
	}
	if m == 0 || m > maxVerifyMemoryKiB || t == 0 || t > maxVerifyTime || p == 0 || p > maxVerifyThreads {
		return false, errors.New("user: argon2 parameters out of bounds")
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) == 0 || len(salt) > maxVerifySaltLen {
		return false, errors.New("user: malformed salt")
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(want) == 0 || len(want) > maxVerifyKeyLen {
		return false, errors.New("user: malformed hash")
	}
	got := deriveArgon2Key(password, salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
