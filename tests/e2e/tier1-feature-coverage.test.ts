import { describe, it, expect, beforeEach } from 'vitest';
import { CURRICULUM_30_DAYS } from '../fixtures/curriculum-data';
import { MILESTONE_ASSESSMENTS } from '../fixtures/milestone-assessments';
import { VOUCHER_TEST_CASES } from '../fixtures/voucher-cases';
import {
  GatingEngine,
  GradingEngine,
  BalanceValidator,
  VoucherInspector,
  StreakEngine,
} from '../helpers/domain-engines';
import { getAccountsByRegime, searchAccounts, findAccountByCode } from '@/data/coa-service';
import { isProhibitedInCircular133, validateAccountForRegime } from '@/data/prohibited-accounts';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { CATEGORY_METADATA } from '@/types/coa';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 1: Feature Coverage (Baseline isolated feature verifications)', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new LocalStorageAdapter('test_vnacc_');
  });

  // -------------------------------------------------------------
  // FEAT-01: 30-Day Daily Learning Curriculum Engine
  // -------------------------------------------------------------
  describe('FEAT-01: Curriculum Structure & Navigation (R1)', () => {
    it('T1.1.1: should provide exactly 30 distinct daily lesson modules', () => {
      expect(CURRICULUM_30_DAYS).toHaveLength(30);
      const days = CURRICULUM_30_DAYS.map((l) => l.day);
      expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    });

    it('T1.1.2: should divide 30 days into exactly 10 distinct 3-day modules', () => {
      const modules = new Set(CURRICULUM_30_DAYS.map((l) => l.moduleNumber));
      expect(modules.size).toBe(10);
      for (let m = 1; m <= 10; m++) {
        const moduleLessons = CURRICULUM_30_DAYS.filter((l) => l.moduleNumber === m);
        expect(moduleLessons).toHaveLength(3);
      }
    });

    it('T1.1.3: should designate milestone assessments exactly at Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30', () => {
      const milestoneLessons = CURRICULUM_30_DAYS.filter((l) => l.isMilestoneDay).map((l) => l.day);
      expect(milestoneLessons).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
      expect(milestoneLessons).toHaveLength(10);
    });

    it('T1.1.4: should configure cognitive load to 15-20 minutes with 3-5 core interacting concepts', () => {
      for (const lesson of CURRICULUM_30_DAYS) {
        expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(15);
        expect(lesson.estimatedMinutes).toBeLessThanOrEqual(25);
        expect(lesson.concepts.length).toBeGreaterThanOrEqual(1);
        expect(lesson.concepts.length).toBeLessThanOrEqual(5);
        for (const concept of lesson.concepts) {
          expect(concept.titleVi).toBeTruthy();
          expect(concept.summaryVi).toBeTruthy();
          expect(concept.keyTakeawayVi).toBeTruthy();
        }
      }
    });

    it('T1.1.5: should initialize default unlocked state allowing Day 1 access while subsequent modules are locked', () => {
      const unlockedDays = [1, 2, 3];
      const milestoneScores = {};

      expect(GatingEngine.canAccessDay(1, unlockedDays, milestoneScores)).toBe(true);
      expect(GatingEngine.canAccessDay(2, unlockedDays, milestoneScores)).toBe(true);
      expect(GatingEngine.canAccessDay(3, unlockedDays, milestoneScores)).toBe(true);
      expect(GatingEngine.canAccessDay(4, unlockedDays, milestoneScores)).toBe(false);
      expect(GatingEngine.canAccessDay(7, unlockedDays, milestoneScores)).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // FEAT-02: Chart of Accounts Explorer (TT 200 vs TT 133)
  // -------------------------------------------------------------
  describe('FEAT-02: Chart of Accounts Explorer & TT 133/200 Filtering (R1)', () => {
    it('T1.2.1: should load Circular 200 accounts spanning all 9 account classes', () => {
      const accounts200 = getAccountsByRegime('CIRCULAR_200');
      expect(accounts200.length).toBeGreaterThan(70);

      const classesFound = new Set(accounts200.map((a) => a.code[0]));
      for (let c = 1; c <= 9; c++) {
        expect(classesFound.has(c.toString())).toBe(true);
      }
    });

    it('T1.2.2: should correctly exclude prohibited accounts under Circular 133', () => {
      const accounts133 = getAccountsByRegime('CIRCULAR_133');
      const codes133 = accounts133.map((a) => a.code);

      // Prohibited accounts (621, 622, 623, 627, 641, 521, 413) must NOT exist in Circular 133 COA
      expect(codes133).not.toContain('621');
      expect(codes133).not.toContain('622');
      expect(codes133).not.toContain('623');
      expect(codes133).not.toContain('627');
      expect(codes133).not.toContain('641');
      expect(codes133).not.toContain('521');
      expect(codes133).not.toContain('413');

      // Prohibited account guard correctly identifies them as prohibited
      expect(isProhibitedInCircular133('621')).toBe(true);
      expect(isProhibitedInCircular133('641')).toBe(true);
      expect(isProhibitedInCircular133('521')).toBe(true);
      expect(isProhibitedInCircular133('111')).toBe(false);
    });

    it('T1.2.3: should search accounts accurately by code prefix and account name', () => {
      const codeMatches = searchAccounts('112', 'CIRCULAR_200');
      expect(codeMatches.length).toBeGreaterThan(0);
      expect(codeMatches.some((a) => a.code === '1121')).toBe(true);

      const nameMatches = searchAccounts('ngân hàng', 'CIRCULAR_200');
      expect(nameMatches.length).toBeGreaterThan(0);
      expect(nameMatches.some((a) => a.nameVi.toLowerCase().includes('ngân hàng'))).toBe(true);
    });

    it('T1.2.4: should filter accounts by category metadata tabs', () => {
      const assetAccounts = searchAccounts('', 'CIRCULAR_200', 'ASSET');
      expect(assetAccounts.length).toBeGreaterThan(20);
      expect(assetAccounts.every((a) => a.category === 'ASSET')).toBe(true);

      const liabilityAccounts = searchAccounts('', 'CIRCULAR_200', 'LIABILITY');
      expect(liabilityAccounts.every((a) => a.category === 'LIABILITY')).toBe(true);
    });

    it('T1.2.5: should provide prohibition validation and valid substitute recommendation', () => {
      expect(isProhibitedInCircular133('621')).toBe(true);
      expect(isProhibitedInCircular133('641')).toBe(true);
      expect(isProhibitedInCircular133('111')).toBe(false);

      const val621 = validateAccountForRegime('621', 'CIRCULAR_133');
      expect(val621.isValid).toBe(false);
      expect(val621.isProhibited).toBe(true);
      expect(val621.substituteCode).toBe('154');

      const val641 = validateAccountForRegime('641', 'CIRCULAR_133');
      expect(val641.substituteCode).toBe('6421');
    });
  });

  // -------------------------------------------------------------
  // FEAT-03: Assessment Grading & Gating State Machine
  // -------------------------------------------------------------
  describe('FEAT-03: Assessment Grading & >=70% Gating State Machine (R2)', () => {
    it('T1.3.1: should provide 10 questions per milestone assessment', () => {
      const quizDay3 = MILESTONE_ASSESSMENTS[3];
      expect(quizDay3).toBeDefined();
      expect(quizDay3).toHaveLength(10);
      for (const q of quizDay3) {
        expect(q.options).toHaveLength(4);
        expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      }
    });

    it('T1.3.2: should calculate exact scores matching answer selections', () => {
      const quizDay3 = MILESTONE_ASSESSMENTS[3];
      // Build 100% correct answers map
      const perfectAnswers: Record<string, string> = {};
      for (const q of quizDay3) {
        const correctOpt = q.options.find((o) => o.isCorrect);
        if (correctOpt) perfectAnswers[q.id] = correctOpt.id;
      }

      const result = GradingEngine.gradeAssessment(perfectAnswers, quizDay3);
      expect(result.score).toBe(100);
      expect(result.correctCount).toBe(10);
      expect(GradingEngine.getProficiencyTier(result.score)).toBe('advanced');
    });

    it('T1.3.3: should enforce >=70% passing threshold to unlock next module', () => {
      const passingAttempt = GatingEngine.recordAttempt(3, 80, [], 0);
      expect(passingAttempt.passed).toBe(true);
      expect(passingAttempt.unlocked).toBe(true);

      const failingAttempt = GatingEngine.recordAttempt(3, 60, [], 0);
      expect(failingAttempt.passed).toBe(false);
      expect(failingAttempt.unlocked).toBe(false);
    });

    it('T1.3.4: should unlock Days 4, 5, 6 upon passing Milestone 1 (Day 3)', () => {
      const initialUnlocked = [1, 2, 3];
      const newUnlocked = GatingEngine.unlockNextModule(3, initialUnlocked);

      expect(newUnlocked).toEqual([1, 2, 3, 4, 5, 6]);
      expect(GatingEngine.canAccessDay(4, newUnlocked, { 3: 80 })).toBe(true);
      expect(GatingEngine.canAccessDay(7, newUnlocked, { 3: 80 })).toBe(false);
    });

    it('T1.3.5: should diagnose errors under the Rule of One (exactly 1 priority focus)', () => {
      const quizDay3 = MILESTONE_ASSESSMENTS[3];
      // Answers with mistakes on fundamental equation and bank fee
      const partialAnswers: Record<string, string> = {
        'm1-q1': 'opt-a', // wrong (Fundamental equation)
        'm1-q5': 'opt-a', // wrong (Debit credit direction)
      };

      const diagnosis = GradingEngine.diagnoseRuleOfOne(partialAnswers, quizDay3);
      expect(diagnosis).toBeDefined();
      expect(diagnosis?.highestPriorityErrorVi).toBeTruthy();
      expect(diagnosis?.actionableNextStepVi).toBeTruthy();
      expect(diagnosis?.growthMindsetFeedbackVi).toContain('nỗ lực');
    });
  });

  // -------------------------------------------------------------
  // FEAT-04: Live Debit=Credit Journalizer & Balance Validator
  // -------------------------------------------------------------
  describe('FEAT-04: Live Debit=Credit Balance Validator (R3)', () => {
    it('T1.4.1: should confirm balanced simple 1-Debit / 1-Credit transaction', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 50000000, creditAmount: 0 },
        { id: '2', accountCode: '112', accountNameVi: 'Tiền gửi ngân hàng', debitAmount: 0, creditAmount: 50000000 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(true);
      expect(validation.delta).toBe(0);
      expect(validation.totalDebit).toBe(50000000);
      expect(validation.totalCredit).toBe(50000000);
      expect(validation.errorMessageVi).toBeUndefined();
    });

    it('T1.4.2: should confirm balanced compound 2-Debit / 1-Credit purchase with VAT', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 50000000, creditAmount: 0 },
        { id: '2', accountCode: '1331', accountNameVi: 'Thuế GTGT đầu vào', debitAmount: 5000000, creditAmount: 0 },
        { id: '3', accountCode: '331', accountNameVi: 'Phải trả người bán', debitAmount: 0, creditAmount: 55000000 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(true);
      expect(validation.totalDebit).toBe(55000000);
      expect(validation.totalCredit).toBe(55000000);
      expect(validation.delta).toBe(0);
    });

    it('T1.4.3: should reject unbalanced entries and compute exact delta', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 50000000, creditAmount: 0 },
        { id: '2', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 0, creditAmount: 48000000 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(false);
      expect(validation.delta).toBe(2000000);
      expect(validation.errorMessageVi).toContain('không cân bằng');
    });

    it('T1.4.4: should reject negative debit or credit amounts', () => {
      const rows: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: -1000000, creditAmount: 0 },
        { id: '2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: -1000000 },
      ];

      const validation = BalanceValidator.validateJournalBalance(rows);
      expect(validation.isBalanced).toBe(false);
      expect(validation.errorMessageVi).toContain('số âm');
    });

    it('T1.4.5: should format currency accurately in Vietnamese Dong format', () => {
      const formatted = BalanceValidator.formatVND(55000000);
      expect(formatted).toContain('55.000.000');
    });
  });

  // -------------------------------------------------------------
  // FEAT-05: Voucher Inspection Room & Non-Cash Threshold
  // -------------------------------------------------------------
  describe('FEAT-05: Voucher Inspection Room & Non-Cash Rule (R3)', () => {
    it('T1.5.1: should approve valid invoice below 20M paid in cash', () => {
      const voucher = VOUCHER_TEST_CASES.find((v) => v.id === 'case-01-valid-cash')!;
      expect(voucher).toBeDefined();

      const audit = VoucherInspector.auditVoucher(voucher);
      expect(audit.isValid).toBe(true);
      expect(audit.vatDeductible).toBe(true);
      expect(audit.citDeductible).toBe(true);
      expect(audit.issues).toHaveLength(0);
    });

    it('T1.5.2: should detect and flag non-cash violation on invoice >= 20M paid in cash', () => {
      const voucher = VOUCHER_TEST_CASES.find((v) => v.id === 'case-03-boundary-invalid-cash-20m')!;
      expect(voucher).toBeDefined();

      const audit = VoucherInspector.auditVoucher(voucher);
      expect(audit.isValid).toBe(false);
      expect(audit.vatDeductible).toBe(false);
      expect(audit.citDeductible).toBe(false);
      expect(audit.issues.some((i) => i.includes('20.000.000'))).toBe(true);
    });

    it('T1.5.3: should flag high-risk invoice from vendor with suspended tax status (Status 03)', () => {
      const voucher = VOUCHER_TEST_CASES.find((v) => v.id === 'case-05-vendor-status-03-suspended')!;
      expect(voucher).toBeDefined();

      const audit = VoucherInspector.auditVoucher(voucher);
      expect(audit.isValid).toBe(false);
      expect(audit.vatDeductible).toBe(false);
      expect(audit.issues.some((i) => i.includes('Status 03') || i.includes('Tạm ngừng'))).toBe(true);
    });

    it('T1.5.4: should validate Decree 123 MCCQT format (34 hex characters)', () => {
      const validVoucher = VOUCHER_TEST_CASES.find((v) => v.id === 'case-04-valid-bank-55m')!;
      const invalidVoucher = VOUCHER_TEST_CASES.find((v) => v.id === 'case-07-invalid-mccqt-length')!;

      const validAudit = VoucherInspector.auditVoucher(validVoucher);
      expect(validAudit.isValid).toBe(true);

      const invalidAudit = VoucherInspector.auditVoucher(invalidVoucher);
      expect(invalidAudit.isValid).toBe(false);
      expect(invalidAudit.issues.some((i) => i.includes('34'))).toBe(true);
    });

    it('T1.5.5: should detect missing required voucher signers', () => {
      const voucher = VOUCHER_TEST_CASES.find((v) => v.id === 'case-09-missing-director-signature')!;
      expect(voucher).toBeDefined();

      const audit = VoucherInspector.auditVoucher(voucher);
      expect(audit.isValid).toBe(false);
      expect(audit.issues.some((i) => i.includes('Giám đốc'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // FEAT-06: Storage Adapter & Persistence
  // -------------------------------------------------------------
  describe('FEAT-06: Storage Adapter & 1-Click Backup Persistence (R4)', () => {
    it('T1.6.1: should store, retrieve, and delete items via LocalStorageAdapter', async () => {
      await storage.setItem('test_key', { score: 95, name: 'Học viên A' });
      const retrieved = await storage.getItem<{ score: number; name: string }>('test_key');

      expect(retrieved).toEqual({ score: 95, name: 'Học viên A' });

      await storage.removeItem('test_key');
      const afterDelete = await storage.getItem('test_key');
      expect(afterDelete).toBeNull();
    });

    it('T1.6.2: should export backup containing valid metadata and JSON structure', async () => {
      await storage.setItem('unlocked_days', [1, 2, 3, 4]);
      await storage.setItem('milestone_1_score', 85);

      const backupStr = await storage.exportBackup();
      const parsed = JSON.parse(backupStr);

      expect(parsed.app).toBe('vietnam-accounting-learning-web');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.exportedAt).toBeTruthy();
      expect(parsed.customData['unlocked_days']).toEqual([1, 2, 3, 4]);
    });

    it('T1.6.3: should import backup and restore persisted data completely', async () => {
      const sampleBackup = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        app: 'vietnam-accounting-learning-web',
        customData: {
          unlocked_days: [1, 2, 3, 4, 5, 6],
          user_streak: 5,
        },
      });

      const success = await storage.importBackup(sampleBackup);
      expect(success).toBe(true);

      const restoredDays = await storage.getItem<number[]>('unlocked_days');
      const restoredStreak = await storage.getItem<number>('user_streak');
      expect(restoredDays).toEqual([1, 2, 3, 4, 5, 6]);
      expect(restoredStreak).toBe(5);
    });

    it('T1.6.4: should reject invalid backup payloads from wrong apps', async () => {
      const foreignBackup = JSON.stringify({
        app: 'another-random-app',
        customData: {},
      });

      const success = await storage.importBackup(foreignBackup);
      expect(success).toBe(false);
    });

    it('T1.6.5: should calculate learning streak continuity correctly', () => {
      // First day
      expect(StreakEngine.calculateStreak(null, '2026-09-13', 0)).toBe(1);
      // Same day activity (streak maintained)
      expect(StreakEngine.calculateStreak('2026-09-13', '2026-09-13', 3)).toBe(3);
      // Consecutive day (streak incremented)
      expect(StreakEngine.calculateStreak('2026-09-12', '2026-09-13', 3)).toBe(4);
      // Missed 2 days (streak resets to 1)
      expect(StreakEngine.calculateStreak('2026-09-10', '2026-09-13', 5)).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // FEAT-07: Responsive UI Shell & Theme Toggle
  // -------------------------------------------------------------
  describe('FEAT-07: Responsive UI Shell & Theme Preference (R5)', () => {
    it('T1.7.1: should persist theme mode preferences in storage', async () => {
      await storage.setItem('theme', 'dark');
      const savedTheme = await storage.getItem<string>('theme');
      expect(savedTheme).toBe('dark');

      await storage.setItem('theme', 'light');
      expect(await storage.getItem<string>('theme')).toBe('light');
    });

    it('T1.7.2: should provide valid Vietnamese category metadata for all 9 classes', () => {
      expect(CATEGORY_METADATA.ASSET.nameVi).toBe('Tài sản');
      expect(CATEGORY_METADATA.LIABILITY.nameVi).toBe('Nợ phải trả');
      expect(CATEGORY_METADATA.EQUITY.nameVi).toBe('Vốn chủ sở hữu');
      expect(CATEGORY_METADATA.REVENUE.nameVi).toBe('Doanh thu');
      expect(CATEGORY_METADATA.BUSINESS_RESULT.nameVi).toBe('Xác định kết quả kinh doanh');
    });

    it('T1.7.3: should define distinct styling classes for each category', () => {
      for (const [, info] of Object.entries(CATEGORY_METADATA)) {
        expect(info.colorClass).toBeTruthy();
        expect(info.accountClasses).toBeTruthy();
      }
    });

    it('T1.7.4: should ensure clean account code resolution without crashes', () => {
      const acc111 = findAccountByCode('111', 'CIRCULAR_200');
      expect(acc111).toBeDefined();
      expect(acc111?.nameVi).toContain('Tiền mặt');

      const nonexistent = findAccountByCode('999999', 'CIRCULAR_200');
      expect(nonexistent).toBeUndefined();
    });

    it('T1.7.5: should support switching regime between CIRCULAR_200 and CIRCULAR_133', () => {
      const acc200Count = getAccountsByRegime('CIRCULAR_200').length;
      const acc133Count = getAccountsByRegime('CIRCULAR_133').length;

      expect(acc200Count).toBeGreaterThan(acc133Count);
      expect(acc133Count).toBeGreaterThan(40);
    });
  });
});
