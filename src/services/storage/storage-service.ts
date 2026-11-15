import { IStorageAdapter, BackupData } from '@/types/storage';
import { AccountingRegime } from '@/types/coa';
import { LearnerProgress } from '@/types/curriculum';
import { StreakEngine, StreakState } from '@/engine/streak-engine';
import { LocalStorageAdapter } from './local-storage-adapter';
import {
  IndexedDbAdapter,
  WorkbenchState,
  JournalEntry,
  LedgerAccount,
} from './indexeddb-adapter';
import { CogsState } from '@/types/cogs';
import { getDeviceId, getEntityUuid } from '@/services/auth/device';

export type { WorkbenchState, JournalEntry, LedgerAccount, CogsState };

/**
 * Storage keys whose payloads participate in cloud sync (P1). Writes to
 * these keys are annotated with sync metadata (device_id, entity_uuid,
 * updated_at — backward compatible: readers ignore unknown fields) and
 * published to sync listeners.
 */
export const SYNCED_KEYS = new Set<string>([
  'learner_progress',
  'milestone_scores',
  'user_streak_state',
  'workbench_state',
  'cogs_state',
]);

export type StorageChangeListener = (key: string) => void;

/**
 * Sync metadata fields added to stored payloads of synced keys on write.
 * They are stripped again on read through this facade so application data
 * round-trips byte-identically (FEAT-06 100% fidelity invariant) while the
 * stored record still carries device/entity forensics for the sync layer.
 */
export const SYNC_META_FIELDS = ['device_id', 'entity_uuid', 'updated_at'] as const;

function stripSyncMeta<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  const clone = { ...(value as Record<string, unknown>) };
  for (const f of SYNC_META_FIELDS) delete clone[f];
  return clone as T;
}

export class StorageService implements IStorageAdapter {
  private localAdapter: LocalStorageAdapter;
  private idbAdapter: IndexedDbAdapter;
  private syncListeners = new Set<StorageChangeListener>();

  constructor() {
    this.localAdapter = new LocalStorageAdapter('vnacc_');
    this.idbAdapter = new IndexedDbAdapter();
  }

