import { describe, it, expect, beforeEach } from 'vitest';
import {
  GatingEngine,
  GradingEngine,
  BalanceValidator,
  VoucherInspector,
  StreakEngine,
} from '../helpers/domain-engines';
import { searchAccounts } from '@/data/coa-service';
import { validateAccountForRegime } from '@/data/prohibited-accounts';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { MILESTONE_ASSESSMENTS } from '../fixtures/milestone-assessments';
import { VOUCHER_TEST_CASES } from '../fixtures/voucher-cases';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 3: Cross-Feature Combinations & Pairwise Interactions', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new LocalStorageAdapter('tier3_vnacc_');
  });

  // -------------------------------------------------------------
  // Combination 1: Gating + Retake + Persistence
  // -------------------------------------------------------------
  it('T3.1: Gating + Retake + Persistence (fails at 60%, passes at 80%, persisted and verified on reload)', async () => {
    // 1. Initial state: Days 1, 2, 3 unlocked
    let unlockedDays = [1, 2, 3];
    let scoreHistory: number[] = [];
    let bestScore = 0;

    // 2. Attempt 1: Score 60% (Failed)
    const attempt1 = GatingEngine.recordAttempt(3, 60, scoreHistory, bestScore);
    expect(attempt1.passed).toBe(false);
    expect(attempt1.unlocked).toBe(false);
    expect(GatingEngine.canAccessDay(4, unlockedDays, { 3: attempt1.bestScore })).toBe(false);

    scoreHistory = attempt1.updatedHistory;
    bestScore = attempt1.bestScore;

    // Persist failure state
    await storage.setItem('unlocked_days', unlockedDays);
    await storage.setItem('m1_history', scoreHistory);
    await storage.setItem('m1_best', bestScore);

    // 3. Attempt 2: Retake score 80% (Passed!)
    const attempt2 = GatingEngine.recordAttempt(3, 80, scoreHistory, bestScore);
    expect(attempt2.passed).toBe(true);
    expect(attempt2.unlocked).toBe(true);
    expect(attempt2.bestScore).toBe(80);
    expect(attempt2.updatedHistory).toEqual([60, 80]);

    // Unlock subsequent module (Days 4, 5, 6)
    unlockedDays = GatingEngine.unlockNextModule(3, unlockedDays);
    expect(unlockedDays).toEqual([1, 2, 3, 4, 5, 6]);

    // Persist passed state
    await storage.setItem('unlocked_days', unlockedDays);
    await storage.setItem('m1_history', attempt2.updatedHistory);
    await storage.setItem('m1_best', attempt2.bestScore);

    // 4. Simulate page refresh / new storage instance
    const freshStorage = new LocalStorageAdapter('tier3_vnacc_');
    const persistedDays = await freshStorage.getItem<number[]>('unlocked_days');
    const persistedHistory = await freshStorage.getItem<number[]>('m1_history');
    const persistedBest = await freshStorage.getItem<number>('m1_best');

    expect(persistedDays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(persistedHistory).toEqual([60, 80]);
    expect(persistedBest).toBe(80);

    // Assert Day 4 remains accessible and Day 7 remains locked
    expect(GatingEngine.canAccessDay(4, persistedDays!, { 3: persistedBest! })).toBe(true);
    expect(GatingEngine.canAccessDay(7, persistedDays!, { 3: persistedBest! })).toBe(false);
  });

  // -------------------------------------------------------------
  // Combination 2: Journalizer + T-Account Live Balance Preview
  // -------------------------------------------------------------
  it('T3.2: Journalizer + T-Account Live Preview (posting balanced entry updates debit/credit sides)', () => {
    // Simulated T-Account state for TK 156 and TK 1121
    const tAccountState = {
      '156': { initialDebit: 10000000, initialCredit: 0, deltaDebit: 0, deltaCredit: 0 },
      '1121': { initialDebit: 50000000, initialCredit: 0, deltaDebit: 0, deltaCredit: 0 },
    };

    // User journalizes inventory purchase: Nợ 156: 20M / Có 1121: 20M
    const rows: JournalEntryRow[] = [
      { id: 'r1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 20000000, creditAmount: 0 },
      { id: 'r2', accountCode: '1121', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 20000000 },
    ];

    const validation = BalanceValidator.validateJournalBalance(rows);
    expect(validation.isBalanced).toBe(true);
    expect(validation.delta).toBe(0);

    // Apply to T-Accounts
    for (const row of rows) {
      if (row.accountCode === '156') {
        tAccountState['156'].deltaDebit += row.debitAmount;
      } else if (row.accountCode === '1121') {
        tAccountState['1121'].deltaCredit += row.creditAmount;
      }
    }

    // Ending balance calculation for Assets: Ending = Initial + Debit - Credit
    const ending156 =
      tAccountState['156'].initialDebit + tAccountState['156'].deltaDebit - tAccountState['156'].deltaCredit;
    const ending1121 =
      tAccountState['1121'].initialDebit + tAccountState['1121'].deltaDebit - tAccountState['1121'].deltaCredit;

    expect(ending156).toBe(30000000); // 10M + 20M
    expect(ending1121).toBe(30000000); // 50M - 20M
    // Balance invariant across both accounts preserved
    expect(ending156 + ending1121).toBe(60000000);
  });

  // -------------------------------------------------------------
  // Combination 3: Circular 133 Regime Switch + Prohibited Account Entry Validation
  // -------------------------------------------------------------
  it('T3.3: Regime Switch + Prohibited Account Validation (switching to TT 133 flags TK 621 and routes to TK 154)', () => {
    // Under Circular 200: TK 621 is completely valid
    const val200 = validateAccountForRegime('621', 'CIRCULAR_200');
    expect(val200.isValid).toBe(true);
    expect(val200.isProhibited).toBe(false);

    // User switches regime to Circular 133
    const val133 = validateAccountForRegime('621', 'CIRCULAR_133');
    expect(val133.isValid).toBe(false);
    expect(val133.isProhibited).toBe(true);
    expect(val133.warning).toContain('KHÔNG ĐƯỢC PHÉP sử dụng theo Thông tư 133/2016/TT-BTC');
    expect(val133.substituteCode).toBe('154');

    // Substituting with suggested TK 154 validates cleanly under Circular 133
    const valSub = validateAccountForRegime(val133.substituteCode!, 'CIRCULAR_133');
    expect(valSub.isValid).toBe(true);
    expect(valSub.isProhibited).toBe(false);
  });

  // -------------------------------------------------------------
  // Combination 4: Voucher Inspection + Journalizing Integration
  // -------------------------------------------------------------
  it('T3.4: Voucher Inspection + Journalizing Generation (approved invoice creates compliant journal entry)', () => {
    const invoiceCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-04-valid-bank-55m')!;
    expect(invoiceCase).toBeDefined();

    // 1. Audit invoice
    const audit = VoucherInspector.auditVoucher(invoiceCase);
    expect(audit.isValid).toBe(true);
    expect(audit.vatDeductible).toBe(true);

    // 2. Extract amounts and populate journalizer rows
    const journalRows: JournalEntryRow[] = [
      {
        id: 'j1',
        accountCode: '156',
        accountNameVi: 'Hàng hóa',
        debitAmount: invoiceCase.pretaxAmount!,
        creditAmount: 0,
      },
      {
        id: 'j2',
        accountCode: '1331',
        accountNameVi: 'Thuế GTGT đầu vào được khấu trừ',
        debitAmount: invoiceCase.vatAmount!,
        creditAmount: 0,
      },
      {
        id: 'j3',
        accountCode: '1121',
        accountNameVi: 'Tiền gửi ngân hàng (UNC)',
        debitAmount: 0,
        creditAmount: invoiceCase.totalAmount,
      },
    ];

    // 3. Balance verification
    const validation = BalanceValidator.validateJournalBalance(journalRows);
    expect(validation.isBalanced).toBe(true);
    expect(validation.totalDebit).toBe(55000000);
    expect(validation.totalCredit).toBe(55000000);
    expect(validation.delta).toBe(0);
  });

  // -------------------------------------------------------------
  // Combination 5: Backup/Restore + Gating State Synchronization
  // -------------------------------------------------------------
  it('T3.5: Backup/Restore + Gating State Synchronization (disaster recovery restores all unlocked modules)', async () => {
    // 1. Setup completed learner state at Day 12
    const originalUnlocked = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const originalMilestones = { 3: 85, 6: 90, 9: 75, 12: 80 };
    const originalStreak = 12;

    await storage.setItem('unlocked_days', originalUnlocked);
    await storage.setItem('milestone_scores', originalMilestones);
    await storage.setItem('streak', originalStreak);

    // 2. Generate backup JSON
    const backupJson = await storage.exportBackup();
    expect(backupJson).toContain('vietnam-accounting-learning-web');

    // 3. Wipe all storage
    window.localStorage.clear();
    const cleanStorage = new LocalStorageAdapter('tier3_vnacc_');
    expect(await cleanStorage.getItem('unlocked_days')).toBeNull();

    // 4. Import backup into fresh storage
    const restored = await cleanStorage.importBackup(backupJson);
    expect(restored).toBe(true);

    const restoredDays = await cleanStorage.getItem<number[]>('unlocked_days');
    const restoredMilestones = await cleanStorage.getItem<Record<number, number>>('milestone_scores');
    const restoredStreak = await cleanStorage.getItem<number>('streak');

    expect(restoredDays).toEqual(originalUnlocked);
    expect(restoredMilestones).toEqual(originalMilestones);
    expect(restoredStreak).toBe(12);

    // Gating verification: Days 1-12 accessible, Day 13 requires Milestone 4 (Day 12 score = 80 -> accessible!)
    expect(GatingEngine.canAccessDay(12, restoredDays!, restoredMilestones!)).toBe(true);
    expect(GatingEngine.canAccessDay(13, restoredDays!, restoredMilestones!)).toBe(true);
    // Day 16 requires Milestone 5 (Day 15 not yet taken -> locked!)
    expect(GatingEngine.canAccessDay(16, restoredDays!, restoredMilestones!)).toBe(false);
  });

  // -------------------------------------------------------------
  // Combination 6: Assessment Submission + Rule of One + Streak
  // -------------------------------------------------------------
  it('T3.6: Assessment Submission + Rule of One + Streak Engine (failing test triggers Rule of One without breaking streak)', () => {
    const quiz = MILESTONE_ASSESSMENTS[3];
    // Intentionally incorrect answers on question 1 and 5
    const answers: Record<string, string> = {
      'm1-q1': 'opt-a', // wrong (Fundamental equation)
      'm1-q2': 'opt-a', // correct (8 pts)
      'm1-q3': 'opt-b', // correct (8 pts)
      'm1-q4': 'opt-b', // correct (8 pts)
      'm1-q5': 'opt-a', // wrong (Debit credit direction)
      'm1-q6': 'opt-a', // correct (10 pts)
      'm1-q7': 'opt-b', // correct (10 pts)
      'm1-q8': 'opt-a', // correct (10 pts)
      'm1-q9': 'opt-b', // correct (14 pts)
      'm1-q10': 'opt-b', // correct (14 pts)
    };

    const grade = GradingEngine.gradeAssessment(answers, quiz);
    expect(grade.score).toBe(82); // 82 >= 70 (passed overall, but made mistakes)

    const diagnosis = GradingEngine.diagnoseRuleOfOne(answers, quiz);
    expect(diagnosis).toBeDefined();
    expect(diagnosis?.actionableNextStepVi).toBeTruthy();

    // Streak increments because user studied today
    const updatedStreak = StreakEngine.calculateStreak('2026-09-12', '2026-09-13', 4);
    expect(updatedStreak).toBe(5);
  });

  // -------------------------------------------------------------
  // Combination 7: COA Search + Regime Filter + Journalizer Validation
  // -------------------------------------------------------------
  it('T3.7: COA Search + Regime Filter + Journalizer (prohibited search exclusions protect journalizer)', () => {
    // In TT 133, searching for "bán hàng" returns active 6421, while prohibited 641 is excluded
    const results133 = searchAccounts('bán hàng', 'CIRCULAR_133');
    const codes133 = results133.map((a) => a.code);
    expect(codes133).toContain('6421');
    expect(codes133).not.toContain('641');

    // Selecting 6421 creates a valid balanced entry
    const validRows: JournalEntryRow[] = [
      { id: '1', accountCode: '6421', accountNameVi: 'Chi phí bán hàng', debitAmount: 2000000, creditAmount: 0 },
      { id: '2', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 0, creditAmount: 2000000 },
    ];
    const validation = BalanceValidator.validateJournalBalance(validRows);
    expect(validation.isBalanced).toBe(true);

    // If user manually inputs prohibited TK 641, regime check detects it
    const prohibitedCheck = validateAccountForRegime('641', 'CIRCULAR_133');
    expect(prohibitedCheck.isValid).toBe(false);
  });

  // -------------------------------------------------------------
  // Combination 8: Storage Persistence + Theme Mode Synchronization
  // -------------------------------------------------------------
  it('T3.8: Storage Persistence + Theme Mode (theme switch persists and reloads accurately)', async () => {
    await storage.setItem('theme_mode', 'dark');
    expect(await storage.getItem('theme_mode')).toBe('dark');

    await storage.setItem('theme_mode', 'light');
    expect(await storage.getItem('theme_mode')).toBe('light');

    // Clear and restore
    const backup = await storage.exportBackup();
    window.localStorage.clear();
    await storage.importBackup(backup);
    expect(await storage.getItem('theme_mode')).toBe('light');
  });

  // -------------------------------------------------------------
  // Combination 9: DOK Question Taxonomy Distribution & Weight Verification
  // -------------------------------------------------------------
  it('T3.9: DOK Question Taxonomy Weight Verification (DOK 1: 32%, DOK 2: 40%, DOK 3: 28%)', () => {
    const quiz = MILESTONE_ASSESSMENTS[3];
    const dok1 = quiz.filter((q) => q.dokLevel === 'DOK_1');
    const dok2 = quiz.filter((q) => q.dokLevel === 'DOK_2');
    const dok3 = quiz.filter((q) => q.dokLevel === 'DOK_3');

    expect(dok1).toHaveLength(4);
    expect(dok2).toHaveLength(4);
    expect(dok3).toHaveLength(2);

    const dok1Points = dok1.length * 8; // 32
    const dok2Points = dok2.length * 10; // 40
    const dok3Points = dok3.length * 14; // 28

    expect(dok1Points).toBe(32);
    expect(dok2Points).toBe(40);
    expect(dok3Points).toBe(28);
    expect(dok1Points + dok2Points + dok3Points).toBe(100);
  });

  // -------------------------------------------------------------
  // Combination 10: Multi-Module Gating Cascade
  // -------------------------------------------------------------
  it('T3.10: Multi-Module Gating Cascade (passing M1 unlocks M2; failing M2 blocks M3)', () => {
    let unlocked = [1, 2, 3];
    const scores: Record<number, number> = {};

    // 1. Take M1: Score 80% (Pass)
    scores[3] = 80;
    unlocked = GatingEngine.unlockNextModule(3, unlocked);
    expect(unlocked).toEqual([1, 2, 3, 4, 5, 6]);
    expect(GatingEngine.canAccessDay(4, unlocked, scores)).toBe(true);
    expect(GatingEngine.canAccessDay(6, unlocked, scores)).toBe(true);
    expect(GatingEngine.canAccessDay(7, unlocked, scores)).toBe(false);

    // 2. Take M2: Score 65% (Fail)
    scores[6] = 65;
    // Gating does NOT unlock Day 7
    expect(GatingEngine.canAccessDay(7, unlocked, scores)).toBe(false);

    // 3. Retake M2: Score 75% (Pass)
    scores[6] = 75;
    unlocked = GatingEngine.unlockNextModule(6, unlocked);
    expect(unlocked).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(GatingEngine.canAccessDay(7, unlocked, scores)).toBe(true);
    expect(GatingEngine.canAccessDay(9, unlocked, scores)).toBe(true);
    expect(GatingEngine.canAccessDay(10, unlocked, scores)).toBe(false);
  });
});
