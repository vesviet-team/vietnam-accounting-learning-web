import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { storageService, StorageService } from '@/services/storage/storage-service';
import { Journalizer } from '@/components/workbench/Journalizer';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';

describe('ADVERSARIAL CHALLENGE: Offline Readiness & F5 Reload Recovery', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(async () => {
    window.localStorage.clear();
    await storageService.saveWorkbenchState({
      postedEntries: [],
      ledgerTAccounts: {},
      completedVoucherCases: [],
      voucherCompletedCases: [],
      voucherScores: {},
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
      writable: true,
    });
  });

  // =========================================================================
  // 1. Multi-Session Journalizer Refresh & Unmount-Remount Cycles
  // =========================================================================
  describe('1. Journalizer Session 1 -> Session 2 F5 Reload & Remount Integrity', () => {
    it('100% restores journal entries and ledger T-accounts across multiple unmount-remount cycles', async () => {
      // --- SESSION 1: Initial mount, select Scenario 2 (3-leg entry), and post ---
      const session1 = render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Switch to Scenario 2: Mua NVL nhập kho (152, 1331, 331)
      const scen2Btn = screen.getByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i);
      fireEvent.click(scen2Btn);

      // Verify row values populated
      expect(screen.getByDisplayValue('152')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1331')).toBeInTheDocument();
      expect(screen.getByDisplayValue('331')).toBeInTheDocument();

      // Post to ledger
      const postBtn1 = screen.getByRole('button', { name: /Ghi Sổ/i });
      fireEvent.click(postBtn1);

      // Verify immediate success in Session 1
      expect(await screen.findByText(/Ghi sổ thành công!/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i).length).toBeGreaterThan(0);

      // Ensure async background storage operation commits to IndexedDB
      await waitFor(async () => {
        const midStorage = await storageService.loadWorkbenchState();
        expect(midStorage.postedEntries.length).toBe(1);
        expect(midStorage.postedEntries[0].rows?.length).toBe(3);
        expect(midStorage.ledgerTAccounts['152']).toBeDefined();
        expect(midStorage.ledgerTAccounts['1331']).toBeDefined();
        expect(midStorage.ledgerTAccounts['331']).toBeDefined();
      });

      // Unmount Session 1 (simulating page reload / navigation away)
      session1.unmount();
      cleanup();

      // --- SESSION 2: Brand new instance & Remount (F5 simulation) ---
      const session2 = render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Verify 100% restoration of Session 1 entry in Session 2 DOM
      await waitFor(() => {
        expect(screen.getByText(/1 bút toán đã ghi/i)).toBeInTheDocument();
      });
      expect(screen.getAllByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/44\.000\.000/i).length).toBeGreaterThan(0);

      // Verify T-Accounts restored in Session 2 DOM
      expect(screen.getByText(/Sơ Đồ Chữ T Của Các Tài Khoản Đã Ghi Sổ/i)).toBeInTheDocument();
      expect(screen.getByText(/3 tài khoản có phát sinh/i)).toBeInTheDocument();

      // In Session 2, post another entry (Scenario 1: Rút TGNH về quỹ tiền mặt)
      const scen1Btn = screen.getAllByText(/Rút tiền gửi ngân hàng về nhập quỹ tiền mặt/i)[0];
      fireEvent.click(scen1Btn);

      const postBtn2 = screen.getByRole('button', { name: /Ghi Sổ/i });
      fireEvent.click(postBtn2);

      expect(await screen.findByText(/2 bút toán đã ghi/i)).toBeInTheDocument();

      // Wait for second entry to commit to storage
      await waitFor(async () => {
        const state = await storageService.loadWorkbenchState();
        expect(state.postedEntries.length).toBe(2);
      });

      // Unmount Session 2
      session2.unmount();
      cleanup();

      // --- SESSION 3: Second F5 reload & Remount ---
      const session3 = render(<Journalizer currentRegime="CIRCULAR_200" />);

      await waitFor(() => {
        expect(screen.getByText(/2 bút toán đã ghi/i)).toBeInTheDocument();
      });

      // Verify cumulative T-accounts: 5 distinct accounts (152, 1331, 331, 1111, 1121)
      expect(screen.getByText(/5 tài khoản có phát sinh/i)).toBeInTheDocument();

      // Test "Xóa lịch sử" clearing functionality
      const clearBtn = screen.getByRole('button', { name: /Xóa lịch sử/i });
      fireEvent.click(clearBtn);

      // Verify UI is reset
      await waitFor(() => {
        expect(screen.queryByText(/bút toán đã ghi/i)).not.toBeInTheDocument();
      });

      // Wait for clear operation to commit to storage
      await waitFor(async () => {
        const state = await storageService.loadWorkbenchState();
        expect(state.postedEntries.length).toBe(0);
      });

      // Unmount Session 3
      session3.unmount();
      cleanup();

      // --- SESSION 4: Third Remount after clear ---
      const session4 = render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Wait brief moment and confirm history remains completely empty
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByText(/bút toán đã ghi/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/tài khoản có phát sinh/i)).not.toBeInTheDocument();

      session4.unmount();
    });
  });

  // =========================================================================
  // 2. Voucher Inspection Cases & Scores Persistence Across Remounts
  // =========================================================================
  describe('2. Voucher Inspection Cases & Scores Remount Integrity', () => {
    it('persists completed cases, exact scores, and reset workflows across remounts', async () => {
      // --- SESSION 1: Audit Case 1 and Case 2 ---
      const session1 = render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Case 1 is default: mark Valid and submit
      const validBtn = screen.getByRole('button', { name: /Chứng từ HỢP LỆ/i });
      fireEvent.click(validBtn);

      const submitBtn = screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i });
      fireEvent.click(submitBtn);

      // Case 1 scored 100đ
      expect(await screen.findByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();

      // Switch to Case 2: Hóa đơn Điện Máy Đúng 20 Triệu (Cash >= 20M violation)
      const case2Btn = screen.getByText(/Hóa đơn Điện Máy Đúng 20 Triệu/i);
      fireEvent.click(case2Btn);

      const nonCashCb = screen.getByLabelText(/Vi phạm quy tắc thanh toán không dùng tiền mặt/i);
      fireEvent.click(nonCashCb);

      const invalidBtn = screen.getByRole('button', { name: /CÓ SAI PHẠM/i });
      fireEvent.click(invalidBtn);

      const submitBtn2 = screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i });
      fireEvent.click(submitBtn2);

      // Case 2 also scored 100đ
      expect(await screen.findByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();

      // Switch to Case 3: Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng (Status 03)
      const case3Btn = screen.getByText(/Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng/i);
      fireEvent.click(case3Btn);

      const taxCb = screen.getByLabelText(/Rủi ro Mã số thuế người bán/i);
      fireEvent.click(taxCb);

      const invalidBtn3 = screen.getByRole('button', { name: /CÓ SAI PHẠM/i });
      fireEvent.click(invalidBtn3);

      const submitBtn3 = screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i });
      fireEvent.click(submitBtn3);

      // Case 3 scored 100đ
      expect(await screen.findByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();

      // Verify Session 1 header shows 3 completed cases
      expect(screen.getByText(/Đã hoàn thành:\s*3\s*\/\s*\d+/i)).toBeInTheDocument();

      // Ensure async background storage operation commits to IndexedDB before F5 reload
      await waitFor(async () => {
        const state = await storageService.loadWorkbenchState();
        expect(state.completedVoucherCases).toContain('case-03-status-03-suspended');
      });

      // Unmount Session 1 (simulating page reload / navigation away)
      session1.unmount();
      cleanup();

      // --- SESSION 2: Remount (F5 simulation) ---
      const session2 = render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Verify completed count persists
      await waitFor(() => {
        expect(screen.getByText(/Đã hoàn thành:\s*3\s*\/\s*\d+/i)).toBeInTheDocument();
      });

      // Verify score badges are displayed for all 3 cases
      const badges100 = screen.getAllByText('100đ');
      expect(badges100.length).toBeGreaterThanOrEqual(3);

      // Test Single Case Reset: Select Case 1 and reset it
      const case1Btn = screen.getByText(/Hóa đơn Mua Văn phòng phẩm 15 Triệu/i);
      fireEvent.click(case1Btn);

      const resetCurrentBtn = screen.getByTitle('Đặt lại các tiêu chí và kết quả của hồ sơ hiện tại');
      fireEvent.click(resetCurrentBtn);

      // Verify count decreased to 2 in UI
      await waitFor(() => {
        expect(screen.getByText(/Đã hoàn thành:\s*2\s*\/\s*\d+/i)).toBeInTheDocument();
      });

      // Wait for single reset to commit to storage
      await waitFor(async () => {
        const state = await storageService.loadWorkbenchState();
        expect(state.completedVoucherCases.length).toBe(2);
      });

      // Unmount Session 2
      session2.unmount();
      cleanup();

      // --- SESSION 3: Remount after single reset ---
      const session3 = render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      await waitFor(() => {
        expect(screen.getByText(/Đã hoàn thành:\s*2\s*\/\s*\d+/i)).toBeInTheDocument();
      });
      // Case 2 and Case 3 (both 100đ) persist
      const badgesRemaining = screen.getAllByText('100đ');
      expect(badgesRemaining.length).toBeGreaterThanOrEqual(2);

      // Test Full Reset
      const resetAllBtn = screen.getByRole('button', { name: /\(Đặt lại\)/i });
      fireEvent.click(resetAllBtn);

      await waitFor(() => {
        expect(screen.getByText(/Đã hoàn thành:\s*0\s*\/\s*\d+/i)).toBeInTheDocument();
      });

      // Wait for full reset to commit to storage
      await waitFor(async () => {
        const state = await storageService.loadWorkbenchState();
        expect(state.completedVoucherCases.length).toBe(0);
      });

      // Unmount Session 3
      session3.unmount();
      cleanup();

      // --- SESSION 4: Remount after full reset ---
      const session4 = render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      await waitFor(() => {
        expect(screen.getByText(/Đã hoàn thành:\s*0\s*\/\s*\d+/i)).toBeInTheDocument();
      });
      expect(screen.queryByText('100đ')).not.toBeInTheDocument();

      session4.unmount();
    });
  });

  // =========================================================================
  // 3. Offline Mode Simulation (navigator.onLine = false)
  // =========================================================================
  describe('3. Offline Resilience under Disconnected Network', () => {
    it('executes heavy concurrent storage read/write operations without throwing when navigator.onLine is false', async () => {
      // Disconnect network
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });
      window.dispatchEvent(new Event('offline'));
      expect(navigator.onLine).toBe(false);

      // Build 25 complex entries
      const offlineEntries = Array.from({ length: 25 }, (_, i) => ({
        id: `offline-entry-${i}`,
        timestamp: '15:00:00',
        descriptionVi: `Nghiệp vụ ngoại tuyến số ${i + 1}`,
        totalAmount: (i + 1) * 1000000,
        rows: [
          { accountCode: '1111', debitAmount: (i + 1) * 1000000, creditAmount: 0 },
          { accountCode: '5111', debitAmount: 0, creditAmount: (i + 1) * 1000000 },
        ],
      }));

      const offlineScores: Record<string, number> = {
        'case-01': 100,
        'case-02': 90,
        'case-03': 85,
      };

      // Write while offline
      const saveResult = await storageService.saveWorkbenchState({
        postedEntries: offlineEntries,
        completedVoucherCases: ['case-01', 'case-02', 'case-03'],
        voucherScores: offlineScores,
      });
      expect(saveResult).toBe(true);

      // Read back while offline
      const loaded = await storageService.loadWorkbenchState();
      expect(loaded.postedEntries.length).toBe(25);
      expect(loaded.completedVoucherCases).toEqual(['case-01', 'case-02', 'case-03']);
      expect(loaded.voucherScores).toEqual(offlineScores);

      // Reconnect network
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      });
      window.dispatchEvent(new Event('online'));
      expect(navigator.onLine).toBe(true);
    });

    it('gracefully degrades to LocalStorage when IndexedDB throws errors during offline operation', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });

      const fallbackStorage = new StorageService();

      // Force IndexedDB to throw an AbortError / QuotaExceededError
      vi.spyOn((fallbackStorage as any).idbAdapter, 'setItem').mockRejectedValue(
        new Error('QuotaExceededError: The quota has been exceeded.')
      );
      vi.spyOn((fallbackStorage as any).idbAdapter, 'getItem').mockRejectedValue(
        new Error('AbortError: Transaction failed.')
      );

      // Attempt to save while offline and IndexedDB failing
      const didSave = await fallbackStorage.saveWorkbenchState({
        postedEntries: [{ id: 'ls-fallback-entry', descriptionVi: 'Lưu vào LocalStorage khi IDB lỗi' }],
        completedVoucherCases: ['case-fallback'],
      });
      expect(didSave).toBe(true);

      // Attempt to load
      const loaded = await fallbackStorage.loadWorkbenchState();
      expect(loaded.postedEntries.some((e) => e.id === 'ls-fallback-entry')).toBe(true);
      expect(loaded.completedVoucherCases).toContain('case-fallback');
    });
  });

  // =========================================================================
  // 4. Data Corruption & Boundary Attacks
  // =========================================================================
  describe('4. Malformed State & Concurrent Stress Harness', () => {
    it('recovers with safe defaults when storage contains corrupted JSON or invalid types', async () => {
      // Direct injection of corrupted data into LocalStorage
      window.localStorage.setItem('vnacc_workbench_state', '{bad_json:true,,,');

      const corruptedLoaded = await storageService.loadWorkbenchState();
      expect(corruptedLoaded.postedEntries).toEqual([]);
      expect(corruptedLoaded.ledgerTAccounts).toEqual({});
      expect(corruptedLoaded.completedVoucherCases).toEqual([]);
      expect(corruptedLoaded.voucherScores).toEqual({});

      // Injection of invalid data types (null, strings instead of arrays/objects)
      window.localStorage.setItem(
        'vnacc_workbench_state',
        JSON.stringify({
          postedEntries: 'not-an-array',
          ledgerTAccounts: 12345,
          completedVoucherCases: null,
          voucherScores: null,
        })
      );

      const typeLoaded = await storageService.loadWorkbenchState();
      expect(Array.isArray(typeLoaded.postedEntries)).toBe(true);
      expect(typeof typeLoaded.ledgerTAccounts).toBe('object');
      expect(Array.isArray(typeLoaded.completedVoucherCases)).toBe(true);
      expect(typeof typeLoaded.voucherScores).toBe('object');

      // Ensure Journalizer and VoucherInspector mount without crashing
      expect(() => {
        const { unmount } = render(<Journalizer currentRegime="CIRCULAR_200" />);
        unmount();
      }).not.toThrow();

      expect(() => {
        const { unmount } = render(<VoucherInspector currentRegime="CIRCULAR_200" />);
        unmount();
      }).not.toThrow();
    });

    it('preserves data integrity under high-concurrency partial write bursts', async () => {
      // 10 concurrent partial saves
      const promises = Array.from({ length: 10 }, (_, i) =>
        storageService.saveWorkbenchState({
          voucherScores: { [`burst-case-${i}`]: i * 10 },
        })
      );

      const results = await Promise.all(promises);
      expect(results.every((r) => r === true)).toBe(true);

      const finalState = await storageService.loadWorkbenchState();
      expect(finalState.voucherScores).toBeDefined();
      // At least the final burst score is preserved
      expect(Object.keys(finalState.voucherScores || {}).length).toBeGreaterThan(0);
    });

    it('enforces bidirectional synchronization between completedVoucherCases and voucherCompletedCases', async () => {
      // Save using legacy property name voucherCompletedCases
      await storageService.saveWorkbenchState({
        voucherCompletedCases: ['case-legacy-01', 'case-legacy-02'],
      });

      const loaded1 = await storageService.loadWorkbenchState();
      expect(loaded1.completedVoucherCases).toContain('case-legacy-01');
      expect(loaded1.voucherCompletedCases).toContain('case-legacy-02');

      // Save using standard property name completedVoucherCases
      await storageService.saveWorkbenchState({
        completedVoucherCases: ['case-standard-01'],
      });

      const loaded2 = await storageService.loadWorkbenchState();
      expect(loaded2.completedVoucherCases).toContain('case-standard-01');
      expect(loaded2.voucherCompletedCases).toContain('case-standard-01');
    });
  });
});
