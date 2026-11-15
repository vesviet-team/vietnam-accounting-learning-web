package sync

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

// memStore implements Store with the same merge semantics as the pgx
// implementation, for unit tests (no docker daemon available here).
type memStore struct {
	mu         sync.Mutex
	seq        int64
	progress   map[uuid.UUID]ProgressEntity
	progressS  map[uuid.UUID]int64
	attempts   map[string]AttemptEntity // key: attempt uuid string
	attemptS   map[string]int64
	attemptU   map[uuid.UUID][]string // user id -> attempt ids
	activeDays map[string]ActiveDayEntity
	activeS    map[string]int64
	activeU    map[uuid.UUID][]string
	workbench  map[string]WorkbenchEntity // key: user|kind
	workS      map[string]int64
	workU      map[uuid.UUID][]string
	deleted    map[uuid.UUID]bool
}

func newMemStore() *memStore {
	return &memStore{
		seq:        1,
		progress:   map[uuid.UUID]ProgressEntity{},
		progressS:  map[uuid.UUID]int64{},
		attempts:   map[string]AttemptEntity{},
		attemptS:   map[string]int64{},
		attemptU:   map[uuid.UUID][]string{},
		activeDays: map[string]ActiveDayEntity{},
		activeS:    map[string]int64{},
		activeU:    map[uuid.UUID][]string{},
		workbench:  map[string]WorkbenchEntity{},
		workS:      map[string]int64{},
		workU:      map[uuid.UUID][]string{},
		deleted:    map[uuid.UUID]bool{},
	}
}

func (m *memStore) next() int64 { m.seq++; return m.seq }

func (m *memStore) Merge(_ context.Context, userID uuid.UUID, in PushInput) (State, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.deleted[userID] {
		m.deleted[userID] = false
	}

	if in.Progress != nil {
		p := in.Progress
		revision := p.Revision
		if revision < 1 {
			revision = 1
		}
		existing, ok := m.progress[userID]
		merged := ProgressEntity{
			CompletedDays:   append([]int{}, p.CompletedDays...),
			MilestoneScores: map[string]int{},
			CurrentDay:      p.CurrentDay,
			Regime:          p.Regime,
			Revision:        revision,
			DeviceID:        firstNonEmpty(in.DeviceID, p.DeviceID),
			UpdatedAt:       time.Now().UTC().Format(time.RFC3339Nano),
		}
		for k, v := range p.MilestoneScores {
			merged.MilestoneScores[k] = v
		}
		if merged.CurrentDay < 1 {
			merged.CurrentDay = 1
		}
		if ok { // max/union merge
			merged.CompletedDays = append(merged.CompletedDays, existing.CompletedDays...)
			for k, v := range existing.MilestoneScores {
				merged.MilestoneScores[k] = v
			}
			for k, v := range p.MilestoneScores {
				if cur, seen := merged.MilestoneScores[k]; !seen || v > cur {
					merged.MilestoneScores[k] = v
				}
			}
			if merged.CurrentDay < existing.CurrentDay {
				merged.CurrentDay = existing.CurrentDay
			}
			if merged.Revision < existing.Revision {
				merged.Revision = existing.Revision
			}
			if merged.Regime == "" {
				merged.Regime = existing.Regime
			}
		}
		sort.Ints(merged.CompletedDays)
		merged.CompletedDays = dedupeSorted(merged.CompletedDays)
		m.progress[userID] = merged
		m.progressS[userID] = m.next()
	}

	for _, a := range in.Attempts {
		id := a.ID
		if _, err := uuid.Parse(id); err != nil {
			return State{}, errValidate("sync: attempt id must be a uuid")
		}
		if _, exists := m.attempts[id]; exists {
			continue // union by uuid: never duplicated, never overwritten
		}
		e := AttemptEntity{
			ID:           id,
			MilestoneDay: a.MilestoneDay,
			Answers:      a.Answers,
			Score:        a.Score,
			Passed:       a.Passed,
			DokBreakdown: a.DokBreakdown,
			ItemResults:  a.ItemResults,
			AttemptTS:    a.AttemptTS,
			DeviceID:     firstNonEmpty(in.DeviceID, a.DeviceID),
		}
		m.attempts[id] = e
		m.attemptS[id] = m.next()
		m.attemptU[userID] = append(m.attemptU[userID], id)
	}

	for _, d := range in.ActiveDays {
		if _, perr := time.Parse("2006-01-02", d.Day); perr != nil {
			return State{}, errValidate("sync: active day must be YYYY-MM-DD")
		}
		key := userID.String() + "|" + d.Day
		if _, exists := m.activeDays[key]; exists {
			continue // union
		}
		e := ActiveDayEntity{Day: d.Day, Source: d.Source}
		m.activeDays[key] = e
		m.activeS[key] = m.next()
		m.activeU[userID] = append(m.activeU[userID], d.Day)
	}

	for _, w := range in.Workbench {
		if w.Kind != "journalizer" && w.Kind != "cogs" {
			return State{}, errValidate("sync: invalid workbench kind")
		}
		key := userID.String() + "|" + w.Kind
		if existing, exists := m.workbench[key]; exists && existing.Revision >= w.Revision {
			continue // LWW: strictly-newer wins
		}
		id := w.ID
		if id == "" {
			id = uuid.Must(uuid.NewV7()).String()
		}
		e := WorkbenchEntity{
			ID:        id,
			Kind:      w.Kind,
			Payload:   w.Payload,
			Revision:  w.Revision,
			DeviceID:  firstNonEmpty(in.DeviceID, w.DeviceID),
			UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}
		m.workbench[key] = e
		m.workS[key] = m.next()
		found := false
		for _, k := range m.workU[userID] {
			if k == w.Kind {
				found = true
				break
			}
		}
		if !found {
			m.workU[userID] = append(m.workU[userID], w.Kind)
		}
	}

	m.mu.Unlock()
	st, err := exportAllLocked(m, userID)
	m.mu.Lock()
	return st, err
}

