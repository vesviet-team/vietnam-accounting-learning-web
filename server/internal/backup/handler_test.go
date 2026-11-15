package backup

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// stubVerifier returns fixed claims for every request.
type stubVerifier struct{ claims httpx.AccessClaims }

func (s stubVerifier) ParseBearerClaims(_ *http.Request) (httpx.AccessClaims, error) {
	return s.claims, nil
}

func newTestHandler(store *memStore) *Handler {
	return &Handler{
		Store: store,
		Keys: stubVerifier{claims: httpx.AccessClaims{
			Subject:   uuid.Must(uuid.NewV7()).String(),
			SessionID: uuid.Must(uuid.NewV7()).String(),
			Scope:     "read write",
		}},
	}
}

func doPut(h *Handler, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPut, "/sync/backup", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.Put(rec, req)
	return rec
}

func doGet(h *Handler) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/sync/backup", nil)
	rec := httptest.NewRecorder()
	h.Get(rec, req)
	return rec
}

func TestBackup_LWW(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)

	// 1) First write (revision 5) succeeds.
	rec := doPut(h, `{"payload":{"v":1,"data":"abc"},"revision":5,"device_id":"dev-1"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("first put status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out["revision"].(float64) != 5 {
		t.Fatalf("revision = %v, want 5", out["revision"])
	}

	// 2) Older revision (3) -> 409 with current revision.
	rec = doPut(h, `{"payload":{"v":2},"revision":3,"device_id":"dev-2"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("stale put status = %d, want 409", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out["error"] != "revision_conflict" || out["revision"].(float64) != 5 {
		t.Fatalf("conflict body = %v", out)
	}

	// 3) Equal revision -> 409 (strict monotonic LWW).
	rec = doPut(h, `{"payload":{"v":3},"revision":5,"device_id":"dev-2"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("equal revision status = %d, want 409", rec.Code)
	}

	// 4) Newer revision (6) -> stored.
	rec = doPut(h, `{"payload":{"v":4,"data":"newer"},"revision":6,"device_id":"dev-2"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("newer put status = %d, body = %s", rec.Code, rec.Body.String())
	}

	// 5) GET returns the latest blob.
	rec = doGet(h)
	if rec.Code != http.StatusOK {
		t.Fatalf("get status = %d", rec.Code)
	}
	var blob map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &blob)
	if blob["revision"].(float64) != 6 {
		t.Fatalf("get revision = %v, want 6", blob["revision"])
	}
	payload, _ := blob["payload"].(map[string]any)
	if payload["v"].(float64) != 4 {
		t.Fatalf("payload = %v, want latest", payload)
	}
	if blob["device_id"] != "dev-2" {
		t.Fatalf("device_id = %v", blob["device_id"])
	}
	if _, err := time.Parse(time.RFC3339Nano, blob["updated_at"].(string)); err != nil {
		t.Fatalf("updated_at not RFC3339: %v", blob["updated_at"])
	}
}

func TestBackup_GetNotFound(t *testing.T) {
	h := newTestHandler(newMemStore())
	rec := doGet(h)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestBackup_PayloadIsOpaque(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)
	// Encrypted-looking payload (arbitrary JSON) is stored verbatim.
	enc := "gAAAAABlZ0hvwK9xencryption-artifact=="
	rec := doPut(h, `{"payload":{"ciphertext":"`+enc+`"},"revision":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	rec = doGet(h)
	var blob map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &blob)
	if blob["payload"].(map[string]any)["ciphertext"] != enc {
		t.Fatal("payload must round-trip unchanged (opaque)")
	}
}

func TestBackup_Validation(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)

	cases := []struct {
		name, body string
		want       int
	}{
		{"missing payload", `{"revision":1}`, http.StatusBadRequest},
		{"missing revision", `{"payload":{}}`, http.StatusBadRequest},
		{"zero revision", `{"payload":{},"revision":0}`, http.StatusBadRequest},
		{"negative revision", `{"payload":{},"revision":-2}`, http.StatusBadRequest},
		{"malformed json", `{`, http.StatusBadRequest},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := doPut(h, c.body)
			if rec.Code != c.want {
				t.Fatalf("status = %d, want %d", rec.Code, c.want)
			}
		})
	}
}
