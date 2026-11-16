import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDbAdapter } from '@/services/storage/indexeddb-adapter';
import { SyncService, type SyncDeps } from '@/services/sync/sync-service';
import { StorageService } from '@/services/storage/storage-service';
import { LearnerProgress } from '@/types/curriculum';

interface FakeResponseInit {
  ok: boolean;
  status: number;
  json: unknown;
}

type FetchCall = { url: string; init?: RequestInit };

function makeAuthStub(responder: (url: string, init?: RequestInit) => FakeResponseInit) {
  const calls: FetchCall[] = [];
  return {
    calls,
    auth: {
      async fetchWithAuth(url: string, init?: RequestInit) {
        calls.push({ url, init });
        const r = responder(url, init);
        return { ok: r.ok, status: r.status, json: async () => r.json } as unknown as Response;
      },
      isAuthenticated: () => true,
      onAuthChange: () => () => undefined,
      getUser: () => ({ id: 'u1', email: 'a@b.c' }),
    },
  };
}

function makeService(
  responder: (url: string, init?: RequestInit) => FakeResponseInit,
  opts: { debounceMs?: number } = {}
): { svc: SyncService; storage: StorageService; calls: FetchCall[] } {
  const storage = new StorageService();
  const { calls, auth } = makeAuthStub(responder);
  const deps: SyncDeps = { auth, storage, debounceMs: opts.debounceMs ?? 20, retryBaseMs: 10, retryMaxMs: 20 };
  return { svc: new SyncService(deps), storage, calls };
}