func (m *memStore) Pull(_ context.Context, userID uuid.UUID, cursor int64, kinds []string) (PullResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	set := map[string]bool{}
	for _, k := range normalizeKinds(kinds) {
		set[k] = true
	}
	res := PullResult{Cursor: cursor, Attempts: []AttemptEntity{}, ActiveDays: []ActiveDayEntity{}, Workbench: []WorkbenchEntity{}}

	if set[KindProgress] {
		if p, ok := m.progress[userID]; ok && m.progressS[userID] > cursor {
			pcp := p
			res.Progress = &pcp
		}
	}
	if set[KindAttempts] {
		for _, id := range m.attemptU[userID] {
			if m.attemptS[id] > cursor {
				res.Attempts = append(res.Attempts, m.attempts[id])
			}
		}
	}
	if set[KindActiveDays] {
		for _, day := range m.activeU[userID] {
			key := userID.String() + "|" + day
			if m.activeS[key] > cursor {
				res.ActiveDays = append(res.ActiveDays, m.activeDays[key])
			}
		}
	}
	if set[KindWorkbench] {
		for _, kind := range m.workU[userID] {
			key := userID.String() + "|" + kind
			if m.workS[key] > cursor {
				res.Workbench = append(res.Workbench, m.workbench[key])
			}
		}
	}

	newCursor := cursor
	if res.Progress != nil && m.progressS[userID] > newCursor {
		newCursor = m.progressS[userID]
	}
	for _, a := range res.Attempts {
		if m.attemptS[a.ID] > newCursor {
			newCursor = m.attemptS[a.ID]
		}
	}
	for _, d := range res.ActiveDays {
		if m.activeS[userID.String()+"|"+d.Day] > newCursor {
			newCursor = m.activeS[userID.String()+"|"+d.Day]
		}
	}
	for _, w := range res.Workbench {
		if m.workS[userID.String()+"|"+w.Kind] > newCursor {
			newCursor = m.workS[userID.String()+"|"+w.Kind]
		}
	}
	res.Cursor = newCursor
	return res, nil
}

func (m *memStore) ExportAll(_ context.Context, userID uuid.UUID) (State, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return exportAllLocked(m, userID)
}

// exportAllLocked assumes m.mu is held.
func exportAllLocked(m *memStore, userID uuid.UUID) (State, error) {
	st := State{Attempts: []AttemptEntity{}, ActiveDays: []ActiveDayEntity{}, Workbench: []WorkbenchEntity{}, Cursor: 0}
	if p, ok := m.progress[userID]; ok {
		pcp := p
		st.Progress = &pcp
		st.Cursor = m.progressS[userID]
	}
	for _, id := range m.attemptU[userID] {
		st.Attempts = append(st.Attempts, m.attempts[id])
		if m.attemptS[id] > st.Cursor {
			st.Cursor = m.attemptS[id]
		}
	}
	for _, day := range m.activeU[userID] {
		key := userID.String() + "|" + day
		st.ActiveDays = append(st.ActiveDays, m.activeDays[key])
		if m.activeS[key] > st.Cursor {
			st.Cursor = m.activeS[key]
		}
	}
	for _, kind := range m.workU[userID] {
		key := userID.String() + "|" + kind
		st.Workbench = append(st.Workbench, m.workbench[key])
		if m.workS[key] > st.Cursor {
			st.Cursor = m.workS[key]
		}
	}
	return st, nil
}

func (m *memStore) DeleteAll(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.progress, userID)
	delete(m.progressS, userID)
	for _, id := range m.attemptU[userID] {
		delete(m.attempts, id)
		delete(m.attemptS, id)
	}
	delete(m.attemptU, userID)
	for _, day := range m.activeU[userID] {
		delete(m.activeDays, userID.String()+"|"+day)
		delete(m.activeS, userID.String()+"|"+day)
	}
	delete(m.activeU, userID)
	for _, kind := range m.workU[userID] {
		delete(m.workbench, userID.String()+"|"+kind)
		delete(m.workS, userID.String()+"|"+kind)
	}
	delete(m.workU, userID)
	m.deleted[userID] = true
	return nil
}

func (m *memStore) HasAnyData(_ context.Context, userID uuid.UUID) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, hasP := m.progress[userID]
	return hasP || len(m.attemptU[userID]) > 0 || len(m.activeU[userID]) > 0 || len(m.workU[userID]) > 0, nil
}

// errValidate builds a client-safe validation error (sync: prefix).
func errValidate(msg string) error { return &validateError{msg} }

type validateError struct{ msg string }

func (e *validateError) Error() string { return e.msg }

// dedupeSorted removes duplicates from a sorted int slice in place.
func dedupeSorted(xs []int) []int {
	out := xs[:0]
	for i, x := range xs {
		if i == 0 || x != xs[i-1] {
			out = append(out, x)
		}
	}
	return out
}
