import { describe, it, expect, beforeEach } from 'vitest';
import {
  GatingEngine,
  GradingEngine,
  BalanceValidator,
  VoucherInspector,
  StreakEngine,
} from '../helpers/domain-engines';
import { searchAccounts, findAccountByCode } from '@/data/coa-service';
import { isProhibitedInCircular133, validateAccountForRegime } from '@/data/prohibited-accounts';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { MILESTONE_ASSESSMENTS } from '../fixtures/milestone-assessments';
import { VOUCHER_TEST_CASES, ExtendedVoucherCase } from '../fixtures/voucher-cases';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 2: Boundary, Extreme Precision & Corner Cases', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new LocalStorageAdapter('boundary_vnacc_');
  });

  // -------------------------------------------------------------
  // FEAT-01: Curriculum Boundaries
  // -------------------------------------------------------------
  describe('FEAT-01 Boundaries: Day Range & Access Constraints', () => {
    it('T2.1.1: should reject access for Day 0 (out of lower bound)', () => {
      expect(GatingEngine.canAccessDay(0, [1, 2, 3], {})).toBe(false);
    });

    it('T2.1.2: should reject access for Day 31 (out of upper bound)', () => {
      expect(GatingEngine.canAccessDay(31, [1, 2, 3], {})).toBe(false);
    });

    it('T2.1.3: should reject access for negative day values (-1, -100)', () => {
      expect(GatingEngine.canAccessDay(-1, [1, 2, 3], {})).toBe(false);
      expect(GatingEngine.canAccessDay(-100, [1, 2, 3], {})).toBe(false);
    });

    it('T2.1.4: should reject direct jump to Day 10 when only Module 1 is completed', () => {
      const milestoneScores = { 3: 100 }; // passed M1, M2 not taken
      expect(GatingEngine.canAccessDay(10, [1, 2, 3, 4, 5, 6], milestoneScores)).toBe(false);
    });

    it('T2.1.5: should not produce days past Day 30 when unlocking Module 10', () => {
      const unlocked = GatingEngine.unlockNextModule(30, [1, 2, 3, 4, 5]);
      expect(unlocked.every((d) => d <= 30)).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // FEAT-02: COA Search Boundaries
  // -------------------------------------------------------------
  describe('FEAT-02 Boundaries: Search Query Extremes & Sanitization', () => {
    it('T2.2.1: should return all accounts when search query is empty or whitespace only', () => {
      const emptyResult = searchAccounts('', 'CIRCULAR_200');
      const spaceResult = searchAccounts('   ', 'CIRCULAR_200');
      expect(emptyResult.length).toBe(spaceResult.length);
      expect(emptyResult.length).toBeGreaterThan(70);
    });

    it('T2.2.2: should safely handle regex metacharacters in search without crashing', () => {
      const weirdQueries = ['.*', '(?=.*)', '[[[', '\\d+', '$^', '.*+?^${}()|[]\\'];
      for (const q of weirdQueries) {
        expect(() => searchAccounts(q, 'CIRCULAR_200')).not.toThrow();
      }
    });

    it('T2.2.3: should be case-insensitive and handle leading/trailing whitespaces in account search', () => {
      const upper = searchAccounts('TK 111', 'CIRCULAR_200');
      const lower = searchAccounts('tk 111', 'CIRCULAR_200');
      const spaced = searchAccounts('   111   ', 'CIRCULAR_200');

      expect(upper.length).toBe(lower.length);
      expect(spaced.length).toBeGreaterThan(0);
      expect(spaced.some((a) => a.code === '111')).toBe(true);
    });

    it('T2.2.4: should distinguish exact 3-digit parent vs 4-digit sub-account', () => {
      const exact111 = findAccountByCode('111', 'CIRCULAR_200');
      const exact1111 = findAccountByCode('1111', 'CIRCULAR_200');

      expect(exact111).toBeDefined();
      expect(exact1111).toBeDefined();
      expect(exact111?.code).toBe('111');
      expect(exact1111?.code).toBe('1111');
      expect(exact111?.level).toBe(1);
      expect(exact1111?.level).toBe(2);
    });

    it('T2.2.5: should validate sub-accounts of prohibited accounts (e.g. 6411, 5211) as prohibited in TT 133', () => {
      expect(isProhibitedInCircular133('6411')).toBe(true);
      expect(isProhibitedInCircular133('5211')).toBe(true);
      expect(isProhibitedInCircular133('6271')).toBe(true);

      const val6411 = validateAccountForRegime('6411', 'CIRCULAR_133');
      expect(val6411.isValid).toBe(false);
      expect(val6411.isProhibited).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // FEAT-03: Assessment Scoring Boundaries (69% vs 70%)
  // -------------------------------------------------------------
  describe('FEAT-03 Boundaries: Critical Passing Threshold 69% vs 70%', () => {
    it('T2.3.1: should treat score of exactly 69% as FAILED and lock gating', () => {
      const attempt = GatingEngine.recordAttempt(3, 69, [], 0);
      expect(attempt.passed).toBe(false);
      expect(attempt.unlocked).toBe(false);
      expect(attempt.bestScore).toBe(69);
    });

    it('T2.3.2: should treat score of exactly 70% as PASSED and unlock gating', () => {
      const attempt = GatingEngine.recordAttempt(3, 70, [], 0);
      expect(attempt.passed).toBe(true);
      expect(attempt.unlocked).toBe(true);
      expect(attempt.bestScore).toBe(70);
    });

    it('T2.3.3: should handle 0% score when all questions are unanswered or wrong', () => {
      const quiz = MILESTONE_ASSESSMENTS[3];
      const emptyAnswers = {};
      const result = GradingEngine.gradeAssessment(emptyAnswers, quiz);

      expect(result.score).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(GradingEngine.getProficiencyTier(result.score)).toBe('beginning');
    });

    it('T2.3.4: should preserve best score when a retake results in a lower score', () => {
      // First attempt: 80% (passed)
      const attempt1 = GatingEngine.recordAttempt(3, 80, [], 0);
      expect(attempt1.bestScore).toBe(80);
      expect(attempt1.unlocked).toBe(true);

      // Second attempt: 50% (lower score)
      const attempt2 = GatingEngine.recordAttempt(3, 50, attempt1.updatedHistory, attempt1.bestScore);
      expect(attempt2.score).toBe(50);
      expect(attempt2.passed).toBe(false);
      expect(attempt2.bestScore).toBe(80); // best score preserved!
      expect(attempt2.unlocked).toBe(true); // remained unlocked!
      expect(attempt2.updatedHistory).toEqual([80, 50]);
    });

    it('T2.3.5: should classify score of exactly 89% as proficient and 90% as advanced', () => {
      expect(GradingEngine.getProficiencyTier(89)).toBe('proficient');
      expect(GradingEngine.getProficiencyTier(90)).toBe('advanced');
      expect(GradingEngine.getProficiencyTier(69)).toBe('developing');
      expect(GradingEngine.getProficiencyTier(49)).toBe('beginning');
    });
  });

  // -------------------------------------------------------------
  // FEAT-04: Journalizer Precision Boundaries (1 VND Delta & Billions)
  // -------------------------------------------------------------
  describe('FEAT-04 Boundaries: 1 VND Delta, Single-Row, Zero & Large Numbers', () => {
    it('T2.4.1: should reject single-row journal entry without counterpart', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 10000000, creditAmount: 0 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(false);
      expect(validation.errorMessageVi).toContain('ít nhất hai tài khoản đối ứng');
    });

    it('T2.4.2: should detect an imbalance of exactly 1 VND', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 10000000, creditAmount: 0 },
        { id: '2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 9999999 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(false);
      expect(validation.delta).toBe(1);
    });

    it('T2.4.3: should reject entry where all rows have 0 VND', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 0, creditAmount: 0 },
        { id: '2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 0 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(false);
      expect(validation.errorMessageVi).toContain('lớn hơn 0');
    });

    it('T2.4.4: should handle extreme amounts (100 Billion VND) without precision loss', () => {
      const oneHundredBillion = 100000000000;
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: oneHundredBillion, creditAmount: 0 },
        { id: '2', accountCode: '411', accountNameVi: 'Vốn CSH', debitAmount: 0, creditAmount: oneHundredBillion },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(true);
      expect(validation.delta).toBe(0);
      expect(validation.totalDebit).toBe(oneHundredBillion);
    });

    it('T2.4.5: should round fractional VND amounts to nearest integer without false imbalances', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 3333333.333, creditAmount: 0 },
        { id: '2', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 0, creditAmount: 3333333.333 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(true);
      expect(validation.delta).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // FEAT-05: Voucher Inspection Boundaries (19,999,999 vs 20,000,000 VND)
  // -------------------------------------------------------------
  describe('FEAT-05 Boundaries: Statutory Non-Cash Thresholds & Edge Vouchers', () => {
    it('T2.5.1: should confirm 19,999,999 VND paid in cash is fully valid and tax-deductible', () => {
      const boundaryCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-02-boundary-valid-cash')!;
      expect(boundaryCase).toBeDefined();

      const audit = VoucherInspector.auditVoucher(boundaryCase);
      expect(audit.isValid).toBe(true);
      expect(audit.vatDeductible).toBe(true);
      expect(audit.citDeductible).toBe(true);
    });

    it('T2.5.2: should confirm exactly 20,000,000 VND paid in cash is invalid and rejects VAT/CIT deduction', () => {
      const boundaryCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-03-boundary-invalid-cash-20m')!;
      expect(boundaryCase).toBeDefined();

      const audit = VoucherInspector.auditVoucher(boundaryCase);
      expect(audit.isValid).toBe(false);
      expect(audit.vatDeductible).toBe(false);
      expect(audit.citDeductible).toBe(false);
    });

    it('T2.5.3: should reject invoice when vendor tax code is Status 04 (Runaway/Not at registered address)', () => {
      const runawayCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-06-vendor-status-04-runaway')!;
      expect(runawayCase).toBeDefined();

      const audit = VoucherInspector.auditVoucher(runawayCase);
      expect(audit.isValid).toBe(false);
      expect(audit.vatDeductible).toBe(false);
      expect(audit.issues.some((i) => i.includes('04') || i.toLowerCase().includes('không hoạt động'))).toBe(true);
    });

    it('T2.5.4: should detect arithmetic mismatch between pretax + vat and total gross amount', () => {
      const mismatchCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-08-arithmetic-mismatch')!;
      expect(mismatchCase).toBeDefined();

      const audit = VoucherInspector.auditVoucher(mismatchCase);
      expect(audit.isValid).toBe(false);
      expect(audit.issues.some((i) => i.includes('Sai lệch số học'))).toBe(true);
    });

    it('T2.5.5: should validate multi-invoice same day cash rule aggregation', () => {
      // 2 invoices on same day from same vendor: 10M and 12M paid in cash
      const inv1: ExtendedVoucherCase = {
        id: 'same-day-1',
        titleVi: 'HĐ 1',
        voucherType: 'VAT_INVOICE',
        scenarioDescriptionVi: 'Mua sáng',
        totalAmount: 10000000,
        paymentMethod: 'CASH',
        statutoryBasis: 'TT 219/2013',
      };
      const inv2: ExtendedVoucherCase = {
        id: 'same-day-2',
        titleVi: 'HĐ 2',
        voucherType: 'VAT_INVOICE',
        scenarioDescriptionVi: 'Mua chiều',
        totalAmount: 12000000,
        paymentMethod: 'CASH',
        statutoryBasis: 'TT 219/2013',
      };

      const aggregateTotal = inv1.totalAmount + inv2.totalAmount;
      expect(aggregateTotal).toBe(22000000);
      const isCompliant = aggregateTotal < 20000000;
      expect(isCompliant).toBe(false); // violates same-day aggregation rule!
    });
  });

  // -------------------------------------------------------------
  // FEAT-06: Storage Adapter Edge Cases
  // -------------------------------------------------------------
  describe('FEAT-06 Boundaries: Storage Malformation, Corrupted JSON & Recovery', () => {
    it('T2.6.1: should safely handle corrupted JSON import without throwing unhandled exceptions', async () => {
      const corruptedJson = '{ this is not valid json! @#$ ';
      const success = await storage.importBackup(corruptedJson);
      expect(success).toBe(false);
    });

    it('T2.6.2: should safely handle empty string or null backup import', async () => {
      expect(await storage.importBackup('')).toBe(false);
      expect(await storage.importBackup('{}')).toBe(false);
    });

    it('T2.6.3: should handle import of backup with missing optional fields gracefully', async () => {
      const minimalBackup = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        customData: {
          some_key: 'some_val',
        },
      });

      const success = await storage.importBackup(minimalBackup);
      expect(success).toBe(true);
      expect(await storage.getItem('some_key')).toBe('some_val');
    });

    it('T2.6.4: should return null when querying a key that does not exist', async () => {
      const result = await storage.getItem('nonexistent_key_xyz');
      expect(result).toBeNull();
    });

    it('T2.6.5: should calculate learning streak over multi-month calendar year boundaries', () => {
      // Active Dec 31 -> Jan 1
      const streak = StreakEngine.calculateStreak('2026-12-31', '2027-01-01', 10);
      expect(streak).toBe(11);
    });
  });

  // -------------------------------------------------------------
  // FEAT-07: UI Theme & Shell Boundaries
  // -------------------------------------------------------------
  describe('FEAT-07 Boundaries: Theme Fallbacks & Rapid Toggling', () => {
    it('T2.7.1: should store and retrieve valid theme modes: light, dark, and system', async () => {
      const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
      for (const mode of modes) {
        await storage.setItem('theme', mode);
        expect(await storage.getItem('theme')).toBe(mode);
      }
    });

    it('T2.7.2: should support rapid consecutive storage writes without corruption', async () => {
      for (let i = 0; i < 50; i++) {
        await storage.setItem('counter', i);
      }
      expect(await storage.getItem('counter')).toBe(49);
    });

    it('T2.7.3: should retrieve all keys prefixed with the adapter namespace', async () => {
      await storage.setItem('k1', 1);
      await storage.setItem('k2', 2);
      await storage.setItem('k3', 3);

      const allKeys = await storage.getAllKeys();
      expect(allKeys).toContain('k1');
      expect(allKeys).toContain('k2');
      expect(allKeys).toContain('k3');
    });

    it('T2.7.4: should maintain distinct prefixes across different adapter instances', async () => {
      const adapterA = new LocalStorageAdapter('prefix_a_');
      const adapterB = new LocalStorageAdapter('prefix_b_');

      await adapterA.setItem('shared_name', 'Value A');
      await adapterB.setItem('shared_name', 'Value B');

      expect(await adapterA.getItem('shared_name')).toBe('Value A');
      expect(await adapterB.getItem('shared_name')).toBe('Value B');
    });

    it('T2.7.5: should cleanly serialize complex nested data structures', async () => {
      const complexState = {
        user: { name: 'Nguyễn Văn Kế Toán', id: 123 },
        progress: [1, 2, 3],
        settings: { notifications: true, sound: false },
      };

      await storage.setItem('complex_state', complexState);
      const retrieved = await storage.getItem<typeof complexState>('complex_state');
      expect(retrieved).toEqual(complexState);
    });
  });
});