const canonical = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  cursor: 42,
  progress: {
    completed_days: [1, 2, 3],
    milestone_scores: { '3': 95 },
    current_day: 7,
    regime: 'CIRCULAR_200',
    revision: 9,
  },
  attempts: [],
  active_days: [{ day: '2026-11-15', source: 'lesson' }],
  workbench: [],
  ...over,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('SyncService (P1 per-entity sync)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    // The fake IndexedDB is global per worker: wipe it between tests so
    // progress written by one test cannot leak into the next.
    await new IndexedDbAdapter().clearAll();
  });
  afterEach(() => {
    /* real timers: fake-indexeddb does not play well with fake timers */
  });

  it('pushes local progress after a debounced storage write and merges canonical state back', async () => {
    const { svc, storage, calls } = makeService(() => ({ ok: true, status: 200, json: canonical() }));

    await storage.saveLearnerProgress({
      currentDay: 5,
      unlockedDays: [1, 2, 3, 4, 5],
      completedDays: [1, 2],
      milestoneScores: { 3: 80 },
      streakDays: 2,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    });

    svc.init();
    // A local write of a synced key schedules a debounced push (20ms).
    await storage.saveLearnerProgress({
      currentDay: 6,
      unlockedDays: [1, 2, 3, 4, 5, 6],
      completedDays: [1, 2, 3],
      milestoneScores: { 3: 80 },
      streakDays: 2,
      lastActiveDate: '2026-11-15T11:00:00.000Z',
    });

    await sleep(140);

    const pushCall = calls.find((c) => c.url.startsWith('/sync/push'));
    expect(pushCall).toBeTruthy();
    const body = JSON.parse(pushCall!.init!.body as string) as {
      device_id: string;
      progress: { completed_days: number[]; milestone_scores: Record<string, number>; current_day: number; revision: number };
      workbench: { kind: string }[];
    };
    expect(body.progress.completed_days).toEqual([1, 2, 3]);
    expect(body.progress.milestone_scores['3']).toBeGreaterThanOrEqual(80);
    expect(body.progress.current_day).toBeGreaterThanOrEqual(6);
    expect(body.progress.revision).toBeGreaterThan(0);
    expect(body.device_id).toBeTruthy();
    expect(body.workbench.map((w) => w.kind)).toContain('journalizer');

    // Canonical merge back: max/union — local must never lose data. The
    // queued push (write raced the remote apply) settles first.
    await sleep(250);
    svc.dispose();
    const local = await storage.getLearnerProgress();
    expect(local?.completedDays).toEqual([1, 2, 3]);
    expect(local?.milestoneScores[3]).toBe(95); // max(80, 95)
    expect(local?.currentDay).toBe(7); // max(local 6, server 7)
  });

  it('pull applies server attempts into scoreHistory without duplicates', async () => {
    const attemptId = '11111111-2222-3333-4444-555555555555';
    const { svc, storage, calls } = makeService(() => ({
      ok: true,
      status: 200,
      json: canonical({
        attempts: [
          {
            id: attemptId,
            milestone_day: 3,
            answers: {
              original_result: {
                milestoneDay: 3,
                score: 85,
                passed: true,
                proficiencyTier: 'proficient',
                attemptTimestamp: '2026-11-14T09:00:00.000Z',
              },
            },
            score: 85,
            passed: true,
            attempt_ts: '2026-11-14T09:00:00.000Z',
          },
        ],
      }),
    }));

    await storage.saveLearnerProgress({
      currentDay: 3,
      unlockedDays: [1, 2, 3],
      completedDays: [1, 2, 3],
      milestoneScores: {},
      scoreHistory: {},
      streakDays: 1,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    });
    svc.init();
    await sleep(140);
    expect(calls.find((c) => c.url.startsWith('/sync/pull'))).toBeTruthy();

    const local = await storage.getLearnerProgress();
    const history = local?.scoreHistory?.[3] ?? [];
    expect(history).toHaveLength(1);
    expect((history[0] as { score: number }).score).toBe(85);
    expect((history[0] as { attemptId?: string }).attemptId).toBe(attemptId);
    // Milestone score is the max across canonical progress + attempts.
    expect(local?.milestoneScores[3]).toBe(95);

    // Second pull with the same attempt must not duplicate it.
    await svc.pull();
    const again = await storage.getLearnerProgress();
    expect(again?.scoreHistory?.[3]).toHaveLength(1);
  });

  it('workbench LWW: a strictly-newer server revision overwrites local, a stale one does not', async () => {
    let serverPayload: { postedEntries: { id: string }[]; revisionMarker?: string } = { postedEntries: [{ id: 'srv-1' }], revisionMarker: 'server' };
    let serverRevision = 5;
    const { svc, storage } = makeService(() => ({
      ok: true,
      status: 200,
      json: canonical({
        workbench: [
          { kind: 'journalizer', payload: serverPayload, revision: serverRevision },
        ],
      }),
    }));

    await storage.saveWorkbenchState({ postedEntries: [{ id: 'local-1' }], voucherScores: {} } as never);
    svc.init();
    await sleep(140);

    let local = await storage.loadWorkbenchState();
    expect(local.postedEntries[0]).toMatchObject({ id: 'srv-1' });

    // Stale revision: local (now at server rev 5) must not regress.
    serverRevision = 3;
    serverPayload = { postedEntries: [{ id: 'older' }] };
    await svc.pull();
    local = await storage.loadWorkbenchState();
    expect(local.postedEntries[0]).toMatchObject({ id: 'srv-1' });
    void storage;
  });

  it('merge-anonymous posts the local snapshot and applies the canonical state', async () => {
    const { svc, storage, calls } = makeService(() => ({ ok: true, status: 200, json: canonical() }));

    await storage.saveLearnerProgress({
      currentDay: 4,
      unlockedDays: [1, 2, 3, 4],
      completedDays: [1, 2],
      milestoneScores: { 3: 70 },
      streakDays: 1,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    });

    expect(await svc.hasLocalLearningData()).toBe(true);
    const ok = await svc.mergeAnonymous();
    expect(ok).toBe(true);

    const mergeCall = calls.find((c) => c.url.startsWith('/sync/merge-anonymous'));
    expect(mergeCall).toBeTruthy();
    const body = JSON.parse(mergeCall!.init!.body as string) as {
      device_id: string;
      progress: { completed_days: number[]; milestone_scores: Record<string, number> };
      attempts: unknown[];
      active_days: { day: string }[];
      workbench: { kind: string }[];
    };
    expect(body.progress.completed_days).toEqual([1, 2]);
    expect(body.progress.milestone_scores['3']).toBe(70);
    expect(body.active_days.length).toBeGreaterThan(0);
    expect(body.workbench.map((w) => w.kind)).toContain('journalizer');

    const local = await storage.getLearnerProgress();
    expect(local?.milestoneScores[3]).toBe(95);
  });

  it('sync metadata: stored payload is annotated on write; facade reads strip it (FEAT-06 fidelity)', async () => {
    const { storage } = makeService(() => ({ ok: false, status: 500, json: {} }));
    const progress: LearnerProgress = {
      currentDay: 1,
      unlockedDays: [1, 2, 3],
      completedDays: [],
      milestoneScores: {},
      streakDays: 1,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    };
    await storage.saveLearnerProgress(progress);

    // Raw stored record (adapter level) carries the sync forensics.
    const raw = await new IndexedDbAdapter().getItem<Record<string, unknown>>('learner_progress');
    expect(raw).toBeTruthy();
    expect(typeof raw!.device_id).toBe('string');
    expect(typeof raw!.entity_uuid).toBe('string');
    expect(typeof raw!.updated_at).toBe('string');

    // Facade reads are stripped: application data round-trips identically
    // to what the caller wrote (backward-compatible, FEAT-06 preserved).
    const read = await storage.getItem<Record<string, unknown>>('learner_progress');
    expect(read).toEqual({
      currentDay: 1,
      unlockedDays: [1, 2, 3],
      completedDays: [],
      milestoneScores: {},
      streakDays: 1,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    });
  });

  it('network failure never throws: silent retry with exponential backoff', async () => {
    let attempts = 0;
    const { svc, storage, calls } = makeService(() => {
      attempts++;
      return { ok: false, status: 503, json: {} };
    });
    svc.init();
    await storage.saveLearnerProgress({
      currentDay: 2,
      unlockedDays: [1, 2, 3],
      completedDays: [1, 2],
      milestoneScores: {},
      streakDays: 1,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    });
    await sleep(180);
    expect(calls.filter((c) => c.url.startsWith('/sync/push')).length).toBeGreaterThanOrEqual(1);
    expect(svc.getStatus().status).toBe('error');

    // Retry #1 after ~10ms, #2 after ~20ms (exponential), still silent.
    await sleep(300);
    expect(attempts).toBeGreaterThanOrEqual(3);
    expect(svc.getStatus().status).toBe('error');

    // And the app is unaffected: local state readable.
    const local = await storage.getLearnerProgress();
    expect(local?.completedDays).toEqual([1, 2]);
  });

  it('cursor is monotonic: each pull only asks for newer changes', async () => {
    let cursor = 0;
    const { svc, calls } = makeService(() => {
      const c = ++cursor * 10;
      return { ok: true, status: 200, json: canonical({ cursor: c, progress: null }) };
    });
    svc.init();
    await sleep(140);
    const first = calls.find((c) => c.url.startsWith('/sync/pull'));
    expect(first).toBeTruthy();
    await svc.pull();
    const pulls = calls.filter((c) => c.url.startsWith('/sync/pull'));
    expect(pulls.length).toBe(2);
    const q1 = new URL(pulls[0].url, 'https://app.test').searchParams.get('cursor');
    const q2 = new URL(pulls[1].url, 'https://app.test').searchParams.get('cursor');
    expect(Number(q2)).toBeGreaterThanOrEqual(Number(q1));
  });

  it('does not bump journalizer revision when journalizer is empty and untouched (prevents LWW wipeout)', async () => {
    const { svc, storage, calls } = makeService(() => ({ ok: true, status: 200, json: canonical() }));
    svc.init();
    await storage.saveLearnerProgress({
      currentDay: 2,
      unlockedDays: [1, 2, 3],
      completedDays: [1],
      milestoneScores: {},
      streakDays: 1,
      lastActiveDate: '2026-11-15T10:00:00.000Z',
    });
    await sleep(140);
    svc.dispose();

    const pushCall = calls.find((c) => c.url.startsWith('/sync/push'));
    expect(pushCall).toBeTruthy();
    const body = JSON.parse(pushCall!.init!.body as string) as {
      workbench: { kind: string; revision: number }[];
    };
    const j = body.workbench.find((w) => w.kind === 'journalizer');
    expect(j?.revision).toBe(0);
  });

  it('syncs preferred_regime, notifies onRemoteApplied, and isolates local data when switching users', async () => {
    let activeUser = { id: 'user-a', email: 'a@b.c' };
    let authListener: ((s: { user: { id: string; email: string } | null }) => void) | null = null;
    const calls: FetchCall[] = [];
    const storage = new StorageService();
    const svc = new SyncService({
      storage,
      debounceMs: 20,
      retryBaseMs: 10,
      retryMaxMs: 20,
      auth: {
        async fetchWithAuth(url: string, init?: RequestInit) {
          calls.push({ url, init });
          return {
            ok: true,
            status: 200,
            json: async () =>
              canonical({
                progress: {
                  completed_days: activeUser.id === 'user-b' ? [1] : [1, 2, 3],
                  milestone_scores: {},
                  current_day: activeUser.id === 'user-b' ? 2 : 5,
                  regime: 'CIRCULAR_133',
                  revision: 3,
                },
              }),
          } as unknown as Response;
        },
        isAuthenticated: () => true,
        onAuthChange: (cb) => {
          authListener = cb;
          return () => {
            authListener = null;
          };
        },
        getUser: () => activeUser,
      },
    });

    let remoteNotified = 0;
    svc.onRemoteApplied(() => {
      remoteNotified++;
    });
    svc.init();
    await sleep(80);
    expect(await storage.getPreferredRegime()).toBe('CIRCULAR_133');
    expect(remoteNotified).toBeGreaterThanOrEqual(1);

    // Simulate user A local data then switch to user B.
    svc.setLastAccountId('user-a');
    await storage.saveWorkbenchState({ postedEntries: [{ id: 'a-entry' }], voucherScores: {} } as never, { silent: true });
    activeUser = { id: 'user-b', email: 'b@b.c' };
    authListener!({ user: activeUser });
    await sleep(120);

    const wb = await storage.loadWorkbenchState();
    expect(wb.postedEntries).toHaveLength(0);
    expect(localStorage.getItem('vnacc_sync_meta:user-b')).toBeTruthy();
    svc.dispose();
  });

  it('syncs saved_days bookmarks: unions on initial pull, pushes saved_days, and honors remote removal on newer revision', async () => {
    let remoteSavedDays = [5];
    let remoteRev = 2;
    const { svc, storage, calls } = makeService((url) => {
      if (url.startsWith('/sync/pull')) {
        return {
          ok: true,
          status: 200,
          json: canonical({
            cursor: remoteRev * 10,
            progress: {
              completed_days: [1],
              saved_days: remoteSavedDays,
              milestone_scores: {},
              current_day: 2,
              regime: 'CIRCULAR_200',
              revision: remoteRev,
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: canonical({
          cursor: 30,
          progress: {
            completed_days: [1],
            saved_days: [2, 5],
            milestone_scores: {},
            current_day: 2,
            regime: 'CIRCULAR_200',
            revision: 3,
          },
        }),
      };
    });

    await storage.saveLearnerProgress(
      {
        currentDay: 2,
        unlockedDays: [1, 2, 3],
        completedDays: [1],
        savedDays: [2],
        milestoneScores: {},
        streakDays: 1,
        lastActiveDate: '2026-11-16T10:00:00.000Z',
      },
      { silent: true }
    );

    // Initial pull on fresh device unions local [2] + remote [5] => [2, 5].
    await svc.pull();
    let local = await storage.getLearnerProgress();
    expect(local?.savedDays).toEqual([2, 5]);

    // Subsequent remote revision [5] (removed 2) overrides local [2, 5].
    remoteSavedDays = [5];
    remoteRev = 4;
    await svc.pull();
    local = await storage.getLearnerProgress();
    expect(local?.savedDays).toEqual([5]);

    // Local write pushes saved_days array to server.
    svc.init();
    await storage.saveLearnerProgress({
      ...local!,
      savedDays: [2, 5],
    });
    await sleep(100);
    svc.dispose();

    const pushCall = calls.find((c) => c.url.startsWith('/sync/push'));
    expect(pushCall).toBeTruthy();
    const pushBody = JSON.parse(pushCall!.init!.body as string) as {
      progress: { saved_days: number[] };
    };
    expect(pushBody.progress.saved_days).toEqual([2, 5]);
  });
});
