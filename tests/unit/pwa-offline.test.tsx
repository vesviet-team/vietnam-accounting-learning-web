import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { storageService, StorageService } from '@/services/storage/storage-service';
import { IndexedDbAdapter } from '@/services/storage/indexeddb-adapter';
import { Journalizer } from '@/components/workbench/Journalizer';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';

describe('R3: PWA & Offline-First Storage Test Suite', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(async () => {
    window.localStorage.clear();
    // Clear workbench state in storageService before each test
    await storageService.saveWorkbenchState({
      postedEntries: [],
      ledgerTAccounts: {},
      completedVoucherCases: [],
      voucherScores: {},
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
      writable: true,
    });
  });

  // =========================================================================
  // 1. Web App Manifest Verification
  // =========================================================================
  describe('1. Web App Manifest (public/manifest.json)', () => {
    it('should exist and be valid JSON with required PWA metadata', () => {
      const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);

      // Verify essential PWA manifest properties
      expect(manifest.name).toBe('Học Kế Toán Việt Nam 30 Ngày — Chế độ TT 200 & TT 133');
      expect(manifest.short_name).toBe('KếToánVN30');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#0284c7');
      expect(manifest.background_color).toBe('#0f172a');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);

      // Verify icon specifications
      const icon = manifest.icons[0];
      expect(icon.src).toBeDefined();
      expect(icon.sizes).toContain('192x192');
      expect(icon.sizes).toContain('512x512');
    });

    it('should be correctly linked in index.html with theme-color meta tag', () => {
      const htmlPath = path.resolve(process.cwd(), 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);

      const html = fs.readFileSync(htmlPath, 'utf-8');
      expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
      expect(html).toContain('<meta name="theme-color" content="#0284c7" />');
    });
  });

  // =========================================================================
  // 2. Service Worker Verification (public/sw.js)
  // =========================================================================
  describe('2. Service Worker Implementation (public/sw.js)', () => {
    it('should exist and define W3C Service Worker lifecycle handlers and strategies', () => {
      const swPath = path.resolve(process.cwd(), 'public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Verify W3C lifecycle events
      expect(swContent).toContain("addEventListener('install'");
      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain("addEventListener('fetch'");

      // Verify App Shell pre-caching
      expect(swContent).toContain('/index.html');
      expect(swContent).toContain('/manifest.json');
      expect(swContent).toContain('APP_SHELL_ASSETS');

      // Verify external Google Fonts caching
      expect(swContent).toContain('fonts.googleapis.com');
      expect(swContent).toContain('fonts.gstatic.com');

      // Verify cache cleanup of outdated caches
      expect(swContent).toContain('caches.delete');

      // Verify offline fallback
      expect(swContent).toContain('caches.match');
    });

    it('should be registered in src/main.tsx in browser environment', () => {
      const mainPath = path.resolve(process.cwd(), 'src/main.tsx');
      const mainContent = fs.readFileSync(mainPath, 'utf-8');

      expect(mainContent).toContain("'serviceWorker' in navigator");
      expect(mainContent).toMatch(/navigator\.serviceWorker\s*\.register\(['"]\/sw\.js['"]\)/);
    });
  });

  // =========================================================================
  // 3. Storage Service & IndexedDbAdapter Workbench State
  // =========================================================================
  describe('3. Storage Service Workbench State Persistence in IndexedDB', () => {
    it('should return empty default state when no workbench data is stored', async () => {
      // Clear key directly
      await storageService.removeItem('workbench_state');

      const state = await storageService.loadWorkbenchState();
      expect(state).toBeDefined();
      expect(state.postedEntries).toEqual([]);
      expect(state.ledgerTAccounts).toEqual({});
      expect(state.completedVoucherCases).toEqual([]);
    });

    it('should save and load partial workbench state into IndexedDB with exact fidelity', async () => {
      const sampleEntry = {
        id: 'pe-test-1',
        timestamp: '10:00:00',
        descriptionVi: 'Rút tiền gửi nhập quỹ tiền mặt',
        rows: [
          {
            id: 'row-1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: 50000000,
            creditAmount: 0,
          },
          {
            id: 'row-2',
            accountCode: '1121',
            accountNameVi: 'Tiền gửi NH',
            debitAmount: 0,
            creditAmount: 50000000,
          },
        ],
        totalAmount: 50000000,
        regime: 'CIRCULAR_200',
      };

      const sampleLedger = {
        '1111': {
          accountCode: '1111',
          accountNameVi: 'Tiền mặt',
          entries: [{ id: 'e1', description: 'Rút TGNH', amount: 50000000, side: 'DEBIT' }],
        },
      };

      const saveSuccess = await storageService.saveWorkbenchState({
        postedEntries: [sampleEntry],
        ledgerTAccounts: sampleLedger,
        completedVoucherCases: ['case-01', 'case-02'],
      });

      expect(saveSuccess).toBe(true);

      const loaded = await storageService.loadWorkbenchState();
      expect(loaded.postedEntries.length).toBe(1);
      expect(loaded.postedEntries[0].id).toBe('pe-test-1');
      expect(loaded.postedEntries[0].totalAmount).toBe(50000000);
      expect(loaded.ledgerTAccounts['1111']).toBeDefined();
      expect(loaded.ledgerTAccounts['1111'].accountNameVi).toBe('Tiền mặt');
      expect(loaded.completedVoucherCases).toEqual(['case-01', 'case-02']);
    });

    it('should support incremental updates to workbench state without overwriting unaffected fields', async () => {
      // Step 1: Save initial posted entries
      await storageService.saveWorkbenchState({
        postedEntries: [{ id: 'entry-alpha', descriptionVi: 'Alpha' }],
        completedVoucherCases: ['case-01'],
      });

      // Step 2: Update only completed voucher cases
      await storageService.saveWorkbenchState({
        completedVoucherCases: ['case-01', 'case-02', 'case-03'],
      });

      // Verify postedEntries was retained
      const loaded = await storageService.loadWorkbenchState();
      expect(loaded.postedEntries.length).toBe(1);
      expect(loaded.postedEntries[0].id).toBe('entry-alpha');
      expect(loaded.completedVoucherCases).toEqual(['case-01', 'case-02', 'case-03']);
    });

    it('IndexedDbAdapter directly saves and loads workbench state', async () => {
      const adapter = new IndexedDbAdapter();
      await adapter.saveWorkbenchState({
        completedVoucherCases: ['case-idb-direct'],
        postedEntries: [{ id: 'entry-direct' }],
      });

      const loaded = await adapter.loadWorkbenchState();
      expect(loaded.completedVoucherCases).toContain('case-idb-direct');
      expect(loaded.postedEntries.some((e) => e.id === 'entry-direct')).toBe(true);
    });
  });

  // =========================================================================
  // 4. Simulated Page Reload: Step A to Step B Persistence
  // =========================================================================
  describe('4. Simulated Page Reload (F5 Survival)', () => {
    it('recovers posted journal entries and ledger accounts after simulated page reload', async () => {
      // Step A: User posts journal entry into storage
      const entryA = {
        id: 'pe-simulated-f5',
        timestamp: '09:30:00',
        descriptionVi: 'Mua NVL nhập kho Hải Hà',
        rows: [
          {
            id: 'r1',
            accountCode: '152',
            accountNameVi: 'Nguyên liệu, vật liệu',
            debitAmount: 40000000,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1331',
            accountNameVi: 'Thuế GTGT đầu vào',
            debitAmount: 4000000,
            creditAmount: 0,
          },
          {
            id: 'r3',
            accountCode: '331',
            accountNameVi: 'Phải trả người bán',
            debitAmount: 0,
            creditAmount: 44000000,
          },
        ],
        totalAmount: 44000000,
        regime: 'CIRCULAR_200',
      };

      const ledgerA = {
        '152': {
          accountCode: '152',
          accountNameVi: 'Nguyên liệu, vật liệu',
          entries: [{ id: 'e1', description: 'Mua NVL', amount: 40000000, side: 'DEBIT' }],
        },
        '331': {
          accountCode: '331',
          accountNameVi: 'Phải trả người bán',
          entries: [{ id: 'e2', description: 'Công nợ Hải Hà', amount: 44000000, side: 'CREDIT' }],
        },
      };

      await storageService.saveWorkbenchState({
        postedEntries: [entryA],
        ledgerTAccounts: ledgerA,
      });

      // Step B: Simulate page reload by creating a brand new StorageService instance
      const newStorageInstance = new StorageService();
      const recoveredState = await newStorageInstance.loadWorkbenchState();

      expect(recoveredState.postedEntries.length).toBe(1);
      expect(recoveredState.postedEntries[0]?.descriptionVi).toBe('Mua NVL nhập kho Hải Hà');
      expect(recoveredState.postedEntries[0]?.rows?.length).toBe(3);
      expect(recoveredState.ledgerTAccounts['152']).toBeDefined();
      expect(recoveredState.ledgerTAccounts['331']).toBeDefined();

      // Step C: Render Journalizer and verify it restores the persisted entry on mount
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      await waitFor(() => {
        expect(screen.getByText('Mua NVL nhập kho Hải Hà')).toBeInTheDocument();
      });

      expect(screen.getByText(/1 bút toán đã ghi/i)).toBeInTheDocument();
    });

    it('recovers completed voucher audit cases after simulated page reload', async () => {
      // Step A: Save completed cases
      await storageService.saveWorkbenchState({
        completedVoucherCases: ['case-01-valid-cash', 'case-02-cash-20m-violation'],
        voucherScores: { 'case-01-valid-cash': 100, 'case-02-cash-20m-violation': 80 },
      });

      // Step B: Render VoucherInspector on fresh load
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      await waitFor(() => {
        expect(screen.getByText(/Đã hoàn thành:\s*2\s*\/\s*\d+/i)).toBeInTheDocument();
      });

      expect(screen.getByText('100đ')).toBeInTheDocument();
      expect(screen.getByText('80đ')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Offline Simulation (navigator.onLine = false)
  // =========================================================================
  describe('5. Offline Simulation (navigator.onLine = false)', () => {
    it('executes full save and load operations seamlessly when network is offline', async () => {
      // Simulate airplane mode / network disconnection
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });
      expect(navigator.onLine).toBe(false);

      const offlineEntry = {
        id: 'pe-offline-01',
        timestamp: '14:20:00',
        descriptionVi: 'Ghi sổ ngoại tuyến khi mất mạng',
        rows: [
          {
            id: 'r1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: 1000000,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '5111',
            accountNameVi: 'Doanh thu',
            debitAmount: 0,
            creditAmount: 1000000,
          },
        ],
        totalAmount: 1000000,
        regime: 'CIRCULAR_200',
      };

      // Writing to IndexedDB while offline must succeed
      const saved = await storageService.saveWorkbenchState({
        postedEntries: [offlineEntry],
        completedVoucherCases: ['case-offline'],
      });
      expect(saved).toBe(true);

      // Reading from IndexedDB while offline must succeed
      const loaded = await storageService.loadWorkbenchState();
      expect(loaded.postedEntries.length).toBe(1);
      expect(loaded.postedEntries[0].descriptionVi).toBe('Ghi sổ ngoại tuyến khi mất mạng');
      expect(loaded.completedVoucherCases).toContain('case-offline');
    });

    it('fallback to LocalStorage succeeds when IndexedDB throws or is unavailable while offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });

      // Write directly to LocalStorage with fallback key
      const fallbackPayload = {
        postedEntries: [{ id: 'local-fallback', descriptionVi: 'Fallback Offline' }],
        ledgerTAccounts: {},
        completedVoucherCases: ['case-local'],
      };
      window.localStorage.setItem('vnacc_workbench_state', JSON.stringify(fallbackPayload));

      // Mock IndexedDbAdapter getItem to return null to test fallback
      const mockStorage = new StorageService();
      vi.spyOn((mockStorage as any).idbAdapter, 'getItem').mockRejectedValueOnce(
        new Error('IndexedDB Unavailable')
      );

      const loaded = await mockStorage.loadWorkbenchState();
      expect(loaded.postedEntries[0]?.id).toBe('local-fallback');
      expect(loaded.completedVoucherCases).toContain('case-local');
    });
  });

  // =========================================================================
  // 6. 1-Click Backup Export & Import with Workbench State
  // =========================================================================
  describe('6. 1-Click Backup Integration with Workbench State', () => {
    it('exports and imports workbench state in unified JSON backup file', async () => {
      await storageService.saveWorkbenchState({
        postedEntries: [
          { id: 'backup-entry-1', descriptionVi: 'Bút toán cần sao lưu' },
        ],
        completedVoucherCases: ['case-01', 'case-05'],
      });

      const backupJson = await storageService.exportBackup();
      const parsed = JSON.parse(backupJson);

      expect(parsed.app).toBe('vietnam-accounting-learning-web');
      expect(parsed.customData?.indexedDb?.workbench_state).toBeDefined();

      // Clear state
      await storageService.saveWorkbenchState({
        postedEntries: [],
        completedVoucherCases: [],
      });

      // Import backup
      const importSuccess = await storageService.importBackup(backupJson);
      expect(importSuccess).toBe(true);

      const restored = await storageService.loadWorkbenchState();
      expect(restored.postedEntries.some((e) => e.id === 'backup-entry-1')).toBe(true);
      expect(restored.completedVoucherCases).toContain('case-05');
    });
  });
});
