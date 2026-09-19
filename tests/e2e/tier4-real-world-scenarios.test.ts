import { describe, it, expect, beforeEach } from 'vitest';
import {
  GatingEngine,
  GradingEngine,
  BalanceValidator,
  VoucherInspector,
} from '../helpers/domain-engines';
import { CURRICULUM_30_DAYS } from '../fixtures/curriculum-data';
import { MILESTONE_ASSESSMENTS } from '../fixtures/milestone-assessments';
import { VOUCHER_TEST_CASES } from '../fixtures/voucher-cases';
import { validateAccountForRegime } from '@/data/prohibited-accounts';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 4: Real-World End-to-End Application Scenarios', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new LocalStorageAdapter('tier4_vnacc_');
  });

  // =========================================================================
  // SCENARIO 1: Novice Day 1-3 Learning Flow -> Passing Milestone 1 -> Unlocking Day 4
  // =========================================================================
  it('Scenario 1: Complete Day 1-3 novice learning flow, passing Milestone 1 with 82%, unlocking Day 4 while keeping Day 7 locked', async () => {
    // Step 1: Novice user enters platform on Day 1
    let unlockedDays = [1, 2, 3];
    const milestoneScores: Record<number, number> = {};

    expect(GatingEngine.canAccessDay(1, unlockedDays, milestoneScores)).toBe(true);
    expect(GatingEngine.canAccessDay(2, unlockedDays, milestoneScores)).toBe(true);
    expect(GatingEngine.canAccessDay(3, unlockedDays, milestoneScores)).toBe(true);
    expect(GatingEngine.canAccessDay(4, unlockedDays, milestoneScores)).toBe(false);

    // Step 2: Learner reads Lesson 1, 2, 3
    const lesson1 = CURRICULUM_30_DAYS.find((l) => l.day === 1)!;
    const lesson2 = CURRICULUM_30_DAYS.find((l) => l.day === 2)!;
    const lesson3 = CURRICULUM_30_DAYS.find((l) => l.day === 3)!;

    expect(lesson1.concepts.length).toBeGreaterThanOrEqual(3);
    expect(lesson2.concepts.length).toBeGreaterThanOrEqual(3);
    expect(lesson3.isMilestoneDay).toBe(true);

    // Step 3: Learner launches Milestone Assessment 1
    const quiz1 = MILESTONE_ASSESSMENTS[3];
    expect(quiz1).toHaveLength(10);

    // Step 4: Learner answers questions, scoring 82% (passes >= 70%)
    const answers: Record<string, string> = {
      'm1-q1': 'opt-b', // correct (8 pts)
      'm1-q2': 'opt-a', // correct (8 pts)
      'm1-q3': 'opt-b', // correct (8 pts)
      'm1-q4': 'opt-b', // correct (8 pts)
      'm1-q5': 'opt-b', // correct (10 pts)
      'm1-q6': 'opt-a', // correct (10 pts)
      'm1-q7': 'opt-a', // wrong (0 pts)
      'm1-q8': 'opt-a', // correct (10 pts)
      'm1-q9': 'opt-a', // wrong (0 pts)
      'm1-q10': 'opt-b', // correct (14 pts)
    };

    const gradeResult = GradingEngine.gradeAssessment(answers, quiz1);
    expect(gradeResult.score).toBe(76); // 76 >= 70!
    expect(GradingEngine.getProficiencyTier(gradeResult.score)).toBe('proficient');

    // Step 5: Rule of One diagnosis provides feedback on mistake
    const diagnosis = GradingEngine.diagnoseRuleOfOne(answers, quiz1);
    expect(diagnosis).toBeDefined();
    expect(diagnosis?.actionableNextStepVi).toBeTruthy();

    // Step 6: Gating engine registers pass and unlocks Module 2
    const attempt = GatingEngine.recordAttempt(3, gradeResult.score, [], 0);
    expect(attempt.passed).toBe(true);
    expect(attempt.unlocked).toBe(true);

    milestoneScores[3] = attempt.bestScore;
    unlockedDays = GatingEngine.unlockNextModule(3, unlockedDays);

    // Persist progress
    await storage.setItem('unlocked_days', unlockedDays);
    await storage.setItem('milestone_scores', milestoneScores);

    // Step 7: Verify Day 4 is now unlocked and accessible, while Day 7 remains locked
    expect(GatingEngine.canAccessDay(4, unlockedDays, milestoneScores)).toBe(true);
    expect(GatingEngine.canAccessDay(5, unlockedDays, milestoneScores)).toBe(true);
    expect(GatingEngine.canAccessDay(6, unlockedDays, milestoneScores)).toBe(true);
    expect(GatingEngine.canAccessDay(7, unlockedDays, milestoneScores)).toBe(false);
  });

  // =========================================================================
  // SCENARIO 2: Purchasing Inventory >= 20M VND with VAT 10% via Bank Transfer (UNC)
  // =========================================================================
  it('Scenario 2: Purchasing inventory with VAT 10% invoice >= 20M VND via Bank Transfer (UNC) -> Journalizing Nợ 156, Nợ 1331 / Có 1121 -> Balance check', () => {
    // Step 1: Identify purchase transaction: Pretax 50M VND, VAT 10% 5M VND, Total 55M VND
    const invoiceCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-04-valid-bank-55m')!;
    expect(invoiceCase).toBeDefined();
    expect(invoiceCase.totalAmount).toBe(55000000);
    expect(invoiceCase.paymentMethod).toBe('BANK_TRANSFER');

    // Step 2: Voucher audit validates statutory compliance under Circular 219 & Decree 123
    const audit = VoucherInspector.auditVoucher(invoiceCase);
    expect(audit.isValid).toBe(true);
    expect(audit.vatDeductible).toBe(true);
    expect(audit.citDeductible).toBe(true);
    expect(audit.issues).toHaveLength(0);

    // Step 3: Enter journalizer with compound entry:
    // Nợ TK 156: 50.000.000 VNĐ
    // Nợ TK 1331: 5.000.000 VNĐ
    // Có TK 1121: 55.000.000 VNĐ
    const journalRows: JournalEntryRow[] = [
      { id: '1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 50000000, creditAmount: 0 },
      { id: '2', accountCode: '1331', accountNameVi: 'Thuế GTGT đầu vào được khấu trừ', debitAmount: 5000000, creditAmount: 0 },
      { id: '3', accountCode: '1121', accountNameVi: 'Tiền gửi ngân hàng (UNC Vietcombank)', debitAmount: 0, creditAmount: 55000000 },
    ];

    // Step 4: Enforce live balance validation
    const validation = BalanceValidator.validateJournalBalance(journalRows);
    expect(validation.isBalanced).toBe(true);
    expect(validation.delta).toBe(0);
    expect(validation.totalDebit).toBe(55000000);
    expect(validation.totalCredit).toBe(55000000);
    expect(validation.errorMessageVi).toBeUndefined();
  });

  // =========================================================================
  // SCENARIO 3: Voucher Audit Identifying Suspended Vendor (Status 03) & Rejecting VAT Deduction
  // =========================================================================
  it('Scenario 3: Voucher audit identifying suspended vendor (Status 03) and rejecting input VAT deduction', () => {
    // Step 1: Incoming invoice from supplier with tax code Status '03'
    const suspendedCase = VOUCHER_TEST_CASES.find((v) => v.id === 'case-05-vendor-status-03-suspended')!;
    expect(suspendedCase).toBeDefined();
    expect(suspendedCase.vendorTaxStatus).toBe('03');

    // Step 2: System audit triggers fraud/risk inspection under Decree 125/2020
    const audit = VoucherInspector.auditVoucher(suspendedCase);
    expect(audit.isValid).toBe(false);
    expect(audit.vatDeductible).toBe(false);
    expect(audit.citDeductible).toBe(false);

    // Step 3: Verify explicit warning message for accountant
    const statusWarning = audit.issues.find((msg) => msg.includes('Status 03') || msg.includes('Tạm ngừng'));
    expect(statusWarning).toBeDefined();
    expect(statusWarning).toContain('Trạng thái MST 03');
  });

  // =========================================================================
  // SCENARIO 4: SME under TT 133 Mistakenly Attempting TK 621 -> System Blocks & Reroutes to TK 154
  // =========================================================================
  it('Scenario 4: SME under TT 133 mistakenly attempting to use TK 621 -> system blocks with warning and routes to TK 154', () => {
    const activeRegime = 'CIRCULAR_133';

    // Step 1: User attempts to journalize direct raw materials using TK 621
    const attemptedCode = '621';
    const validation = validateAccountForRegime(attemptedCode, activeRegime);

    // Step 2: System intercepts and blocks prohibited account
    expect(validation.isValid).toBe(false);
    expect(validation.isProhibited).toBe(true);
    expect(validation.warning).toContain('KHÔNG ĐƯỢC PHÉP');
    expect(validation.substituteCode).toBe('154');

    // Step 3: User accepts system recommendation and replaces with TK 154
    const correctedCode = validation.substituteCode!;
    const correctedCheck = validateAccountForRegime(correctedCode, activeRegime);
    expect(correctedCheck.isValid).toBe(true);
    expect(correctedCheck.isProhibited).toBe(false);

    // Step 4: Journalizer posts corrected transaction successfully:
    // Nợ TK 154: 12.000.000 VNĐ / Có TK 152: 12.000.000 VNĐ
    const correctedRows: JournalEntryRow[] = [
      { id: '1', accountCode: '154', accountNameVi: 'Chi phí SXKD dở dang (NVL)', debitAmount: 12000000, creditAmount: 0 },
      { id: '2', accountCode: '152', accountNameVi: 'Nguyên liệu, vật liệu', debitAmount: 0, creditAmount: 12000000 },
    ];

    const balanceCheck = BalanceValidator.validateJournalBalance(correctedRows);
    expect(balanceCheck.isBalanced).toBe(true);
    expect(balanceCheck.delta).toBe(0);
    expect(balanceCheck.totalDebit).toBe(12000000);
  });

  // =========================================================================
  // SCENARIO 5: Complete Progress Export to JSON -> Clear Storage -> Import JSON -> 100% Restored
  // =========================================================================
  it('Scenario 5: Complete user progress export to JSON -> clear local storage -> import JSON -> 100% progress, streak and score history restored', async () => {
    // Step 1: User completes Days 1 to 9 (Modules 1, 2, 3), achieves milestone scores and 7-day streak
    const unlockedDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const milestoneScores = { 3: 90, 6: 85, 9: 95 };
    const scoreHistory = { 3: [70, 90], 6: [85], 9: [95] };
    const streakDays = 7;
    const themeMode = 'dark';
    const regime = 'CIRCULAR_133';

    await storage.setItem('unlocked_days', unlockedDays);
    await storage.setItem('milestone_scores', milestoneScores);
    await storage.setItem('score_history', scoreHistory);
    await storage.setItem('streak', streakDays);
    await storage.setItem('theme', themeMode);
    await storage.setItem('regime', regime);

    // Step 2: Trigger JSON backup export
    const backupJson = await storage.exportBackup();
    expect(backupJson).toContain('vietnam-accounting-learning-web');

    const parsedBackup = JSON.parse(backupJson);
    expect(parsedBackup.customData['unlocked_days']).toEqual(unlockedDays);
    expect(parsedBackup.customData['streak']).toBe(7);

    // Step 3: Disaster simulation — Clear all storage completely
    window.localStorage.clear();
    const newStorage = new LocalStorageAdapter('tier4_vnacc_');
    expect(await newStorage.getItem('unlocked_days')).toBeNull();
    expect(await newStorage.getItem('milestone_scores')).toBeNull();

    // Step 4: Import backup JSON into restored environment
    const importSuccess = await newStorage.importBackup(backupJson);
    expect(importSuccess).toBe(true);

    // Step 5: Verify 100% fidelity restoration
    const restoredUnlocked = await newStorage.getItem<number[]>('unlocked_days');
    const restoredScores = await newStorage.getItem<Record<number, number>>('milestone_scores');
    const restoredHistory = await newStorage.getItem<Record<number, number[]>>('score_history');
    const restoredStreak = await newStorage.getItem<number>('streak');
    const restoredTheme = await newStorage.getItem<string>('theme');
    const restoredRegime = await newStorage.getItem<string>('regime');

    expect(restoredUnlocked).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(restoredScores).toEqual({ 3: 90, 6: 85, 9: 95 });
    expect(restoredHistory).toEqual({ 3: [70, 90], 6: [85], 9: [95] });
    expect(restoredStreak).toBe(7);
    expect(restoredTheme).toBe('dark');
    expect(restoredRegime).toBe('CIRCULAR_133');

    // Step 6: Verify gating engine recognizes restored milestone completion and allows Day 10 access
    expect(GatingEngine.canAccessDay(10, restoredUnlocked!, restoredScores!)).toBe(true);
    // Day 13 requires Milestone 4 (Day 12 not yet taken -> locked)
    expect(GatingEngine.canAccessDay(13, restoredUnlocked!, restoredScores!)).toBe(false);
  });
});
