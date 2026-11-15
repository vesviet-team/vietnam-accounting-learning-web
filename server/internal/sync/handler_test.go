package sync

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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

func mustUnmarshal(t *testing.T, body string) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal([]byte(body), &out); err != nil {
		t.Fatalf("bad JSON response: %v\n%s", err, body)
	}
	return out
}

func doPush(h *Handler, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/sync/push", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Push(rec, req)
	return rec
}

func doPull(h *Handler, query string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/sync/pull"+query, nil)
	rec := httptest.NewRecorder()
	h.Pull(rec, req)
	return rec
}

// TestSync_AttemptUnionNeverLoses ensures pushing the same attempts twice
// (two devices, same uuids) keeps every attempt exactly once, and new uuids
// are appended.
func TestSync_AttemptUnionNeverLoses(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)
	id1, id2 := uuid.Must(uuid.NewV7()).String(), uuid.Must(uuid.NewV7()).String()

	push := func(ids ...string) *httptest.ResponseRecorder {
		var parts []string
		for _, id := range ids {
			parts = append(parts, `{"id":"`+id+`","milestone_day":3,"score":85,"passed":true,"attempt_ts":"2026-11-15T08:00:00Z"}`)
		}
		body := `{"device_id":"dev-1","attempts":[` + strings.Join(parts, ",") + `]}`
		return doPush(h, body)
	}

	if rec := push(id1, id2); rec.Code != http.StatusOK {
		t.Fatalf("push 1 status = %d body = %s", rec.Code, rec.Body.String())
	}
	// Same attempts re-pushed (offline replay) plus a genuinely new one.
	id3 := uuid.Must(uuid.NewV7()).String()
	if rec := push(id1, id2, id3); rec.Code != http.StatusOK {
		t.Fatalf("push 2 status = %d body = %s", rec.Code, rec.Body.String())
	}

	rec := doPull(h, "?kinds=attempts")
	if rec.Code != http.StatusOK {
		t.Fatalf("pull status = %d", rec.Code)
	}
	out := mustUnmarshal(t, rec.Body.String())
	attempts, _ := out["attempts"].([]any)
	if len(attempts) != 3 {
		t.Fatalf("attempts = %d, want 3 (union must not lose or duplicate)", len(attempts))
	}
	seen := map[string]bool{}
	for _, a := range attempts {
		am := a.(map[string]any)
		id := am["id"].(string)
		if seen[id] {
			t.Fatalf("duplicate attempt %s", id)
		}
		seen[id] = true
	}
	for _, id := range []string{id1, id2, id3} {
		if !seen[id] {
			t.Fatalf("attempt %s lost", id)
		}
	}
}

// TestSync_ProgressMaxUnionMerge ensures completed_days union,
// milestone_scores max-per-day and revision = max.
func TestSync_ProgressMaxUnionMerge(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)

	if rec := doPush(h, `{"device_id":"dev-1","progress":{"completed_days":[1,2,3],"milestone_scores":{"3":85},"current_day":7,"regime":"CIRCULAR_200","revision":5}}`); rec.Code != http.StatusOK {
		t.Fatalf("push 1 = %d %s", rec.Code, rec.Body.String())
	}
	// Another device with overlapping + new data, lower score for day 3.
	if rec := doPush(h, `{"device_id":"dev-2","progress":{"completed_days":[3,4,5],"milestone_scores":{"3":60,"6":90},"current_day":9,"revision":2}}`); rec.Code != http.StatusOK {
		t.Fatalf("push 2 = %d %s", rec.Code, rec.Body.String())
	}

	rec := doPull(h, "?kinds=progress")
	out := mustUnmarshal(t, rec.Body.String())
	p := out["progress"].(map[string]any)
	days, _ := p["completed_days"].([]any)
	if len(days) != 5 {
		t.Fatalf("completed_days = %v, want union [1..5]", days)
	}
	scores := p["milestone_scores"].(map[string]any)
	if scores["3"].(float64) != 85 {
		t.Fatalf("milestone day 3 = %v, want max 85 (not the later 60)", scores["3"])
	}
	if scores["6"].(float64) != 90 {
		t.Fatalf("milestone day 6 = %v, want 90", scores["6"])
	}
	if p["current_day"].(float64) != 9 {
		t.Fatalf("current_day = %v, want max 9", p["current_day"])
	}
	if p["revision"].(float64) != 5 {
		t.Fatalf("revision = %v, want max 5", p["revision"])
	}
}

