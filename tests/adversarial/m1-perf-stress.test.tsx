import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { CoaExplorer, removeVietnameseAccents } from '@/components/coa/CoaExplorer';
import { AccountingRegime } from '@/types/coa';
import { getAccountsByRegime } from '@/data/coa-service';

describe('CHALLENGER M1: Empirical Latency & Performance Stress Harness', () => {
  afterEach(() => {
    cleanup();
  });

  describe('1. CoaExplorer Pure Filtering Algorithm Latency (<1ms per filter)', () => {
    const rawAccounts200 = getAccountsByRegime('CIRCULAR_200');

    // Pre-indexed structures matching CoaExplorer implementation
    const indexed200 = rawAccounts200.map((acc) => {
      const codeLower = acc.code.toLowerCase();
      const nameLower = acc.nameVi.toLowerCase();
      const descLower = acc.description.toLowerCase();
      const subLower = acc.substituteIn133 ? acc.substituteIn133.toLowerCase() : '';
      const nameNoAccents = removeVietnameseAccents(nameLower);
      const descNoAccents = removeVietnameseAccents(descLower);
      const subNoAccents = subLower ? removeVietnameseAccents(subLower) : '';
      return {
        ...acc,
        _normalizedSearch: `${codeLower} ${nameLower} ${nameNoAccents} ${descLower} ${descNoAccents} ${subLower} ${subNoAccents}`,
      };
    });

    const TEST_QUERIES = [
      '1', '11', '111', '1111',
      'tiền', 'tiền gửi', 'tiền gửi ngân hàng',
      'phải thu', 'phải trả', 'khách hàng',
      'chi phí', 'doanh thu', 'hao mòn',
      'tài sản cố định', 'thuế gtgt',
      'xyz999', // non-existent
      '   ', // whitespace
      '.*+?', // regex characters
    ];

    it('pure search filtering logic executes in <1ms across all query types', () => {
      const latencies: number[] = [];

      for (const query of TEST_QUERIES) {
        let lastResultCount = 0;
        for (let iter = 0; iter < 100; iter++) {
          const t0 = performance.now();
          const q = query.trim().toLowerCase();
          const qNoAccents = q ? removeVietnameseAccents(q) : '';
          const result = indexed200.filter((acc) => {
            if (!q) return true;
            return acc._normalizedSearch.includes(q) || (qNoAccents ? acc._normalizedSearch.includes(qNoAccents) : false);
          });
          const dt = performance.now() - t0;
          latencies.push(dt);
          lastResultCount = result.length;
        }
        expect(lastResultCount).toBeGreaterThanOrEqual(0);
      }

      const max = Math.max(...latencies);
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];

      console.log(`[Pure Algorithm Benchmark] Samples: ${latencies.length} | Avg: ${avg.toFixed(4)}ms | P95: ${p95.toFixed(4)}ms | Max: ${max.toFixed(4)}ms`);

      expect(avg).toBeLessThan(1.0); // <1.0ms average
      expect(p95).toBeLessThan(5.0); // <5.0ms p95
      expect(max).toBeLessThan(25.0); // <25.0ms max (well below 50ms statutory requirement)
    });
  });

  describe('2. CoaExplorer Multi-Keystroke Typing Burst Latency (UI Render)', () => {
    const TYPING_BURSTS = [
      'tiền gửi ngân hàng',
      'phải trả người bán',
      'tài sản cố định hữu hình',
      'chi phí quản lý doanh nghiệp',
      'nguyên liệu vật liệu',
      '1112',
      '33311',
      '6422',
      'nguoi lao dong',
      'doanh thu ban hang',
    ];

    it('measures keystroke-by-keystroke rendering latency profile', async () => {
      const keystrokeLatencies: { char: string; phrase: string; duration: number }[] = [];
      const clearLatencies: number[] = [];

      const TestHarness = () => {
        const [regime, setRegime] = useState<AccountingRegime>('CIRCULAR_200');
        return <CoaExplorer currentRegime={regime} onRegimeChange={setRegime} />;
      };

      render(<TestHarness />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu tài khoản/);

      for (const phrase of TYPING_BURSTS) {
        let accumulated = '';
        for (let i = 0; i < phrase.length; i++) {
          accumulated += phrase[i];
          const start = performance.now();
          fireEvent.change(searchInput, { target: { value: accumulated } });
          const duration = performance.now() - start;
          keystrokeLatencies.push({ char: phrase[i], phrase, duration });
        }

        // Measure clear latency
        const clearStart = performance.now();
        fireEvent.change(searchInput, { target: { value: '' } });
        const clearDuration = performance.now() - clearStart;
        clearLatencies.push(clearDuration);
      }

      const durations = keystrokeLatencies.map((k) => k.duration);
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      durations.sort((a, b) => a - b);
      const p50 = durations[Math.floor(durations.length * 0.50)];
      const p95 = durations[Math.floor(durations.length * 0.95)];
      const p99 = durations[Math.floor(durations.length * 0.99)];

      console.log(
        `[UI Typing Latency Profile] Total Keystrokes: ${durations.length} | Min: ${min.toFixed(2)}ms | P50: ${p50.toFixed(2)}ms | Avg: ${avg.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms | P99: ${p99.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`
      );

      const clearAvg = clearLatencies.reduce((a, b) => a + b, 0) / clearLatencies.length;
      console.log(`[Clear Search Latency] Count: ${clearLatencies.length} | Avg: ${clearAvg.toFixed(2)}ms | Max: ${Math.max(...clearLatencies).toFixed(2)}ms`);

      // Filter keystrokes exceeding 50ms to inspect them
      const over50 = keystrokeLatencies.filter((k) => k.duration >= 50);
      console.log(`Keystrokes >= 50ms: ${over50.length}`, over50);

      // Verify that P95 of keystrokes stays well under 50ms
      expect(p95).toBeLessThan(50);
    }, 15000);
  });

  describe('3. Rapid TT200 and TT133 Regime Toggling Profile', () => {
    it('measures regime switching latency across multiple toggles', async () => {
      const toggleLatencies: { from: string; to: string; index: number; duration: number }[] = [];

      const RegimeSwitcherHarness = () => {
        const [regime, setRegime] = useState<AccountingRegime>('CIRCULAR_200');
        return <CoaExplorer currentRegime={regime} onRegimeChange={setRegime} />;
      };

      render(<RegimeSwitcherHarness />);

      const tt200Btn = screen.getByRole('button', { name: /TT 200/ });
      const tt133Btn = screen.getByRole('button', { name: /TT 133/ });

      for (let i = 0; i < 20; i++) {
        // Switch to TT 133
        const t1 = performance.now();
        fireEvent.click(tt133Btn);
        const d1 = performance.now() - t1;
        toggleLatencies.push({ from: 'TT200', to: 'TT133', index: i, duration: d1 });

        // Switch to TT 200
        const t2 = performance.now();
        fireEvent.click(tt200Btn);
        const d2 = performance.now() - t2;
        toggleLatencies.push({ from: 'TT133', to: 'TT200', index: i, duration: d2 });
      }

      const durations = toggleLatencies.map((t) => t.duration);
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      durations.sort((a, b) => a - b);
      const p50 = durations[Math.floor(durations.length * 0.50)];
      const p95 = durations[Math.floor(durations.length * 0.95)];

      console.log(
        `[Regime Toggling Profile] Toggles: ${durations.length} | Min: ${min.toFixed(2)}ms | P50: ${p50.toFixed(2)}ms | Avg: ${avg.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`
      );

      // Detailed breakdown by transition direction
      const to133 = toggleLatencies.filter((t) => t.to === 'TT133').map((t) => t.duration);
      const to200 = toggleLatencies.filter((t) => t.to === 'TT200').map((t) => t.duration);

      const avgTo133 = to133.reduce((a, b) => a + b, 0) / to133.length;
      const avgTo200 = to200.reduce((a, b) => a + b, 0) / to200.length;

      console.log(`  -> Switch TT200 -> TT133 (68 accounts): Avg ${avgTo133.toFixed(2)}ms | Max ${Math.max(...to133).toFixed(2)}ms`);
      console.log(`  -> Switch TT133 -> TT200 (238 accounts): Avg ${avgTo200.toFixed(2)}ms | Max ${Math.max(...to200).toFixed(2)}ms`);

      // Check toggles exceeding 50ms
      const togglesOver50 = toggleLatencies.filter((t) => t.duration >= 50);
      console.log(`Toggles >= 50ms: ${togglesOver50.length}`, togglesOver50);
    }, 15000);
  });
});