  /**
   * Subscribe to writes of synced keys (used by the sync service to
   * schedule pushes). Returns an unsubscribe function.
   */
  subscribeChanges(listener: StorageChangeListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notify(key: string): void {
    if (!SYNCED_KEYS.has(key)) return;
    for (const listener of this.syncListeners) {
      try {
        listener(key);
      } catch {
        /* listener errors never break storage writes */
      }
    }
  }

  /**
   * Adds sync metadata to object payloads of synced keys without mutating
   * the caller's object. Extra fields are backward compatible: every
   * reader of these keys only looks at the fields it knows, so the
   * FEAT-06 backup round-trip fidelity is preserved.
   */
  private annotate<T>(key: string, value: T): T {
    if (!SYNCED_KEYS.has(key) || value === null || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }
    return {
      ...(value as Record<string, unknown>),
      device_id: getDeviceId(),
      entity_uuid: getEntityUuid(key),
      updated_at: new Date().toISOString(),
    } as T;
  }

  // Delegate default IStorageAdapter methods to IndexedDB (with LocalStorage fallback)
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const idbVal = await this.idbAdapter.getItem<T>(key);
      if (idbVal !== null) return this.stripIfSynced(key, idbVal);
      return this.stripIfSynced(key, await this.localAdapter.getItem<T>(key));
    } catch {
      return this.stripIfSynced(key, await this.localAdapter.getItem<T>(key));
    }
  }

  private stripIfSynced<T>(key: string, value: T): T {
    if (SYNCED_KEYS.has(key)) return stripSyncMeta(value);
    return value;
  }

  async setItem<T>(key: string, value: T, opts: { silent?: boolean } = {}): Promise<void> {
    const annotated = this.annotate(key, value);
    try {
      await this.idbAdapter.setItem<T>(key, annotated);
    } catch {
      // If IndexedDB fails or unavailable, write to LocalStorage
      await this.localAdapter.setItem<T>(key, annotated);
    }
    if (!opts.silent) this.notify(key);
  }

  async removeItem(key: string): Promise<void> {
    await Promise.all([
      this.idbAdapter.removeItem(key),
      this.localAdapter.removeItem(key),
    ]);
  }

  // --- Learner Progress Persistence ---
  async getLearnerProgress(): Promise<LearnerProgress | null> {
    return await this.getItem<LearnerProgress>('learner_progress');
  }

  /**
   * silent=true writes the synced payload WITHOUT notifying sync listeners
   * (used when applying canonical server state, to avoid push loops).
   */
  async saveLearnerProgress(progress: LearnerProgress, opts: { silent?: boolean } = {}): Promise<void> {
    await this.setItem<LearnerProgress>('learner_progress', progress, opts);
  }

  // --- Streak & Continuity Persistence ---
  async getStreakState(): Promise<StreakState> {
    return await StreakEngine.loadStreakState(this);
  }

  async recordStreakActivity(customDateStr?: string): Promise<{ state: StreakState; freezeUsed: boolean; incremented: boolean }> {
    return await StreakEngine.recordActivity(this, customDateStr);
  }

  // --- Specialized Setting Methods (LocalStorage for instantaneous sync) ---
  async getTheme(): Promise<'light' | 'dark' | 'system'> {
    const val = await this.localAdapter.getItem<'light' | 'dark' | 'system'>('theme');
    return val || 'system';
  }

  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.localAdapter.setItem('theme', theme);
  }

  async getPreferredRegime(): Promise<AccountingRegime> {
    const val = await this.localAdapter.getItem<AccountingRegime>('preferred_regime');
    return val || 'CIRCULAR_200';
  }

  async setPreferredRegime(regime: AccountingRegime): Promise<void> {
    await this.localAdapter.setItem('preferred_regime', regime);
  }

  // --- Workbench State Persistence (Milestone 3 / Offline-First) ---
  async loadWorkbenchState(): Promise<WorkbenchState> {
    try {
      const raw = await this.getItem<WorkbenchState>('workbench_state');
      if (!raw) {
        return {
          postedEntries: [],
          ledgerTAccounts: {},
          completedVoucherCases: [],
          voucherCompletedCases: [],
          voucherScores: {},
        };
      }
      const completed = raw.completedVoucherCases || raw.voucherCompletedCases || [];
      return {
        postedEntries: Array.isArray(raw.postedEntries) ? raw.postedEntries : [],
        ledgerTAccounts:
          raw.ledgerTAccounts && typeof raw.ledgerTAccounts === 'object'
            ? raw.ledgerTAccounts
            : {},
        completedVoucherCases: completed,
        voucherCompletedCases: completed,
        voucherScores:
          raw.voucherScores && typeof raw.voucherScores === 'object'
            ? raw.voucherScores
            : {},
      };
    } catch (err) {
      console.error('[StorageService] Error loading workbench state:', err);
      return {
        postedEntries: [],
        ledgerTAccounts: {},
        completedVoucherCases: [],
        voucherCompletedCases: [],
        voucherScores: {},
      };
    }
  }

  async saveWorkbenchState(state: Partial<WorkbenchState>, opts: { silent?: boolean } = {}): Promise<boolean> {
    try {
      const current = await this.loadWorkbenchState();
      const completed =
        state.completedVoucherCases ??
        state.voucherCompletedCases ??
        current.completedVoucherCases;
      const merged: WorkbenchState = {
        ...current,
        ...state,
        completedVoucherCases: completed,
        voucherCompletedCases: completed,
        postedEntries: state.postedEntries ?? current.postedEntries,
        ledgerTAccounts: state.ledgerTAccounts ?? current.ledgerTAccounts,
        voucherScores: state.voucherScores ?? current.voucherScores,
      };
      await this.setItem<WorkbenchState>('workbench_state', merged, opts);
      return true;
    } catch (err) {
      console.error('[StorageService] Error saving workbench state:', err);
      return false;
    }
  }

  // --- COGS & Cost Accounting Workbench State Persistence (Milestone 5) ---
  async loadCogsState(): Promise<CogsState | null> {
    try {
      return await this.getItem<CogsState>('cogs_state');
    } catch (err) {
      console.error('[StorageService] Error loading cogs state:', err);
      return null;
    }
  }

  async saveCogsState(state: CogsState, opts: { silent?: boolean } = {}): Promise<boolean> {
    try {
      await this.setItem<CogsState>('cogs_state', state, opts);
      return true;
    } catch (err) {
      console.error('[StorageService] Error saving cogs state:', err);
      return false;
    }
  }

  // --- Unified 1-Click Backup Export & Import ---
  async exportBackup(): Promise<string> {
    const localKeys = await this.localAdapter.getAllKeys();
    const idbKeys = await this.idbAdapter.getAllKeys();

    const localData: Record<string, unknown> = {};
    for (const key of localKeys) {
      // Sync metadata is stripped: application data round-trips 100%
      // (FEAT-06) and is re-annotated on the next write.
      localData[key] = SYNCED_KEYS.has(key)
        ? stripSyncMeta(await this.localAdapter.getItem(key))
        : await this.localAdapter.getItem(key);
    }

    const idbData: Record<string, unknown> = {};
    for (const key of idbKeys) {
      idbData[key] = SYNCED_KEYS.has(key)
        ? stripSyncMeta(await this.idbAdapter.getItem(key))
        : await this.idbAdapter.getItem(key);
    }

    const theme = (await this.getTheme()) as 'light' | 'dark' | 'system';
    const regime = await this.getPreferredRegime();

    const backupPayload: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      app: 'vietnam-accounting-learning-web',
      theme,
      regime,
      progress: (idbData['learner_progress'] as Record<string, unknown>) || {},
      assessmentResults: (idbData['milestone_scores'] as Record<string, unknown>) || {},
      customData: {
        localStorage: localData,
        indexedDb: idbData,
      },
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  async importBackup(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString) as BackupData;
      if (!parsed || parsed.app !== 'vietnam-accounting-learning-web') {
        throw new Error('Tệp sao lưu không đúng định dạng của ứng dụng.');
      }

      if (parsed.theme) {
        await this.setTheme(parsed.theme);
      }
      if (parsed.regime) {
        await this.setPreferredRegime(parsed.regime);
      }

      if (parsed.customData) {
        const custom = parsed.customData as {
          localStorage?: Record<string, unknown>;
          indexedDb?: Record<string, unknown>;
        };

        if (custom.localStorage) {
          for (const [k, v] of Object.entries(custom.localStorage)) {
            await this.localAdapter.setItem(k, v);
          }
        }

        if (custom.indexedDb) {
          for (const [k, v] of Object.entries(custom.indexedDb)) {
            await this.idbAdapter.setItem(k, v);
          }
        }
      }

      if (parsed.progress) {
        await this.idbAdapter.setItem('learner_progress', parsed.progress);
      }

      if (parsed.assessmentResults) {
        await this.idbAdapter.setItem('milestone_scores', parsed.assessmentResults);
      }

      return true;
    } catch (err) {
      console.error('[StorageService] Failed to import backup:', err);
      return false;
    }
  }

  downloadBackup(jsonString: string, filename?: string): void {
    if (typeof window === 'undefined' || !window.document) return;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = filename || `vnacc-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const storageService = new StorageService();
