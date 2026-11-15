// Auth & sync shared types (P1). Server contract lives in
// server/internal/{account,sync}; keep both sides in sync when editing.

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  scope?: string;
}

/** One device grant from GET /me/sessions. */
export interface DeviceSession {
  id: string;
  device_id: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  current: boolean;
}

/** Entity kinds of the per-entity sync. */
export type SyncEntityKind = 'progress' | 'attempts' | 'active_days' | 'workbench';

/** learning_progress canonical entity (milestone day -> highest score). */
export interface SyncProgressEntity {
  completed_days: number[];
  milestone_scores: Record<string, number>;
  current_day: number;
  regime: string;
  revision: number;
  device_id?: string;
  updated_at?: string;
}

/** test_attempts canonical entity (append-only, union by id). */
export interface SyncAttemptEntity {
  id: string;
  milestone_day: number;
  answers?: unknown;
  score: number;
  passed: boolean;
  dok_breakdown?: unknown;
  item_results?: unknown;
  attempt_ts: string;
  device_id?: string;
}

/** active_days canonical entity (VN calendar day of activity). */
export interface SyncActiveDayEntity {
  day: string; // YYYY-MM-DD
  source?: string;
}

export type WorkbenchKind = 'journalizer' | 'cogs';

/** workbench_snapshots canonical entity (LWW on revision). */
export interface SyncWorkbenchEntity {
  id?: string;
  kind: WorkbenchKind;
  payload: unknown;
  revision: number;
  device_id?: string;
  updated_at?: string;
}

/** Canonical full state returned by push / merge-anonymous / export. */
export interface SyncState {
  cursor: number;
  progress: SyncProgressEntity | null;
  attempts: SyncAttemptEntity[];
  active_days: SyncActiveDayEntity[];
  workbench: SyncWorkbenchEntity[];
}

/** Pull result: only entities changed after the cursor. */
export type SyncPullResponse = SyncState;
export type SyncPushResponse = SyncState;

/** Client-side pull cursor (server-assigned seq, opaque, monotonic). */
export interface SyncCursor {
  value: number;
}

/** Local sync bookkeeping (localStorage), not synced itself. */
export interface SyncMeta {
  cursor: number;
  progressRevision: number;
  workbenchRevisions: Partial<Record<WorkbenchKind, number>>;
}

/** Snapshot of anonymous local data sent to /sync/merge-anonymous. */
export interface AnonymousSnapshot {
  device_id: string;
  progress: {
    completed_days: number[];
    milestone_scores: Record<string, number>;
    current_day: number;
    regime: string;
    revision: number;
  };
  attempts: SyncAttemptEntity[];
  active_days: SyncActiveDayEntity[];
  workbench: SyncWorkbenchEntity[];
}
