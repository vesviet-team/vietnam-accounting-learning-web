// Per-entity sync client (P1): pushes local learning data to the cloud
// with per-entity merge semantics and pulls canonical changes back.
//
// Offline-first policy: every network failure is swallowed (logged to the
// status listeners only) — sync NEVER blocks or breaks the learning UX.
// Local storage stays authoritative for the running app; the server is the
// merge target for multi-device continuity.
//
// Merge policy (implemented server-side, mirrored here for local application):
//   progress   = max/union (completedDays union, milestoneScores max,
//                currentDay max) — server revision = max(existing, incoming)
//   attempts   = union by client uuid (append-only; never lost)
//   activeDays = union by day
//   workbench  = LWW on revision (journalizer & cogs tracked separately)
//
// Streak/unlockedDays are NOT synced: they are re-derived client-side by
// StreakEngine / gating-engine (pure TS engines) from the synced inputs.
import type {
  AnonymousSnapshot,
  SyncAttemptEntity,
  SyncPushResponse,
  SyncWorkbenchEntity,
  WorkbenchKind,
} from '@/types/auth';
import { LearnerProgress, MilestoneAssessmentLike } from './progress-types';
import { storageService, SYNCED_KEYS } from '@/services/storage/storage-service';
import { authService } from '@/services/auth/auth-service';
import { getDeviceId } from '@/services/auth/device';
import { computeUnlockedDays } from '@/engine/gating-engine';