// TestSync_WorkbenchLWWRevision ensures a strictly-newer revision wins and a
// stale one never overwrites.
func TestSync_WorkbenchLWWRevision(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)

	if rec := doPush(h, `{"device_id":"dev-1","workbench":[{"kind":"journalizer","payload":{"entries":3},"revision":10}]}`); rec.Code != http.StatusOK {
		t.Fatalf("push 1 = %d", rec.Code)
	}
	// Stale (older revision) must not overwrite.
	if rec := doPush(h, `{"device_id":"dev-2","workbench":[{"kind":"journalizer","payload":{"entries":1},"revision":4}]}`); rec.Code != http.StatusOK {
		t.Fatalf("push 2 = %d", rec.Code)
	}
	// Equal revision must not overwrite (strict LWW).
	if rec := doPush(h, `{"device_id":"dev-2","workbench":[{"kind":"journalizer","payload":{"entries":2},"revision":10}]}`); rec.Code != http.StatusOK {
		t.Fatalf("push 3 = %d", rec.Code)
	}
	rec := doPull(h, "?kinds=workbench")
	out := mustUnmarshal(t, rec.Body.String())
	wb, _ := out["workbench"].([]any)
	if len(wb) != 1 {
		t.Fatalf("workbench rows = %d, want 1", len(wb))
	}
	w := wb[0].(map[string]any)
	if w["revision"].(float64) != 10 {
		t.Fatalf("revision = %v, want 10", w["revision"])
	}
	payload := w["payload"].(map[string]any)
	if payload["entries"].(float64) != 3 {
		t.Fatalf("payload = %v, want the rev-10 payload", payload)
	}
	// Newer revision overwrites.
	if rec := doPush(h, `{"device_id":"dev-2","workbench":[{"kind":"journalizer","payload":{"entries":9},"revision":11}]}`); rec.Code != http.StatusOK {
		t.Fatalf("push 4 = %d", rec.Code)
	}
	rec = doPull(h, "?kinds=workbench")
	out = mustUnmarshal(t, rec.Body.String())
	w = out["workbench"].([]any)[0].(map[string]any)
	if w["revision"].(float64) != 11 {
		t.Fatalf("revision = %v, want 11", w["revision"])
	}
}

// TestSync_PullCursorMonotonic ensures the cursor never goes backwards and
// each pull only returns entities newer than the given cursor.
func TestSync_PullCursorMonotonic(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)

	doPush(h, `{"device_id":"dev-1","progress":{"completed_days":[1],"milestone_scores":{},"current_day":1,"revision":1}}`)
	rec := doPull(h, "")
	out := mustUnmarshal(t, rec.Body.String())
	c1 := int64(out["cursor"].(float64))
	if c1 <= 0 {
		t.Fatalf("first cursor = %v, want > 0", out["cursor"])
	}

	// Pull again with the cursor: nothing new, cursor must not regress.
	rec = doPull(h, "?cursor="+strconvI64(c1))
	out = mustUnmarshal(t, rec.Body.String())
	if out["progress"] != nil {
		t.Fatalf("progress returned twice for the same cursor")
	}
	if int64(out["cursor"].(float64)) < c1 {
		t.Fatalf("cursor regressed: %v < %d", out["cursor"], c1)
	}

	// New activity advances the cursor again.
	doPush(h, `{"device_id":"dev-1","progress":{"completed_days":[2],"milestone_scores":{},"current_day":2,"revision":2}}`)
	rec = doPull(h, "?cursor="+strconvI64(c1))
	out = mustUnmarshal(t, rec.Body.String())
	c2 := int64(out["cursor"].(float64))
	if c2 <= c1 {
		t.Fatalf("cursor not monotonic: %d <= %d", c2, c1)
	}
	p := out["progress"].(map[string]any)
	days, _ := p["completed_days"].([]any)
	if len(days) != 2 {
		t.Fatalf("completed_days = %v, want [1 2]", days)
	}
}

