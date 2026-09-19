import { IStorageAdapter, BackupData } from '@/types/storage';

export class LocalStorageAdapter implements IStorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'vnacc_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      const raw = window.localStorage.getItem(this.getKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[LocalStorageAdapter] Failed to parse key ${key}:`, err);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(this.getKey(key), serialized);
    } catch (err) {
      console.error(`[LocalStorageAdapter] Failed to set key ${key}:`, err);
      throw err;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      window.localStorage.removeItem(this.getKey(key));
    } catch (err) {
      console.error(`[LocalStorageAdapter] Failed to remove key ${key}:`, err);
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        keys.push(k.substring(this.prefix.length));
      }
    }
    return keys;
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
      console.error('[LocalStorageAdapter] Import failed:', err);
      return false;
    }
  }
}
