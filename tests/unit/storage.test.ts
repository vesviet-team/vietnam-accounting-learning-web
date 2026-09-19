import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { IndexedDbAdapter } from '@/services/storage/indexeddb-adapter';
import { StorageService } from '@/services/storage/storage-service';
import { BackupData } from '@/types/storage';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter('test_vnacc_');
  });

  it('should set, get and remove item correctly', async () => {
    await adapter.setItem('sample_key', { score: 95, passed: true });
    const val = await adapter.getItem<{ score: number; passed: boolean }>('sample_key');

    expect(val).toEqual({ score: 95, passed: true });

    await adapter.removeItem('sample_key');
    const afterRemove = await adapter.getItem('sample_key');
    expect(afterRemove).toBeNull();
  });

  it('should export and import backup accurately', async () => {
    await adapter.setItem('setting_theme', 'dark');
    await adapter.setItem('user_level', 'advance');

    const backupJson = await adapter.exportBackup();
    expect(backupJson).toBeDefined();

    const parsed = JSON.parse(backupJson) as BackupData;
    expect(parsed.app).toBe('vietnam-accounting-learning-web');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.customData).toHaveProperty('setting_theme', 'dark');

    // Clear and import
    localStorage.clear();
    const imported = await adapter.importBackup(backupJson);
    expect(imported).toBe(true);

    const restoredTheme = await adapter.getItem('setting_theme');
    expect(restoredTheme).toBe('dark');
  });

  it('should fail gracefully on invalid JSON backup', async () => {
    const success = await adapter.importBackup('invalid-json');
    expect(success).toBe(false);

    const fakeAppBackup = JSON.stringify({ app: 'wrong-app' });
    const successWrongApp = await adapter.importBackup(fakeAppBackup);
    expect(successWrongApp).toBe(false);
  });
});

describe('IndexedDbAdapter', () => {
  let idbAdapter: IndexedDbAdapter;

  beforeEach(async () => {
    idbAdapter = new IndexedDbAdapter();
    await idbAdapter.clearAll();
  });

  it('should store and retrieve objects in IndexedDB', async () => {
    const testData = {
      currentDay: 3,
      scores: [80, 90, 100],
      streak: 5,
    };

    await idbAdapter.setItem('learner_progress', testData);
    const retrieved = await idbAdapter.getItem<typeof testData>('learner_progress');

    expect(retrieved).toEqual(testData);

    await idbAdapter.removeItem('learner_progress');
    const afterDelete = await idbAdapter.getItem('learner_progress');
    expect(afterDelete).toBeNull();
  });

  it('should export and import IndexedDB state', async () => {
    await idbAdapter.setItem('quiz_day_3', { score: 100, passed: true });
    await idbAdapter.setItem('quiz_day_6', { score: 85, passed: true });

    const backupStr = await idbAdapter.exportBackup();
    const backupObj = JSON.parse(backupStr) as BackupData;

    expect(backupObj.app).toBe('vietnam-accounting-learning-web');
    expect(backupObj.customData).toHaveProperty('quiz_day_3');

    await idbAdapter.clearAll();
    const beforeImport = await idbAdapter.getItem('quiz_day_3');
    expect(beforeImport).toBeNull();

    const ok = await idbAdapter.importBackup(backupStr);
    expect(ok).toBe(true);

    const afterImport = await idbAdapter.getItem('quiz_day_3');
    expect(afterImport).toEqual({ score: 100, passed: true });
  });
});

describe('Unified StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    service = new StorageService();
  });

  it('should set and get theme preference', async () => {
    await service.setTheme('dark');
    const theme = await service.getTheme();
    expect(theme).toBe('dark');
  });

  it('should set and get preferred accounting regime', async () => {
    await service.setPreferredRegime('CIRCULAR_133');
    const regime = await service.getPreferredRegime();
    expect(regime).toBe('CIRCULAR_133');
  });

  it('unified exportBackup and importBackup should roundtrip complete state', async () => {
    await service.setTheme('light');
    await service.setPreferredRegime('CIRCULAR_200');
    await service.setItem('learner_progress', {
      currentDay: 7,
      unlockedDays: [1, 2, 3, 4, 5, 6, 7],
      completedDays: [1, 2, 3],
      milestoneScores: { 3: 85, 6: 90 },
      streakDays: 4,
      lastActiveDate: '2026-09-13',
    });

    const backupJson = await service.exportBackup();
    const parsedBackup = JSON.parse(backupJson) as BackupData;

    expect(parsedBackup.app).toBe('vietnam-accounting-learning-web');
    expect(parsedBackup.theme).toBe('light');
    expect(parsedBackup.regime).toBe('CIRCULAR_200');

    // Reset local data
    localStorage.clear();

    const importResult = await service.importBackup(backupJson);
    expect(importResult).toBe(true);

    const restoredRegime = await service.getPreferredRegime();
    expect(restoredRegime).toBe('CIRCULAR_200');
  });
});
