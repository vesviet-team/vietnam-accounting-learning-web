package account

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
	"github.com/vesviet-team/vietnam-accounting-api/internal/user"
)

// userStub implements httpx.BearerVerifier with a fixed user id, so tests
// can drive handler auth without a JWT keyring.
type verifierStub struct{ claims httpx.AccessClaims }

func (v verifierStub) ParseBearerClaims(_ *http.Request) (httpx.AccessClaims, error) {
	return v.claims, nil
}

func newHandler(store *memStore, uid uuid.UUID) *Handler {
	us := user.NewService(&userMemStoreOf{active: map[uuid.UUID]bool{uid: true}})
	return &Handler{
		Store: store,
		Keys:  verifierStub{claims: httpx.AccessClaims{Subject: uid.String(), SessionID: uuid.Must(uuid.NewV7()).String()}},
		Users: us,
	}
}

// userMemStoreOf wires a user.Store backed by the same in-memory user set
// (a separate tiny store; the account store owns data deletion).
type userMemStoreOf struct {
	active map[uuid.UUID]bool
}

func (s *userMemStoreOf) CreateUser(_ context.Context, _ *user.User) error { return nil }
func (s *userMemStoreOf) GetByEmail(_ context.Context, _ string) (*user.User, error) {
	return nil, user.ErrNotFound
}
func (s *userMemStoreOf) GetByID(_ context.Context, id uuid.UUID) (*user.User, error) {
	if s.active[id] {
		return &user.User{ID: id, Email: "learner@example.com"}, nil
	}
	return &user.User{ID: id, DisabledAt: nowPtr()}, nil
}
func (s *userMemStoreOf) Disable(_ context.Context, id uuid.UUID) error {
	s.active[id] = false
	return nil
}

func nowPtr() *time.Time { n := time.Now(); return &n }

func TestMe_Sessions_ListAndRevoke(t *testing.T) {
	store := newMemStore()
	uid := uuid.Must(uuid.NewV7())
	other := uuid.Must(uuid.NewV7())
	s1, s2 := uuid.Must(uuid.NewV7()), uuid.Must(uuid.NewV7())
	store.addSession(s1, uid, "dev-1")
	store.addSession(s2, other, "dev-other")
	h := newHandler(store, uid)

	// List: only the caller's sessions.
	req := httptest.NewRequest(http.MethodGet, "/me/sessions", nil)
	rec := httptest.NewRecorder()
	h.Sessions(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("sessions = %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Sessions []SessionInfo `json:"sessions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("bad json: %v", err)
	}
	if len(out.Sessions) != 1 || out.Sessions[0].ID != s1.String() {
		t.Fatalf("sessions = %+v, want only %s", out.Sessions, s1)
	}

	// Revoke own session.
	body := `{"session_id":"` + s1.String() + `"}`
	req = httptest.NewRequest(http.MethodPost, "/me/sessions/revoke", strings.NewReader(body))
	rec = httptest.NewRecorder()
	h.RevokeSession(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("revoke = %d %s", rec.Code, rec.Body.String())
	}
	sessions, _ := store.ListSessions(context.Background(), uid)
	if len(sessions) != 0 {
		t.Fatalf("session still active after revoke")
	}

	// Revoke a foreign session id -> 404.
	req = httptest.NewRequest(http.MethodPost, "/me/sessions/revoke", strings.NewReader(`{"session_id":"`+s2.String()+`"}`))
	rec = httptest.NewRecorder()
	h.RevokeSession(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("foreign revoke = %d, want 404", rec.Code)
	}
}

func TestMe_Export_ContainsAllData(t *testing.T) {
	store := newMemStore()
	uid := uuid.Must(uuid.NewV7())
	store.seedData(uid)
	h := newHandler(store, uid)

	req := httptest.NewRequest(http.MethodGet, "/me/export", nil)
	rec := httptest.NewRecorder()
	h.Export(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("export = %d", rec.Code)
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") {
		t.Fatalf("Content-Disposition = %q, want attachment", cd)
	}
	var data map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &data); err != nil {
		t.Fatalf("bad export json: %v", err)
	}
	learning := data["learning"].(map[string]any)
	if learning["progress"] == nil || learning["attempts"] == nil || learning["active_days"] == nil {
		t.Fatalf("export missing entities: %v", learning)
	}
	if len(learning["active_days"].([]any)) != 2 {
		t.Fatalf("active_days = %v", learning["active_days"])
	}
}

func TestMe_Delete_ClearsEverythingAndDisables(t *testing.T) {
	store := newMemStore()
	uid := uuid.Must(uuid.NewV7())
	sid := uuid.Must(uuid.NewV7())
	store.addSession(sid, uid, "dev-1")
	store.seedData(uid)
	h := newHandler(store, uid)

	req := httptest.NewRequest(http.MethodPost, "/me/delete", nil)
	rec := httptest.NewRecorder()
	h.Delete(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("delete = %d %s", rec.Code, rec.Body.String())
	}

	// Learning data gone.
	data, _ := store.Export(context.Background(), uid)
	learning := data["learning"].(map[string]any)
	if learning["progress"] != nil || len(learning["attempts"].([]any)) != 0 {
		t.Fatalf("delete left learning data: %v", learning)
	}
	// Sessions revoked.
	sessions, _ := store.ListSessions(context.Background(), uid)
	if len(sessions) != 0 {
		t.Fatalf("sessions survived delete")
	}
	// User is disabled: subsequent bearer calls fail (401).
	req = httptest.NewRequest(http.MethodGet, "/me/sessions", nil)
	rec = httptest.NewRecorder()
	h.Sessions(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("sessions after delete = %d, want 401", rec.Code)
	}
}
