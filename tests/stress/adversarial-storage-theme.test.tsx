import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { IndexedDbAdapter } from '@/services/storage/indexeddb-adapter';
import { StorageService } from '@/services/storage/storage-service';
import { BackupData } from '@/types/storage';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// Mock matchMedia for jsdom with dynamic getter
function setupMatchMedia(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set<(e: { matches: boolean }) => void>();

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') listeners.add(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') listeners.delete(cb);
    }),
    dispatchEvent: vi.fn(),
  }));

  return {
    setMatches: (newMatches: boolean) => {
      matches = newMatches;
      listeners.forEach((cb) => cb({ matches: newMatches }));
    },
    getListenerCount: () => listeners.size,
  };
}

describe('BATTERY 1: Storage Adapter Fuzzing, Schema Validation & Injection Attacks', () => {
  let localAdapter: LocalStorageAdapter;
  let idbAdapter: IndexedDbAdapter;
  let storageService: StorageService;

  beforeEach(async () => {
    localStorage.clear();
    localAdapter = new LocalStorageAdapter('stress_vnacc_');
    idbAdapter = new IndexedDbAdapter();
    await idbAdapter.clearAll();
    storageService = new StorageService();
  });

  afterEach(async () => {
    localStorage.clear();
    await idbAdapter.clearAll();
  });

  describe('1.1 Malformed and Corrupted JSON Payloads', () => {
    const malformedSyntaxPayloads = [
      { name: 'Empty string', payload: '' },
      { name: 'Whitespace only', payload: '   ' },
      { name: 'Literal null', payload: 'null' },
      { name: 'Undefined string', payload: 'undefined' },
      { name: 'Boolean true', payload: 'true' },
      { name: 'Number literal', payload: '12345' },
      { name: 'Truncated JSON', payload: '{"app": "vietnam-accounting-learning-web"' },
      { name: 'Unfinished key', payload: '{"app": "vietnam-accounting-learning-web", "ver' },
      { name: 'Syntax error closing', payload: '{"app": "vietnam-accounting-learning-web", ]}' },
      { name: 'Trailing null byte', payload: '{"app": "vietnam-accounting-learning-web"}\x00' },
      { name: 'Non-JSON XML', payload: '<!-- XML Payload -->' },
      { name: 'Non-string app field', payload: '{"app": 42}' },
      { name: 'Null app field', payload: '{"app": null}' },
      { name: 'Empty array', payload: '[]' },
      { name: 'Array of numbers', payload: '[1, 2, 3]' },
    ];

    malformedSyntaxPayloads.forEach(({ name, payload }, index) => {
      it(`should safely reject syntax malformation #${index + 1} (${name}) without unhandled exception`, async () => {
        const localResult = await localAdapter.importBackup(payload);
        expect(localResult).toBe(false);

        const idbResult = await idbAdapter.importBackup(payload);
        expect(idbResult).toBe(false);

        const serviceResult = await storageService.importBackup(payload);
        expect(serviceResult).toBe(false);
      });
    });

    it('1.1.16: safely guards against schema type vulnerability when customData is a primitive string', async () => {
      // Corrupted schema: valid app, but customData is a string instead of an object map
      const payload = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        customData: 'string_instead_of_object',
      });

      const localResult = await localAdapter.importBackup(payload);
      expect(localResult).toBe(true);

      // Verify that character indices '0', '1' are NOT polluted into LocalStorage
      const key0 = await localAdapter.getItem('0');
      expect(key0).toBeNull();
      const key1 = await localAdapter.getItem('1');
      expect(key1).toBeNull();
    });

    it('1.1.17: safely guards against array customData pollution in LocalStorageAdapter', async () => {
      const payload = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        customData: ['item_a', 'item_b'],
      });

      const localResult = await localAdapter.importBackup(payload);
      expect(localResult).toBe(true);

      // Verify that array indices '0', '1' are NOT polluted into LocalStorage
      const val0 = await localAdapter.getItem('0');
      expect(val0).toBeNull();
      const val1 = await localAdapter.getItem('1');
      expect(val1).toBeNull();
    });
  });

  describe('1.2 Schema Validation & Foreign App Rejection', () => {
    it('should strictly reject backup payloads originating from other applications', async () => {
      const foreignApps = [
        'vietnam-tax-simulator',
        'misa-amis-export-web',
        'random-hacker-app',
        '',
        'VIETNAM-ACCOUNTING-LEARNING-WEB', // Case-sensitivity test
      ];

      for (const foreignApp of foreignApps) {
        const payload = JSON.stringify({
          app: foreignApp,
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          customData: { key: 'val' },
        });

        const localRes = await localAdapter.importBackup(payload);
        expect(localRes).toBe(false);

        const idbRes = await idbAdapter.importBackup(payload);
        expect(idbRes).toBe(false);

        const serviceRes = await storageService.importBackup(payload);
        expect(serviceRes).toBe(false);
      }
    });

    it('should safely handle missing optional fields (sparse valid schema)', async () => {
      const sparsePayload = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        // version, exportedAt, theme, regime, progress all omitted
      });

      const res = await storageService.importBackup(sparsePayload);
      expect(res).toBe(true);
    });

    it('should tolerate unexpected theme or regime values without throwing', async () => {
      const payloadWithUnknownEnum = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        theme: 'neon-cyberpunk', // not in 'light' | 'dark' | 'system'
        regime: 'CIRCULAR_999',  // not in 'CIRCULAR_133' | 'CIRCULAR_200'
      });

      const res = await storageService.importBackup(payloadWithUnknownEnum);
      expect(res).toBe(true);

      // Verify getTheme falls back safely or returns saved value without crashing
      const theme = await storageService.getTheme();
      expect(theme).toBe('neon-cyberpunk');

      // Verify preferred regime lookup does not throw
      const regime = await storageService.getPreferredRegime();
      expect(regime).toBe('CIRCULAR_999');
    });
  });

  describe('1.3 Injection Attacks & Prototype Pollution Guard', () => {
    it('should prevent prototype pollution through __proto__ and constructor keys', async () => {
      const pollutionPayload = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        __proto__: { polluted: 'CRITICAL_VULNERABILITY' },
        customData: {
          localStorage: {
            '__proto__.polluted': 'attack_1',
            'constructor.prototype.polluted': 'attack_2',
          },
          indexedDb: {
            '__proto__.polluted': 'attack_3',
          },
        },
      });

      const res = await storageService.importBackup(pollutionPayload);
      expect(res).toBe(true);

      // Verify that Object prototype remains untouched
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });

    it('should safely store and retrieve XSS vectors without execution or script corruption', async () => {
      const xssVectors = [
        '<script>alert("xss")</script>',
        'javascript:alert(document.cookie)',
        '"><img src=x onerror=alert(1)>',
        '\' OR \'1\'=\'1',
        '${7*7}',
        '{{constructor.constructor("alert(1)")()}}',
      ];

      for (let i = 0; i < xssVectors.length; i++) {
        const key = `xss_key_${i}`;
        const val = xssVectors[i];
        await localAdapter.setItem(key, val);
        const retrieved = await localAdapter.getItem<string>(key);
        expect(retrieved).toBe(val);
      }
    });
  });

  describe('1.4 Unicode, Vietnamese Diacritics & High-Volume Key Stress', () => {
    it('should handle Vietnamese diacritics and emoji keys accurately', async () => {
      const complexData = {
        'tiến_độ_ngày_15_kế_toán_hàng_tồn_kho_giá_vốn': {
          tàiKhoản: 'TK 156 - Hàng hóa',
          chứngTừ: 'Phiếu nhập kho 01-VT',
          sốTiền: 150000000.5,
          đãXong: true,
        },
        '🔥streak_100_ngày🚀_đạt_chuẩn_kế_toán_trưởng🏆': {
          danhHiệu: 'Kế toán trưởng xuất sắc',
          chuỗiNgày: 100,
        },
      };

      for (const [k, v] of Object.entries(complexData)) {
        await localAdapter.setItem(k, v);
        const readBack = await localAdapter.getItem(k);
        expect(readBack).toEqual(v);
      }
    });

    it('should survive bulk storage operations (1,000 rapid writes & reads)', async () => {
      const count = 1000;
      const t0 = performance.now();

      // Bulk write
      for (let i = 0; i < count; i++) {
        await localAdapter.setItem(`bulk_${i}`, { idx: i, timestamp: Date.now() });
      }

      // Bulk read spot-check
      for (let i = 0; i < 100; i += 10) {
        const item = await localAdapter.getItem<{ idx: number }>(`bulk_${i}`);
        expect(item?.idx).toBe(i);
      }

      const allKeys = await localAdapter.getAllKeys();
      expect(allKeys.length).toBe(count);

      const t1 = performance.now();
      expect(t1 - t0).toBeLessThan(5000); // 1,000 items in < 5 seconds
    });
  });

  describe('1.5 Corruption in Existing LocalStorage Data', () => {
    it('should return null gracefully when raw LocalStorage content is corrupted', async () => {
      // Intentionally insert non-JSON directly into localStorage
      localStorage.setItem('stress_vnacc_corrupted_key', '{not a valid json');

      const val = await localAdapter.getItem('corrupted_key');
      expect(val).toBeNull(); // Must not throw, logs warn and returns null
    });
  });
});

