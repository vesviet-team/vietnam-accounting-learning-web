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

export type { WorkbenchState, JournalEntry, LedgerAccount };

export class StorageService implements IStorageAdapter {
  private localAdapter: LocalStorageAdapter;
  private idbAdapter: IndexedDbAdapter;

  constructor() {
    this.localAdapter = new LocalStorageAdapter('vnacc_');
    this.idbAdapter = new IndexedDbAdapter();
  }

  // Delegate default IStorageAdapter methods to IndexedDB (with LocalStorage fallback)
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const idbVal = await this.idbAdapter.getItem<T>(key);
      if (idbVal !== null) return idbVal;
      return await this.localAdapter.getItem<T>(key);
    } catch {
      return await this.localAdapter.getItem<T>(key);
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await this.idbAdapter.setItem<T>(key, value);
    } catch {
      // If IndexedDB fails or unavailable, write to LocalStorage
      await this.localAdapter.setItem<T>(key, value);
    }
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

  async saveLearnerProgress(progress: LearnerProgress): Promise<void> {
    await this.setItem<LearnerProgress>('learner_progress', progress);
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

  async saveWorkbenchState(state: Partial<WorkbenchState>): Promise<boolean> {
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
      await this.setItem<WorkbenchState>('workbench_state', merged);
      return true;
    } catch (err) {
      console.error('[StorageService] Error saving workbench state:', err);
      return false;
    }
  }

  // --- Unified 1-Click Backup Export & Import ---
  async exportBackup(): Promise<string> {
    const localKeys = await this.localAdapter.getAllKeys();
    const idbKeys = await this.idbAdapter.getAllKeys();

    const localData: Record<string, unknown> = {};
    for (const key of localKeys) {
      localData[key] = await this.localAdapter.getItem(key);
    }

    const idbData: Record<string, unknown> = {};
    for (const key of idbKeys) {
      idbData[key] = await this.idbAdapter.getItem(key);
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
