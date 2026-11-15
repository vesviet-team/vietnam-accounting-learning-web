package db

import (
	"context"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// fakeExecer records executed SQL and simulates schema_migrations lookups.
type fakeExecer struct {
	executed        []string
	appliedVersions map[int64]bool // count(*) reports these as applied
}

func (f *fakeExecer) Exec(_ context.Context, sql string, _ ...any) (pgconn.CommandTag, error) {
	f.executed = append(f.executed, sql)
	return pgconn.CommandTag{}, nil
}

func (f *fakeExecer) QueryRow(_ context.Context, sql string, args ...any) pgx.Row {
	if strings.Contains(sql, "SELECT count(*) FROM schema_migrations") && len(args) == 1 {
		return &fakeRow{applied: f.appliedVersions[args[0].(int64)]}
	}
	return &fakeRow{}
}

type fakeRow struct{ applied bool }

func (r *fakeRow) Scan(dest ...any) error {
	if len(dest) == 1 {
		if p, ok := dest[0].(*int64); ok {
			if r.applied {
				*p = 1
			} else {
				*p = 0
			}
		}
	}
	return nil
}

var _ Execer = (*fakeExecer)(nil)

func TestMigrate_Order(t *testing.T) {
	fsys := fstest.MapFS{
		"0002_second.sql": &fstest.MapFile{Data: []byte("CREATE TABLE b(id int);")},
		"0001_first.sql":  &fstest.MapFile{Data: []byte("CREATE TABLE a(id int);")},
		"README.md":       &fstest.MapFile{Data: []byte("not a migration")},
		"0003_third.sql":  &fstest.MapFile{Data: []byte("CREATE TABLE c(id int);")},
	}

	ex := &fakeExecer{appliedVersions: map[int64]bool{}}
	if err := Migrate(context.Background(), ex, fsys); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	// Applied in filename order: 0001, 0002, 0003.
	var applied []string
	for _, sql := range ex.executed {
		if strings.HasPrefix(sql, "CREATE TABLE") {
			applied = append(applied, sql)
		}
	}
	want := []string{"CREATE TABLE a(id int);", "CREATE TABLE b(id int);", "CREATE TABLE c(id int);"}
	if len(applied) != len(want) {
		t.Fatalf("applied = %v, want %v", applied, want)
	}
	for i := range want {
		if applied[i] != want[i] {
			t.Fatalf("order wrong at %d: %v", i, applied)
		}
	}
	// Version recorded for each applied migration.
	var recorded int
	for _, sql := range ex.executed {
		if strings.Contains(sql, "INSERT INTO schema_migrations") {
			recorded++
		}
	}
	if recorded != 3 {
		t.Fatalf("recorded versions = %d, want 3", recorded)
	}
}

func TestMigrate_SkipsAppliedVersions(t *testing.T) {
	fsys := fstest.MapFS{
		"0001_first.sql": &fstest.MapFile{Data: []byte("CREATE TABLE a(id int);")},
	}

	ex := &fakeExecer{appliedVersions: map[int64]bool{1: true}}
	if err := Migrate(context.Background(), ex, fsys); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	for _, sql := range ex.executed {
		if strings.HasPrefix(sql, "CREATE TABLE a") {
			t.Fatal("already-applied migration must be skipped")
		}
	}
}

func TestMigrate_InvalidFilename(t *testing.T) {
	fsys := fstest.MapFS{
		"nonsense.sql": &fstest.MapFile{Data: []byte("CREATE TABLE x(id int);")},
	}
	ex := &fakeExecer{appliedVersions: map[int64]bool{}}
	err := Migrate(context.Background(), ex, fsys)
	if err == nil || !strings.Contains(err.Error(), "invalid migration filename") {
		t.Fatalf("err = %v, want invalid migration filename", err)
	}
}