describe('BATTERY 2: Storage Round-Trip Export & Restore Invariants', () => {
  let service: StorageService;

  beforeEach(async () => {
    localStorage.clear();
    service = new StorageService();
  });

  afterEach(async () => {
    localStorage.clear();
  });

  it('2.1: should preserve 100% state fidelity across complete round-trip export -> purge -> import', async () => {
    // 1. Establish rich realistic learner state
    await service.setTheme('dark');
    await service.setPreferredRegime('CIRCULAR_133');

    const progressData = {
      currentDay: 18,
      unlockedDays: Array.from({ length: 18 }, (_, i) => i + 1),
      completedDays: Array.from({ length: 17 }, (_, i) => i + 1),
      milestoneScores: {
        3: { score: 90, passed: true, date: '2026-09-01' },
        6: { score: 80, passed: true, date: '2026-09-04' },
        9: { score: 100, passed: true, date: '2026-09-07' },
        12: { score: 75, passed: true, date: '2026-09-10' },
        15: { score: 85, passed: true, date: '2026-09-13' },
      },
      streakDays: 14,
      totalStudyMinutes: 320,
    };

    const assessmentResults = {
      milestone_1: { score: 90, dokStats: { dok1: 100, dok2: 85, dok3: 85 } },
      milestone_2: { score: 80, dokStats: { dok1: 90, dok2: 80, dok3: 70 } },
      milestone_3: { score: 100, dokStats: { dok1: 100, dok2: 100, dok3: 100 } },
      milestone_4: { score: 75, dokStats: { dok1: 80, dok2: 70, dok3: 75 } },
      milestone_5: { score: 85, dokStats: { dok1: 90, dok2: 80, dok3: 85 } },
    };

    await service.setItem('learner_progress', progressData);
    await service.setItem('milestone_scores', assessmentResults);
    await service.setItem('user_notes_day_1', 'TK 111 vs TK 112 note');
    await service.setItem('user_notes_day_15', 'TK 154 redirection under TT 133');

    // 2. Export backup
    const exportedJson = await service.exportBackup();
    expect(exportedJson).toBeDefined();

    const parsed = JSON.parse(exportedJson) as BackupData;
    expect(parsed.app).toBe('vietnam-accounting-learning-web');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.theme).toBe('dark');
    expect(parsed.regime).toBe('CIRCULAR_133');
    expect(parsed.progress).toEqual(progressData);
    expect(parsed.assessmentResults).toEqual(assessmentResults);

    // 3. Purge all storage completely
    localStorage.clear();
    const cleanIdb = new IndexedDbAdapter();
    await cleanIdb.clearAll();

    // Verify empty state
    const cleanService = new StorageService();
    const themeBefore = await cleanService.getTheme();
    expect(themeBefore).toBe('system'); // default fallback

    // 4. Import backup
    const importSuccess = await cleanService.importBackup(exportedJson);
    expect(importSuccess).toBe(true);

    // 5. Verify restored state matches original 100%
    const restoredTheme = await cleanService.getTheme();
    expect(restoredTheme).toBe('dark');

    const restoredRegime = await cleanService.getPreferredRegime();
    expect(restoredRegime).toBe('CIRCULAR_133');

    const restoredProgress = await cleanService.getItem<typeof progressData>('learner_progress');
    expect(restoredProgress).toEqual(progressData);

    const restoredAssessments = await cleanService.getItem<typeof assessmentResults>('milestone_scores');
    expect(restoredAssessments).toEqual(assessmentResults);
  });

  it('2.2: should maintain idempotent state when importBackup is called repeatedly', async () => {
    await service.setTheme('light');
    await service.setPreferredRegime('CIRCULAR_200');
    await service.setItem('test_counter', { count: 42 });

    const backupJson = await service.exportBackup();

    // Import 5 times consecutively
    for (let i = 0; i < 5; i++) {
      const ok = await service.importBackup(backupJson);
      expect(ok).toBe(true);
    }

    expect(await service.getTheme()).toBe('light');
    expect(await service.getPreferredRegime()).toBe('CIRCULAR_200');
    const counter = await service.getItem<{ count: number }>('test_counter');
    expect(counter?.count).toBe(42);
  });
});

