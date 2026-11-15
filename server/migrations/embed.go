// Package migrations embeds the SQL migration files so the binary is fully
// self-contained (no external migration tool at deploy time).
package migrations

import (
	"embed"
	"io/fs"
)

//go:embed all:*.sql
var files embed.FS

// FS returns the embedded migrations filesystem.
func FS() fs.FS { return files }
