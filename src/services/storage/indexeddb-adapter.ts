import { openDB, IDBPDatabase } from 'idb';
import { IStorageAdapter, BackupData } from '@/types/storage';
import { CogsState } from '@/types/cogs';

const DB_NAME = 'VietnamAccountingLearningDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

export interface JournalEntry {
  id?: string;
  timestamp?: string;
  descriptionVi?: string;
  rows?: any[];
  totalAmount?: number;
  regime?: string;
  accountCode?: string;
  accountNameVi?: string;
  debitAmount?: number;
  creditAmount?: number;
  noteVi?: string;
  [key: string]: any;
}

export interface LedgerAccount {
  accountCode?: string;
  accountNameVi?: string;
  debitTotal?: number;
  creditTotal?: number;
  closingDebit?: number;
  closingCredit?: number;
  entries?: any[];
  [key: string]: any;
}

export interface WorkbenchState {
  postedEntries: JournalEntry[];
  ledgerTAccounts: Record<string, LedgerAccount>;
  completedVoucherCases: string[];
  voucherCompletedCases?: string[];
  voucherScores?: Record<string, number>;
  [key: string]: any;
}

export class IndexedDbAdapter implements IStorageAdapter {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private async getDb(): Promise<IDBPDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.dbPromise;
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDb();
      if (!db) return null;
      const val = await db.get(STORE_NAME, key);
      return val !== undefined ? (val as T) : null;
    } catch (err) {
      console.error(`[IndexedDbAdapter] Error getting key ${key}:`, err);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDb();
      if (!db) return;
      await db.put(STORE_NAME, value, key);
    } catch (err) {
      console.error(`[IndexedDbAdapter] Error setting key ${key}:`, err);
      throw err;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDb();
      if (!db) return;
      await db.delete(STORE_NAME, key);
    } catch (err) {
      console.error(`[IndexedDbAdapter] Error removing key ${key}:`, err);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.getDb();
      if (!db) return [];
      const keys = await db.getAllKeys(STORE_NAME);
      return keys.map((k) => String(k));
    } catch (err) {
      console.error('[IndexedDbAdapter] Error getting all keys:', err);
      return [];
    }
  }

  async clearAll(): Promise<void> {
    try {
      const db = await this.getDb();
      if (!db) return;
      await db.clear(STORE_NAME);
    } catch (err) {
      console.error('[IndexedDbAdapter] Error clearing store:', err);
    }
  }

  async exportBackup(): Promise<string> {
    const keys = await this.getAllKeys();
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = await this.getItem(key);
    }

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      app: 'vietnam-accounting-learning-web',
      customData: data,
    };

    return JSON.stringify(backup, null, 2);
  }

  async importBackup(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString) as BackupData;
      if (!parsed || !parsed.app || parsed.app !== 'vietnam-accounting-learning-web') {
        throw new Error('Định dạng file sao lưu không hợp lệ.');
      }

      if (parsed.customData && typeof parsed.customData === 'object' && !Array.isArray(parsed.customData)) {
        for (const [key, value] of Object.entries(parsed.customData)) {
          await this.setItem(key, value);
        }
      }

      return true;
    } catch (err) {
      console.error('[IndexedDbAdapter] Import failed:', err);
      return false;
    }
  }

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
      console.error('[IndexedDbAdapter] Error loading workbench state:', err);
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
      console.error('[IndexedDbAdapter] Error saving workbench state:', err);
      return false;
    }
  }

  async loadCogsState(): Promise<CogsState | null> {
    try {
      return await this.getItem<CogsState>('cogs_state');
    } catch (err) {
      console.error('[IndexedDbAdapter] Error loading cogs state:', err);
      return null;
    }
  }

  async saveCogsState(state: CogsState): Promise<boolean> {
    try {
      await this.setItem<CogsState>('cogs_state', state);
      return true;
    } catch (err) {
      console.error('[IndexedDbAdapter] Error saving cogs state:', err);
      return false;
    }
  }
}