const META_KEY = 'vnacc_sync_meta';
const ACTIVE_DAYS_KEY = 'vnacc_active_days';
const MERGE_ASKED_KEY = 'vnacc_merge_asked';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncStatusState {
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface SyncDeps {
  auth?: Pick<typeof authService, 'fetchWithAuth' | 'isAuthenticated' | 'onAuthChange' | 'getUser'>;
  storage?: typeof storageService;
  /** debounce window for pushes after a local write (ms) */
  debounceMs?: number;
  /** base delay for the exponential retry (ms) */
  retryBaseMs?: number;
  /** max retry delay (ms) */
  retryMaxMs?: number;
}

interface SyncMeta {
  cursor: number;
  progressRevision: number;
  workbenchRevisions: Partial<Record<WorkbenchKind, number>>;
}

const emptyMeta = (): SyncMeta => ({ cursor: 0, progressRevision: 0, workbenchRevisions: {} });

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function vnDay(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // The whole app runs on Asia/Ho_Chi_Minh (VN) calendar days.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

export class SyncService {
  private auth: NonNullable<SyncDeps['auth']>;
  private storage: NonNullable<SyncDeps['storage']>;
  private debounceMs: number;
  private retryBaseMs: number;
  private retryMaxMs: number;

  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private applyingRemote = false;
  private inFlight = false;
  private pushQueued = false;
  private unsubscribeStorage: (() => void) | null = null;
  private unsubscribeAuth: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;
  private statusListeners = new Set<(s: SyncStatusState) => void>();

  private state: SyncStatusState = { status: 'idle', lastSyncAt: null, lastError: null };

  constructor(deps: SyncDeps = {}) {
    this.auth = deps.auth ?? authService;
    this.storage = deps.storage ?? storageService;
    this.debounceMs = deps.debounceMs ?? 6000;
    this.retryBaseMs = deps.retryBaseMs ?? 1000;
    this.retryMaxMs = deps.retryMaxMs ?? 30000;
  }

  // --- Public API ---------------------------------------------------------

  /** Wire listeners: storage writes, focus pull, auth changes. */
  init(): void {
    if (this.unsubscribeStorage) return;
    this.unsubscribeStorage = this.storage.subscribeChanges((key) => {
      if (SYNCED_KEYS.has(key)) this.schedulePush();
    });
    if (typeof window !== 'undefined') {
      this.focusHandler = () => void this.pull();
      window.addEventListener('focus', this.focusHandler);
    }
    this.unsubscribeAuth = this.auth.onAuthChange(({ user }) => {
      if (user) {
        void this.pull();
        this.schedulePush();
      } else {
        this.cancelTimers();
      }
    });
    if (this.auth.isAuthenticated()) {
      void this.pull();
    }
  }

  dispose(): void {
    this.cancelTimers();
    this.unsubscribeStorage?.();
    this.unsubscribeAuth?.();
    if (this.focusHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusHandler);
    }
    this.unsubscribeStorage = null;
    this.unsubscribeAuth = null;
    this.focusHandler = null;
    this.statusListeners.clear();
  }

  getStatus(): SyncStatusState {
    return { ...this.state };
  }

  onStatusChange(cb: (s: SyncStatusState) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  /** Whether this device has local learning data worth merging. */
  async hasLocalLearningData(): Promise<boolean> {
    try {
      const progress = await this.storage.getLearnerProgress();
      if (progress && ((progress.completedDays?.length ?? 0) > 0 || Object.keys(progress.milestoneScores ?? {}).length > 0)) {
        return true;
      }
      const journalizer = await this.storage.loadWorkbenchState();
      if (journalizer.postedEntries.length > 0 || Object.keys(journalizer.voucherScores ?? {}).length > 0) {
        return true;
      }
      const cogs = await this.storage.loadCogsState();
      return cogs !== null;
    } catch {
      return false;
    }
  }

  /** True when the merge prompt was already answered for this user. */
  wasMergeAsked(userId: string): boolean {
    try {
      return localStorage.getItem(`${MERGE_ASKED_KEY}:${userId}`) === '1';
    } catch {
      return true; // no storage: never nag
    }
  }

  markMergeAsked(userId: string): void {
    try {
      localStorage.setItem(`${MERGE_ASKED_KEY}:${userId}`, '1');
    } catch {
      /* ignore */
    }
  }

  /**
   * Anonymous → account migration: push the device's local snapshot through
   * /sync/merge-anonymous and apply the canonical state back.
   */
  async mergeAnonymous(): Promise<boolean> {
    const user = this.auth.getUser?.() ?? null;
    if (!user) return false;
    const snapshot = await this.collectAnonymousSnapshot();
    try {
      this.setStatus('syncing', null);
      const res = await this.auth.fetchWithAuth('/sync/merge-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-ID': getDeviceId() },
        body: JSON.stringify(snapshot),
      });
      if (!res.ok) throw new Error(`merge-anonymous: HTTP ${res.status}`);
      const canonical = (await res.json()) as SyncPushResponse;
      const preMeta = this.loadMeta();
      this.updateMetaFromState(canonical);
      await this.applyCanonical(canonical, preMeta);
      this.markMergeAsked(user.id);
      this.setStatus('idle', null);
      return true;
    } catch (err) {
      this.setStatus('error', err instanceof Error ? err.message : 'merge failed');
      return false;
    }
  }

  // --- Internals ----------------------------------------------------------

  /** Debounced push after any local write of a synced key. */
  private schedulePush(): void {
    if (this.applyingRemote) {
      // Local write racing a remote apply: queue one round afterwards
      // (applyCanonical writes silently, so this cannot loop).
      this.pushQueued = true;
      return;
    }
    if (!this.auth.isAuthenticated()) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.push();
    }, this.debounceMs);
  }

  private cancelTimers(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.pushTimer = null;
    this.retryTimer = null;
    this.retryAttempt = 0;
  }

  private setStatus(status: SyncStatus, error: string | null): void {
    const next: SyncStatusState = {
      status,
      lastSyncAt: status === 'idle' ? new Date().toISOString() : this.state.lastSyncAt,
      lastError: error,
    };
    this.state = next;
    for (const cb of this.statusListeners) {
      try {
        cb(next);
      } catch {
        /* listener errors never break sync */
      }
    }
  }

  private loadMeta(): SyncMeta {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? { ...emptyMeta(), ...(JSON.parse(raw) as SyncMeta) } : emptyMeta();
    } catch {
      return emptyMeta();
    }
  }

  private saveMeta(meta: SyncMeta): void {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {
      /* ignore */
    }
  }

  private loadActiveDaysLog(): Record<string, string> {
    try {
      const raw = localStorage.getItem(ACTIVE_DAYS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  private saveActiveDaysLog(log: Record<string, string>): void {
    try {
      localStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(log));
    } catch {
      /* ignore */
    }
  }

  /** Collects the pushable local state and assigns stable attempt uuids. */
  private async collectPushEntities(): Promise<{
    progress: {
      completed_days: number[];
      milestone_scores: Record<string, number>;
      current_day: number;
      regime: string;
      revision: number;
    } | null;
    attempts: SyncAttemptEntity[];
    active_days: { day: string; source: string }[];
    workbench: SyncWorkbenchEntity[];
  }> {
    const meta = this.loadMeta();
    const progress = await this.storage.getLearnerProgress();
    const attempts: SyncAttemptEntity[] = [];

    if (progress?.scoreHistory) {
      for (const [day, results] of Object.entries(progress.scoreHistory)) {
        (results as MilestoneAssessmentLike[]).forEach((result) => {
          if (!result) return;
          if (!result.attemptId) result.attemptId = uuidV4();
          attempts.push({
            id: result.attemptId,
            milestone_day: Number(day),
            answers: { selected_answers: result.selectedAnswers ?? {}, original_result: result },
            score: result.score,
            passed: result.passed,
            dok_breakdown: result.dokScoreBreakdown ?? null,
            item_results: result.itemResults ?? null,
            attempt_ts: result.attemptTimestamp || new Date().toISOString(),
          });
        });
      }
      if (attempts.length > 0) {
        // Persist the generated attempt ids without re-triggering a push.
        await this.storage.saveLearnerProgress(progress, { silent: true });
      }
    }

    let progressEntity = null;
    if (progress) {
      const regime = await this.storage.getPreferredRegime();
      progressEntity = {
        completed_days: progress.completedDays ?? [],
        milestone_scores: Object.fromEntries(
          Object.entries(progress.milestoneScores ?? {}).map(([k, v]) => [k, Number(v)])
        ),
        current_day: progress.currentDay ?? 1,
        regime,
        revision: meta.progressRevision + 1,
      };
    }

    // Calendar activity days deriveable locally (streak state + progress).
    const streak = await this.storage.getStreakState().catch(() => null);
    const days = new Set<string>();
    for (const d of [vnDay(progress?.lastActiveDate), vnDay(streak?.lastActiveDate), vnDay(new Date().toISOString())]) {
      if (d) days.add(d);
    }
    const activeLog = this.loadActiveDaysLog();
    for (const d of Object.keys(activeLog)) days.add(d);
    const active_days = Array.from(days).map((day) => ({ day, source: activeLog[day] || 'lesson' }));

    const workbench: SyncWorkbenchEntity[] = [];
    const journalizer = await this.storage.loadWorkbenchState();
    workbench.push({
      kind: 'journalizer',
      payload: journalizer,
      revision: (meta.workbenchRevisions.journalizer ?? 0) + 1,
    });
    const cogs = await this.storage.loadCogsState();
    if (cogs) {
      workbench.push({
        kind: 'cogs',
        payload: cogs,
        revision: (meta.workbenchRevisions.cogs ?? 0) + 1,
      });
    }

    return { progress: progressEntity, attempts, active_days, workbench };
  }

  private async collectAnonymousSnapshot(): Promise<AnonymousSnapshot> {
    const entities = await this.collectPushEntities();
    return {
      device_id: getDeviceId(),
      progress: entities.progress ?? {
        completed_days: [],
        milestone_scores: {},
        current_day: 1,
        regime: 'CIRCULAR_200',
        revision: 1,
      },
      attempts: entities.attempts,
      active_days: entities.active_days,
      workbench: entities.workbench,
    };
  }

  /** Push pending local changes (called on debounce, focus, retry). */
  async push(): Promise<void> {
    if (this.inFlight) {
      // A write landed mid-flight: run one more round when this one ends.
      this.pushQueued = true;
      return;
    }
    if (!this.auth.isAuthenticated()) return;
    this.inFlight = true;
    try {
      const body = { device_id: getDeviceId(), ...(await this.collectPushEntities()) };
      this.setStatus('syncing', null);
      const res = await this.auth.fetchWithAuth('/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-ID': getDeviceId() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`push: HTTP ${res.status}`);
      const canonical = (await res.json()) as SyncPushResponse;
      const preMeta = this.loadMeta();
      this.updateMetaFromState(canonical);
      await this.applyCanonical(canonical, preMeta);
      this.retryAttempt = 0;
      this.setStatus('idle', null);
    } catch (err) {
      this.scheduleRetry();
      this.setStatus('error', err instanceof Error ? err.message : 'push failed');
    } finally {
      this.inFlight = false;
      // A write happened while pushing: run one more round.
      if (this.pushQueued) {
        this.pushQueued = false;
        this.schedulePush();
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryAttempt >= 5) return; // silent give-up until next trigger
    const delay = Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** this.retryAttempt);
    this.retryAttempt++;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.push();
    }, delay);
  }

  /** Pull canonical changes since the stored cursor. */
  async pull(): Promise<void> {
    if (this.inFlight || !this.auth.isAuthenticated()) return;
    const meta = this.loadMeta();
    this.inFlight = true;
    try {
      const res = await this.auth.fetchWithAuth(`/sync/pull?cursor=${meta.cursor}`);
      if (!res.ok) throw new Error(`pull: HTTP ${res.status}`);
      const data = (await res.json()) as SyncPushResponse;
      const preMeta = this.loadMeta();
      this.updateMetaFromState(data);
      await this.applyCanonical(data, preMeta);
      this.retryAttempt = 0;
      this.setStatus('idle', null);
    } catch (err) {
      this.setStatus('error', err instanceof Error ? err.message : 'pull failed');
    } finally {
      this.inFlight = false;
      if (this.pushQueued) {
        this.pushQueued = false;
        this.schedulePush();
      }
    }
  }

  private updateMetaFromState(state: SyncPushResponse): void {
    const meta = this.loadMeta();
    if (state.cursor > meta.cursor) meta.cursor = state.cursor;
    if (state.progress && state.progress.revision > meta.progressRevision) {
      meta.progressRevision = state.progress.revision;
    }
    for (const w of state.workbench ?? []) {
      if (w.revision > (meta.workbenchRevisions[w.kind] ?? 0)) {
        meta.workbenchRevisions[w.kind] = w.revision;
      }
    }
    this.saveMeta(meta);
  }

  /**
   * Applies canonical server state into local storage. Local writes made
   * here are guarded so they do not re-trigger push loops. Merges are
   * non-destructive: nothing the user did locally is ever dropped.
   */
  private async applyCanonical(state: SyncPushResponse, preMeta?: SyncMeta): Promise<void> {
    if (!state) return;
    this.applyingRemote = true;
    try {
      // 1) Progress: max/union merge into the local LearnerProgress.
      if (state.progress) {
        const local = (await this.storage.getLearnerProgress()) ?? {
          currentDay: 1,
          unlockedDays: [1, 2, 3],
          completedDays: [],
          milestoneScores: {},
          streakDays: 1,
          lastActiveDate: new Date().toISOString(),
        };
        const merged: LearnerProgress = {
          ...local,
          completedDays: Array.from(
            new Set([...(local.completedDays ?? []), ...(state.progress.completed_days ?? [])])
          ).sort((a, b) => a - b),
          milestoneScores: { ...(local.milestoneScores ?? {}) },
          currentDay: Math.max(local.currentDay ?? 1, state.progress.current_day ?? 1),
        };
        for (const [day, score] of Object.entries(state.progress.milestone_scores ?? {})) {
          const key = Number(day);
          merged.milestoneScores[key] = Math.max(merged.milestoneScores[key] ?? 0, score);
        }
        merged.unlockedDays = computeUnlockedDays(merged);
        await this.storage.saveLearnerProgress(merged, { silent: true });
      }

      // 2) Attempts: append server attempts unknown locally (union by uuid).
      const serverAttempts = state.attempts ?? [];
      if (serverAttempts.length > 0) {
        const local = (await this.storage.getLearnerProgress()) ?? {
          currentDay: 1,
          unlockedDays: [1, 2, 3],
          completedDays: [],
          milestoneScores: {},
          scoreHistory: {},
          streakDays: 1,
          lastActiveDate: new Date().toISOString(),
        };
        const history = local.scoreHistory ?? {};
        const known = new Set<string>();
        for (const results of Object.values(history)) {
          for (const r of results as MilestoneAssessmentLike[]) {
            if (r?.attemptId) known.add(r.attemptId);
          }
        }
        let added = false;
        for (const attempt of serverAttempts) {
          if (known.has(attempt.id)) continue;
          const restored = this.restoreAttempt(attempt);
          if (!restored) continue;
          (history[attempt.milestone_day] ??= [] as MilestoneAssessmentLike[]).push(restored);
          // Keep the highest milestone score in sync with the attempt log.
          const key = attempt.milestone_day;
          const current = local.milestoneScores?.[key] ?? 0;
          if (attempt.score > current) {
            local.milestoneScores = { ...(local.milestoneScores ?? {}), [key]: attempt.score };
          }
          added = true;
        }
        if (added) {
          local.scoreHistory = history;
          local.unlockedDays = computeUnlockedDays(local);
          await this.storage.saveLearnerProgress(local, { silent: true });
        }
      }

      // 3) Active days: union into the local calendar log.
      if ((state.active_days ?? []).length > 0) {
        const log = this.loadActiveDaysLog();
        for (const d of state.active_days) {
          if (!log[d.day]) log[d.day] = d.source || 'lesson';
        }
        this.saveActiveDaysLog(log);
      }

      // 4) Workbench: LWW by revision, per kind. Compared against the
      // meta snapshot from BEFORE this response was recorded.
      const meta = preMeta ?? this.loadMeta();
      for (const w of state.workbench ?? []) {
        if (w.revision <= (meta.workbenchRevisions[w.kind] ?? 0)) continue;
        if (w.kind === 'journalizer') {
          const payload = w.payload as Parameters<typeof this.storage.saveWorkbenchState>[0];
          if (payload) await this.storage.saveWorkbenchState(payload, { silent: true });
        } else if (w.kind === 'cogs') {
          await this.storage.saveCogsState(w.payload as never, { silent: true });
        }
      }
    } catch {
      /* applying remote state must never break the app */
    } finally {
      this.applyingRemote = false;
    }
  }

  /** Rebuilds a local MilestoneAssessmentResult from a sync entity. */
  private restoreAttempt(entity: SyncAttemptEntity): MilestoneAssessmentLike | null {
    try {
      const answers =
        entity.answers && typeof entity.answers === 'object'
          ? (entity.answers as { original_result?: MilestoneAssessmentLike })
          : {};
      if (answers.original_result?.attemptTimestamp) {
        return { ...answers.original_result, attemptId: entity.id };
      }
      return {
        milestoneDay: entity.milestone_day,
        score: entity.score,
        passed: entity.passed,
        proficiencyTier: entity.passed ? 'proficient' : 'developing',
        attemptTimestamp: entity.attempt_ts,
        attemptId: entity.id,
      };
    } catch {
      return null;
    }
  }
}

/** App-wide singleton. */
export const syncService = new SyncService();