describe('BATTERY 3: Rapid Theme Toggling & DOM Sync Concurrency', () => {
  let mediaHelper: ReturnType<typeof setupMatchMedia>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    mediaHelper = setupMatchMedia(false); // default OS is light
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  it('3.1: should handle 100 rapid programmatic theme switches without desynchronization', async () => {
    const { result } = renderHook(() => useTheme());

    const modes: ('light' | 'dark' | 'system')[] = ['dark', 'light', 'system'];

    for (let i = 0; i < 100; i++) {
      const mode = modes[i % 3];
      act(() => {
        result.current.setTheme(mode);
      });
    }

    // Set a known final mode: dark
    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Switch to light
    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('3.2: should dynamically reflect OS prefers-color-scheme when in system mode', async () => {
    const { result } = renderHook(() => useTheme());

    // Switch to system mode
    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Simulate OS switching to dark mode
    act(() => {
      mediaHelper.setMatches(true);
    });

    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Simulate OS switching back to light mode
    act(() => {
      mediaHelper.setMatches(false);
    });

    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('3.3: should prioritize explicit user preference (dark/light) over OS changes', async () => {
    const { result } = renderHook(() => useTheme());

    // Explicit dark
    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // OS changes to light - should NOT override user explicit dark
    act(() => {
      mediaHelper.setMatches(false);
    });

    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Explicit light
    act(() => {
      result.current.setTheme('light');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // OS changes to dark - should NOT override user explicit light
    act(() => {
      mediaHelper.setMatches(true);
    });

    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('3.4: should clean up event listeners on unmount (zero memory leak)', () => {
    const initialListeners = mediaHelper.getListenerCount();

    const { unmount } = renderHook(() => useTheme());
    expect(mediaHelper.getListenerCount()).toBe(initialListeners + 1);

    unmount();
    expect(mediaHelper.getListenerCount()).toBe(initialListeners);
  });

  it('3.5: should respond correctly to rapid UI button clicks in ThemeToggle component', async () => {
    render(<ThemeToggle />);

    const lightBtn = screen.getByTitle('Giao diện sáng');
    const darkBtn = screen.getByTitle('Giao diện tối');
    const systemBtn = screen.getByTitle('Theo hệ thống');

    // Rapid clicking 30 times wrapped in act
    act(() => {
      for (let i = 0; i < 10; i++) {
        fireEvent.click(darkBtn);
        fireEvent.click(lightBtn);
        fireEvent.click(systemBtn);
      }
    });

    // Final click: dark
    act(() => {
      fireEvent.click(darkBtn);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Final click: light
    act(() => {
      fireEvent.click(lightBtn);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});