// TestSync_MergeAnonymousIntoAccount simulates the anonymous->account
// migration: device data merges into an empty account, then further pushes
// keep the merged state.
func TestSync_MergeAnonymousIntoAccount(t *testing.T) {
	store := newMemStore()
	h := newTestHandler(store)

	body := `{"device_id":"dev-anon",
		"progress":{"completed_days":[1,2,3],"milestone_scores":{"3":80},"current_day":4,"regime":"CIRCULAR_133","revision":7},
		"attempts":[{"id":"` + uuid.Must(uuid.NewV7()).String() + `","milestone_day":3,"score":80,"passed":true,"attempt_ts":"2026-11-15T10:00:00Z"}],
		"active_days":[{"day":"2026-11-14","source":"lesson"},{"day":"2026-11-15","source":"milestone"}],
		"workbench":[{"kind":"journalizer","payload":{"postedEntries":[]},"revision":3}]}`
	req := httptest.NewRequest(http.MethodPost, "/sync/merge-anonymous", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.MergeAnonymous(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("merge-anonymous = %d %s", rec.Code, rec.Body.String())
	}
	out := mustUnmarshal(t, rec.Body.String())
	if out["progress"] == nil || out["attempts"] == nil {
		t.Fatalf("merge response must contain canonical state")
	}
	p := out["progress"].(map[string]any)
	if p["revision"].(float64) != 7 {
		t.Fatalf("merged revision = %v, want 7", p["revision"])
	}
	attempts := out["attempts"].([]any)
	if len(attempts) != 1 {
		t.Fatalf("merged attempts = %d, want 1", len(attempts))
	}
	active := out["active_days"].([]any)
	if len(active) != 2 {
		t.Fatalf("merged active_days = %d, want 2", len(active))
	}

	// A second device pushes its own data afterwards: union keeps both.
	doPush(h, `{"device_id":"dev-2","active_days":[{"day":"2026-11-13","source":"lesson"}]}`)
	rec = doPull(h, "?kinds=active_days")
	out = mustUnmarshal(t, rec.Body.String())
	active = out["active_days"].([]any)
	if len(active) != 3 {
		t.Fatalf("active_days = %d, want 3", len(active))
	}
}

// TestSync_Validation covers basic request validation.
func TestSync_Validation(t *testing.T) {
	h := newTestHandler(newMemStore())
	cases := []struct {
		name, body string
		want       int
	}{
		{"empty batch", `{}`, http.StatusBadRequest},
		{"malformed json", `{`, http.StatusBadRequest},
		{"bad attempt uuid", `{"attempts":[{"id":"not-a-uuid","milestone_day":3,"score":1,"passed":true}]}`, http.StatusBadRequest},
		{"bad workbench kind", `{"workbench":[{"kind":"nope","payload":{},"revision":1}]}`, http.StatusBadRequest},
		{"bad active day", `{"active_days":[{"day":"15/11/2026"}]}`, http.StatusBadRequest},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := doPush(h, c.body)
			if rec.Code != c.want {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, c.want, rec.Body.String())
			}
		})
	}
	// Bad cursor.
	req := httptest.NewRequest(http.MethodGet, "/sync/pull?cursor=abc", nil)
	rec := httptest.NewRecorder()
	h.Pull(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad cursor status = %d, want 400", rec.Code)
	}
}

// TestSync_ExportContainsEverything verifies the export snapshot shape used
// by /me/export.
func TestSync_ExportContainsEverything(t *testing.T) {
	store := newMemStore()

	ctx := context.Background()
	uid := uuid.Must(uuid.NewV7())

	_, err := store.Merge(ctx, uid, PushInput{
		DeviceID: "dev-1",
		Progress: &ProgressInput{CompletedDays: []int{1, 2}, MilestoneScores: map[string]int{"3": 90}, CurrentDay: 3, Regime: "CIRCULAR_200", Revision: 4},
		Attempts: []AttemptInput{{ID: uuid.Must(uuid.NewV7()).String(), MilestoneDay: 3, Score: 90, Passed: true, AttemptTS: "2026-11-15T10:00:00Z"}},
		ActiveDays: []ActiveDayInput{{Day: "2026-11-15", Source: "lesson"}},
		Workbench: []WorkbenchInput{{Kind: "cogs", Payload: json.RawMessage(`{"v":1}`), Revision: 2}},
	})
	if err != nil {
		t.Fatalf("merge: %v", err)
	}
	st, err := store.ExportAll(ctx, uid)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if st.Progress == nil || len(st.Attempts) != 1 || len(st.ActiveDays) != 1 || len(st.Workbench) != 1 {
		t.Fatalf("export missing entities: %+v", st)
	}
	if st.Cursor <= 0 {
		t.Fatalf("export cursor = %d, want > 0", st.Cursor)
	}

	// Delete removes everything.
	if err := store.DeleteAll(ctx, uid); err != nil {
		t.Fatalf("delete: %v", err)
	}
	st, err = store.ExportAll(ctx, uid)
	if err != nil {
		t.Fatalf("export after delete: %v", err)
	}
	if st.Progress != nil || len(st.Attempts) != 0 || len(st.ActiveDays) != 0 || len(st.Workbench) != 0 {
		t.Fatalf("delete left data behind: %+v", st)
	}
	if has, _ := store.HasAnyData(ctx, uid); has {
		t.Fatal("HasAnyData true after DeleteAll")
	}
}

func strconvI64(v int64) string {
	return strings.TrimSpace(jsonNumber(v))
}

func jsonNumber(v int64) string {
	b, _ := json.Marshal(v)
	return string(b)
}
