package user

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"runtime"
	"strings"

	"golang.org/x/crypto/argon2"
)

// argon2id parameters: 64 MiB memory, 3 iterations, parallelism = CPU count.
const (
	argonMemoryKiB = 64 * 1024
	argonTime      = 3
	argonKeyLen    = 32
	argonSaltLen   = 16
)

func argonParallelism() uint8 {
	p := runtime.NumCPU()
	if p < 1 {
		p = 1
	}
	if p > 4 {
		p = 4
	}
	return uint8(p)
}

// HashPassword derives an argon2id PHC-formatted hash of the password.
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	p := argonParallelism()
	key := argon2.IDKey([]byte(password), salt, argonTime, argonMemoryKiB, p, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argonMemoryKiB, argonTime, p,
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
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, errors.New("user: malformed salt")
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, errors.New("user: malformed hash")
	}
	got := argon2.IDKey([]byte(password), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
