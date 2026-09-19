import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  canAccessDay,
  isMilestonePassed,
  computeUnlockedDays,
  createInitialLearnerProgress,
  recordMilestoneAttempt,
  getPrerequisiteMilestone,
} from '@/engine/gating-engine';
import {
  gradeMilestoneAssessment,
  prioritizeErrors,
  diagnoseRuleOfOne,
  calculateProficiencyTier,
} from '@/engine/grading-engine';
import { StreakEngine, StreakState } from '@/engine/streak-engine';
import { StorageService } from '@/services/storage/storage-service';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import {
  isProhibitedInCircular133,
  validateAccountForRegime,
} from '@/data/prohibited-accounts';
import { getMilestoneTestByDay } from '@/data/milestone-tests';
import {
  BalanceValidator,
  VoucherInspector,
} from '../helpers/domain-engines';
import { AssessmentItem, MilestoneAssessmentResult } from '@/types/assessment';
import { JournalEntryRow } from '@/types/workbench';
import { LearnerProgress } from '@/types/curriculum';

/**
 * ============================================================================
 * TIER 5 WHITE-BOX ADVERSARIAL STRESS TEST SUITE
 * Milestone 5 Phase 2 — Quality Gate & Adversarial Vulnerability Challenge
 * ============================================================================
 *
 * Attack Batteries:
 * 1. Gating State Machine Bypass Attempts (Direct state tampering, negative days, out-of-bounds, locked day access).
 * 2. Grading Engine & Rule of One Exploits (Malformed answers, missing keys, priority tie-breaks, 69.9% vs 70.0%).
 * 3. Journalizer Mathematical Invariants (Extreme amounts, fractional values, circular entries, duplicate rows, prohibited accounts).
 * 4. Voucher Inspection Evasion (Borderline tax codes, cash limit thresholds 19,999,999 vs 20,000,000 VND, MCCQT).
 * 5. Storage Corruption & Prototype Pollution Injection (Crafted payloads, corrupted JSON, streak date shifts).
 */

describe('TIER 5 ADVERSARIAL WHITE-BOX CHALLENGE SUITE', () => {
  // ==========================================================================
  // BATTERY 1: Gating State Machine Bypass Attempts
  // ==========================================================================
  describe('Battery 1: Gating State Machine Bypass Attacks', () => {
    let progress: LearnerProgress;

    beforeEach(() => {
      progress = createInitialLearnerProgress();
    });

    describe('1.1 Direct State Tampering Resilience', () => {
      it('should invalidate directly tampered unlockedDays array when milestone scores are missing', () => {
        // Attack scenario: Attacker directly mutates progress object in memory/storage,
        // injecting all days [1..30] without completing any milestone test.
        const tamperedProgress: LearnerProgress = {
          ...progress,
          unlockedDays: Array.from({ length: 30 }, (_, i) => i + 1),
          milestoneScores: {}, // No milestone passed!
        };

        // Gating engine access verification relies on prerequisite milestone score, not tampered unlockedDays array
        expect(canAccessDay(4, tamperedProgress)).toBe(false);
        expect(canAccessDay(7, tamperedProgress)).toBe(false);
        expect(canAccessDay(15, tamperedProgress)).toBe(false);
        expect(canAccessDay(30, tamperedProgress)).toBe(false);

        // computeUnlockedDays must heal state by recalculating strictly from milestone completion
        const healedUnlocked = computeUnlockedDays(tamperedProgress);
        expect(healedUnlocked).toEqual([1, 2, 3]);
        expect(healedUnlocked).not.toContain(4);
        expect(healedUnlocked).not.toContain(30);
      });

      it('should prevent non-contiguous milestone bypass (passing M2 without M1)', () => {
        // Attack scenario: Learner somehow injects 100% on Milestone 2 (Day 6),
        // but never took Milestone 1 (Day 3).
        const nonContiguousProgress: LearnerProgress = {
          ...progress,
          milestoneScores: { 6: 100 }, // M2 passed, but M1 missing!
        };

        // Day 4 requires M1 (Day 3). Since M1 is not passed, Day 4 must remain locked!
        expect(canAccessDay(4, nonContiguousProgress)).toBe(false);

        // Day 7 requires ALL prior modules (M1 and M2). Since M1 is missing, Day 7 must be locked!
        expect(canAccessDay(7, nonContiguousProgress)).toBe(false);

        // computeUnlockedDays must halt at Day 3 because M1 is not passed
        const unlocked = computeUnlockedDays(nonContiguousProgress);
        expect(unlocked).toEqual([1, 2, 3]);
      });
    });

    describe('1.2 Boundary, Negative, and Out-of-Bounds Day IDs', () => {
      it('should strictly reject access for negative day numbers and zero', () => {
        expect(canAccessDay(0, progress)).toBe(false);
        expect(canAccessDay(-1, progress)).toBe(false);
        expect(canAccessDay(-100, progress)).toBe(false);
        expect(canAccessDay(-Number.MAX_SAFE_INTEGER, progress)).toBe(false);
      });

      it('should strictly reject access for out-of-bounds days beyond Day 30', () => {
        expect(canAccessDay(31, progress)).toBe(false);
        expect(canAccessDay(32, progress)).toBe(false);
        expect(canAccessDay(100, progress)).toBe(false);
        expect(canAccessDay(Number.MAX_SAFE_INTEGER, progress)).toBe(false);
        expect(canAccessDay(Infinity, progress)).toBe(false);
        expect(canAccessDay(-Infinity, progress)).toBe(false);
      });

      it('should return null prerequisite for negative or zero target days', () => {
        expect(getPrerequisiteMilestone(0)).toBeNull();
        expect(getPrerequisiteMilestone(-1)).toBeNull();
        expect(getPrerequisiteMilestone(1)).toBeNull();
        expect(getPrerequisiteMilestone(2)).toBeNull();
        expect(getPrerequisiteMilestone(3)).toBeNull();
      });
    });

    describe('1.3 Locked Day Access & Passing Threshold Gatekeeping (69.9% vs 70.0%)', () => {
      it('should keep Day 4 strictly locked when Milestone 1 achieves exactly 69.9% (below threshold)', () => {
        const attemptResult: MilestoneAssessmentResult = {
          milestoneDay: 3,
          score: 69.9,
          passed: false,
          proficiencyTier: 'developing',
          attemptTimestamp: new Date().toISOString(),
        };

        const updatedProgress = recordMilestoneAttempt(progress, attemptResult);

        expect(isMilestonePassed(3, updatedProgress)).toBe(false);
        expect(canAccessDay(4, updatedProgress)).toBe(false);
        expect(canAccessDay(5, updatedProgress)).toBe(false);
        expect(canAccessDay(6, updatedProgress)).toBe(false);
        expect(updatedProgress.unlockedDays).toEqual([1, 2, 3]);
      });

      it('should unlock Days 4, 5, 6 immediately when Milestone 1 achieves exactly 70.0% (at threshold)', () => {
        const attemptResult: MilestoneAssessmentResult = {
          milestoneDay: 3,
          score: 70.0,
          passed: true,
          proficiencyTier: 'proficient',
          attemptTimestamp: new Date().toISOString(),
        };

        const updatedProgress = recordMilestoneAttempt(progress, attemptResult);

        expect(isMilestonePassed(3, updatedProgress)).toBe(true);
        expect(canAccessDay(4, updatedProgress)).toBe(true);
        expect(canAccessDay(5, updatedProgress)).toBe(true);
        expect(canAccessDay(6, updatedProgress)).toBe(true);
        // Day 7 must remain locked until Milestone 2 (Day 6) is passed
        expect(canAccessDay(7, updatedProgress)).toBe(false);
        expect(updatedProgress.unlockedDays).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('should preserve best score and keep downstream days unlocked upon lower retake score', () => {
        // Attempt 1: 85% (Passed) -> Unlocks Day 4..6
        const attempt1: MilestoneAssessmentResult = {
          milestoneDay: 3,
          score: 85,
          passed: true,
          proficiencyTier: 'proficient',
          attemptTimestamp: '2026-09-13T10:00:00Z',
        };
        const afterAttempt1 = recordMilestoneAttempt(progress, attempt1);
        expect(canAccessDay(4, afterAttempt1)).toBe(true);
        expect(afterAttempt1.milestoneScores[3]).toBe(85);

        // Attempt 2: 40% (Failed retake)
        const attempt2: MilestoneAssessmentResult = {
          milestoneDay: 3,
          score: 40,
          passed: false,
          proficiencyTier: 'beginning',
          attemptTimestamp: '2026-09-13T11:00:00Z',
        };
        const afterAttempt2 = recordMilestoneAttempt(afterAttempt1, attempt2);

        // Invariant: Highest score (85%) must remain in milestoneScores
        expect(afterAttempt2.milestoneScores[3]).toBe(85);
        // Invariant: Day 4 must REMAIN unlocked
        expect(canAccessDay(4, afterAttempt2)).toBe(true);
        // Invariant: Score history must preserve all attempts
        expect(afterAttempt2.scoreHistory?.[3]).toHaveLength(2);
        expect(afterAttempt2.scoreHistory?.[3][0].score).toBe(85);
        expect(afterAttempt2.scoreHistory?.[3][1].score).toBe(40);
      });
    });
  });

  // ==========================================================================
  // BATTERY 2: Grading Engine & Rule of One Exploits
  // ==========================================================================
  describe('Battery 2: Grading Engine & Rule of One Exploits', () => {
    const testM1 = getMilestoneTestByDay(3)!;

    describe('2.1 Malformed, Injected & Pathological Answer Payloads', () => {
      it('should handle completely empty answers without error, yielding 0 score and beginning tier', () => {
        const result = gradeMilestoneAssessment(testM1, {});
        expect(result.score).toBe(0);
        expect(result.passed).toBe(false);
        expect(result.proficiencyTier).toBe('beginning');
        expect(result.itemResults).toHaveLength(10);
        expect(result.itemResults?.every((r) => !r.isCorrect)).toBe(true);
      });

      it('should ignore foreign / injected question IDs not part of the blueprint', () => {
        const maliciousAnswers: Record<string, string> = {
          'non_existent_q999': 'some_opt',
          '__proto__': 'polluted',
          'constructor': 'exploit',
          'drop_table': 'true',
        };

        const result = gradeMilestoneAssessment(testM1, maliciousAnswers);
        expect(result.score).toBe(0);
        expect(result.passed).toBe(false);
      });

      it('should safely handle type-confused answer payloads (null, undefined, numbers, objects)', () => {
        const typeConfusedAnswers: Record<string, any> = {
          [testM1.items[0].id]: null,
          [testM1.items[1].id]: undefined,
          [testM1.items[2].id]: 12345,
          [testM1.items[3].id]: {},
          [testM1.items[4].id]: ['array_val'],
          [testM1.items[5].id]: true,
          [testM1.items[6].id]: false,
          [testM1.items[7].id]: () => {},
        };

        expect(() => gradeMilestoneAssessment(testM1, typeConfusedAnswers)).not.toThrow();
        const result = gradeMilestoneAssessment(testM1, typeConfusedAnswers);
        expect(result.score).toBe(0);
      });
    });

    describe('2.2 Rule of One Priority Hierarchy & Tie-Breaking Rules', () => {
      it('should prioritize Priority 1 (Core Concepts) over Priority 2, 3, and 4', () => {
        const mockItems: AssessmentItem[] = [
          {
            id: 'err-p4',
            milestoneDay: 3,
            dokLevel: 'DOK_2',
            questionVi: 'Lỗi số học',
            options: [],
            explanationVi: 'Lỗi tính toán',
            errorPriority: 4,
          },
          {
            id: 'err-p3',
            milestoneDay: 3,
            dokLevel: 'DOK_2',
            questionVi: 'Lỗi chế độ TT 133',
            options: [],
            explanationVi: 'Tài khoản cấm',
            errorPriority: 3,
          },
          {
            id: 'err-p2',
            milestoneDay: 3,
            dokLevel: 'DOK_3',
            questionVi: 'Lỗi ngưỡng 20M',
            options: [],
            explanationVi: 'Vi phạm thanh toán',
            errorPriority: 2,
          },
          {
            id: 'err-p1',
            milestoneDay: 3,
            dokLevel: 'DOK_1',
            questionVi: 'Lỗi bản chất Nợ/Có',
            options: [],
            explanationVi: 'Đảo ngược đối ứng',
            errorPriority: 1,
          },
        ];

        const sorted = prioritizeErrors(mockItems);
        expect(sorted[0].id).toBe('err-p1');
        expect(sorted[0].errorPriority).toBe(1);
        expect(sorted[1].errorPriority).toBe(2);
        expect(sorted[2].errorPriority).toBe(3);
        expect(sorted[3].errorPriority).toBe(4);
      });

      it('should tie-break equal priority items by higher DOK level (DOK_3 > DOK_2 > DOK_1)', () => {
        // Two items both with Priority 2 (Statutory Tax Breach), but different DOK levels
        const itemDok1: AssessmentItem = {
          id: 'item-p2-dok1',
          milestoneDay: 6,
          dokLevel: 'DOK_1',
          questionVi: 'Nhận biết ngưỡng 20M (DOK 1)',
          options: [],
          explanationVi: 'Giải thích DOK 1',
          errorPriority: 2,
        };

        const itemDok3: AssessmentItem = {
          id: 'item-p2-dok3',
          milestoneDay: 6,
          dokLevel: 'DOK_3',
          questionVi: 'Phân tích hóa đơn phức tạp vi phạm 20M (DOK 3)',
          options: [],
          explanationVi: 'Giải thích DOK 3',
          errorPriority: 2,
        };

        const sorted = prioritizeErrors([itemDok1, itemDok3]);
        // DOK_3 item must be prioritized ahead of DOK_1 item!
        expect(sorted[0].id).toBe('item-p2-dok3');
        expect(sorted[1].id).toBe('item-p2-dok1');
      });

      it('should default missing errorPriority to 4 without throwing', () => {
        const itemWithoutPriority: AssessmentItem = {
          id: 'item-no-priority',
          milestoneDay: 3,
          dokLevel: 'DOK_1',
          questionVi: 'Câu hỏi không có độ ưu tiên',
          options: [],
          explanationVi: 'Giải thích chung',
        };

        const itemP1: AssessmentItem = {
          id: 'item-p1',
          milestoneDay: 3,
          dokLevel: 'DOK_1',
          questionVi: 'Câu hỏi P1',
          options: [],
          explanationVi: 'Giải thích P1',
          errorPriority: 1,
        };

        const sorted = prioritizeErrors([itemWithoutPriority, itemP1]);
        expect(sorted[0].id).toBe('item-p1');
        expect(sorted[1].id).toBe('item-no-priority');
      });
    });

    describe('2.3 Precision Boundaries (69.9% vs 70.0% & Tiers)', () => {
      it('should accurately classify proficiency tiers across strict numeric boundaries', () => {
        // Beginning: 0 - 49.99
        expect(calculateProficiencyTier(0)).toBe('beginning');
        expect(calculateProficiencyTier(49.99)).toBe('beginning');

        // Developing: 50.0 - 69.99
        expect(calculateProficiencyTier(50.0)).toBe('developing');
        expect(calculateProficiencyTier(69.99)).toBe('developing');

        // Proficient: 70.0 - 89.99
        expect(calculateProficiencyTier(70.0)).toBe('proficient');
        expect(calculateProficiencyTier(89.99)).toBe('proficient');

        // Advanced: 90.0 - 100
        expect(calculateProficiencyTier(90.0)).toBe('advanced');
        expect(calculateProficiencyTier(100)).toBe('advanced');
      });

      it('diagnoseRuleOfOne should provide perfect praise when 0 errors exist', () => {
        const diag = diagnoseRuleOfOne([], 100, 10);
        expect(diag.priorityLevel).toBeUndefined();
        expect(diag.highestPriorityErrorVi).toContain('Không có lỗi sai nào');
        expect(diag.growthMindsetFeedbackVi).toContain('Xuất sắc');
        expect(diag.actionableNextStepVi).toContain('sẵn sàng bước tiếp');
      });

      it('diagnoseRuleOfOne should produce exactly one focused recommendation when multiple errors exist', () => {
        const allItems = testM1.items;
        const diag = diagnoseRuleOfOne(allItems, 0, 10);
        expect(diag.highestPriorityErrorVi).toBeTruthy();
        expect(diag.growthMindsetFeedbackVi).toMatch(/thay vì dàn trải/i);
        expect(diag.actionableNextStepVi).toBeTruthy();
        expect(diag.priorityLevel).toBe(1); // M1 has Priority 1 items
      });
    });
  });

  // ==========================================================================
  // BATTERY 3: Journalizer Mathematical Invariants
  // ==========================================================================
  describe('Battery 3: Journalizer Mathematical Invariants', () => {
    describe('3.1 Extreme Currency Amounts & Number Limits', () => {
      it('should maintain mathematical equality with 100 Trillion VND (100,000,000,000,000)', () => {
        const oneHundredTrillion = 100_000_000_000_000;
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '1121',
            accountNameVi: 'Tiền gửi ngân hàng',
            debitAmount: oneHundredTrillion,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '4111',
            accountNameVi: 'Vốn góp của CSH',
            debitAmount: 0,
            creditAmount: oneHundredTrillion,
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(true);
        expect(validation.delta).toBe(0);
        expect(validation.totalDebit).toBe(oneHundredTrillion);
        expect(validation.totalCredit).toBe(oneHundredTrillion);
      });

      it('should handle Number.MAX_SAFE_INTEGER without integer overflow', () => {
        const maxSafe = Number.MAX_SAFE_INTEGER;
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: maxSafe,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1121',
            accountNameVi: 'Tiền gửi NH',
            debitAmount: 0,
            creditAmount: maxSafe,
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(true);
        expect(validation.delta).toBe(0);
      });
    });

    describe('3.2 Fractional Values & Sub-Dong Rounding', () => {
      it('should reject entry where rounded amounts equal 0 VND (e.g. 0.01 VND)', () => {
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: 0.01,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1121',
            accountNameVi: 'Tiền gửi NH',
            debitAmount: 0,
            creditAmount: 0.01,
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(false);
        expect(validation.errorMessageVi).toContain('lớn hơn 0');
      });

      it('should detect asymmetric rounding delta between 0.49 VND and 0.51 VND', () => {
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '156',
            accountNameVi: 'Hàng hóa',
            debitAmount: 10_000_000.49, // rounds to 10,000,000
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '331',
            accountNameVi: 'Phải trả NCC',
            debitAmount: 0,
            creditAmount: 10_000_000.51, // rounds to 10,000,001
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(false);
        expect(validation.delta).toBe(1);
      });

      it('should correctly balance split fractional transactions (1/3 + 2/3 = 1.0)', () => {
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '152',
            accountNameVi: 'NVL',
            debitAmount: 3_333_333.33,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1331',
            accountNameVi: 'VAT',
            debitAmount: 6_666_666.67,
            creditAmount: 0,
          },
          {
            id: 'r3',
            accountCode: '1121',
            accountNameVi: 'TGNH',
            debitAmount: 0,
            creditAmount: 10_000_000.0,
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(true);
        expect(validation.delta).toBe(0);
      });
    });

    describe('3.3 1 VND Delta Precision & Negative Number Safeguard', () => {
      it('should detect an imbalance of exactly 1 VND', () => {
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: 50_000_000,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1121',
            accountNameVi: 'Tiền gửi NH',
            debitAmount: 0,
            creditAmount: 49_999_999, // 1 VND difference!
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(false);
        expect(validation.delta).toBe(1);
        expect(validation.errorMessageVi).toContain('không cân bằng');
      });

      it('should strictly reject negative amounts in rows', () => {
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: -50_000_000,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1121',
            accountNameVi: 'Tiền gửi NH',
            debitAmount: 0,
            creditAmount: -50_000_000,
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(false);
        expect(validation.errorMessageVi).toContain('không được là số âm');
      });
    });

    describe('3.4 Prohibited Accounts Injection in Circular 133', () => {
      const PROHIBITED_CODES = ['621', '622', '623', '627', '641', '521', '413'];

      it.each(PROHIBITED_CODES)(
        'must identify account %s as prohibited under Circular 133 and block posting',
        (code) => {
          expect(isProhibitedInCircular133(code)).toBe(true);
          const validation = validateAccountForRegime(code, 'CIRCULAR_133');
          expect(validation.isValid).toBe(false);
          expect(validation.isProhibited).toBe(true);
          expect(validation.substituteCode).toBeTruthy();
        }
      );

      it.each(PROHIBITED_CODES)(
        'must permit account %s under Circular 200 without prohibition',
        (code) => {
          const validation = validateAccountForRegime(code, 'CIRCULAR_200');
          expect(validation.isValid).toBe(true);
          expect(validation.isProhibited).toBe(false);
        }
      );

      it('should catch sub-accounts of prohibited accounts (e.g. 6411, 5212, 6271)', () => {
        expect(isProhibitedInCircular133('6411')).toBe(true);
        expect(isProhibitedInCircular133('5212')).toBe(true);
        expect(isProhibitedInCircular133('6271')).toBe(true);
        expect(isProhibitedInCircular133('6218')).toBe(true);
      });

      it('should handle whitespace and Unicode non-breaking space in prohibited codes', () => {
        expect(isProhibitedInCircular133(' 641 ')).toBe(true);
        expect(isProhibitedInCircular133('\t621\n')).toBe(true);
        expect(isProhibitedInCircular133('627\u00A0')).toBe(true);
      });
    });

    describe('3.5 Scalability & Multi-Row Balancing', () => {
      it('should validate a 100-row balanced journal entry (50 Debit + 50 Credit) in < 10ms', () => {
        const rows: JournalEntryRow[] = [];
        const perRowAmount = 1_000_000;

        for (let i = 0; i < 50; i++) {
          rows.push({
            id: `deb-${i}`,
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: perRowAmount,
            creditAmount: 0,
          });
        }
        for (let i = 0; i < 50; i++) {
          rows.push({
            id: `cred-${i}`,
            accountCode: '1121',
            accountNameVi: 'Tiền gửi NH',
            debitAmount: 0,
            creditAmount: perRowAmount,
          });
        }

        const start = performance.now();
        const validation = BalanceValidator.validateJournalBalance(rows);
        const elapsed = performance.now() - start;

        expect(validation.isBalanced).toBe(true);
        expect(validation.delta).toBe(0);
        expect(validation.totalDebit).toBe(50_000_000);
        expect(validation.totalCredit).toBe(50_000_000);
        expect(elapsed).toBeLessThan(10);
      });

      it('should handle circular identity entries (Debit TK 1111 & Credit TK 1111)', () => {
        const rows: JournalEntryRow[] = [
          {
            id: 'r1',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: 20_000_000,
            creditAmount: 0,
          },
          {
            id: 'r2',
            accountCode: '1111',
            accountNameVi: 'Tiền mặt',
            debitAmount: 0,
            creditAmount: 20_000_000,
          },
        ];

        const validation = BalanceValidator.validateJournalBalance(rows);
        expect(validation.isBalanced).toBe(true);
        expect(validation.delta).toBe(0);
      });
    });
  });

  // ==========================================================================
  // BATTERY 4: Voucher Inspection Evasion
  // ==========================================================================
  describe('Battery 4: Voucher Inspection Evasion', () => {
    describe('4.1 Cash Payment Limit Thresholds (19,999,999 vs 20,000,000 VND)', () => {
      it('should validate invoice of 19,999,999 VND paid in cash as COMPLIANT with Circular 219/2013', () => {
        const voucher = {
          id: 'v-boundary-under-20m',
          titleVi: 'Hóa đơn dưới ngưỡng',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'Mua hàng 19.999.999 VNĐ tiền mặt',
          totalAmount: 19_999_999,
          paymentMethod: 'CASH' as const,
          statutoryBasis: 'TT 219/2013',
          vendorTaxStatus: '00' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucher);
        expect(audit.isValid).toBe(true);
        expect(audit.vatDeductible).toBe(true);
        expect(audit.citDeductible).toBe(true);
        expect(audit.issues).toHaveLength(0);
      });

      it('should flag invoice of exactly 20,000,000 VND paid in cash as NON-COMPLIANT (breach of threshold)', () => {
        const voucher = {
          id: 'v-boundary-exact-20m',
          titleVi: 'Hóa đơn đúng 20M tiền mặt',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'Mua hàng đúng 20.000.000 VNĐ tiền mặt',
          totalAmount: 20_000_000,
          paymentMethod: 'CASH' as const,
          statutoryBasis: 'TT 219/2013',
          vendorTaxStatus: '00' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucher);
        expect(audit.isValid).toBe(false);
        expect(audit.vatDeductible).toBe(false);
        expect(audit.citDeductible).toBe(false);
        expect(audit.issues.some((i) => i.includes('20.000.000'))).toBe(true);
      });

      it('should validate invoice of 20,000,000 VND paid via BANK_TRANSFER as COMPLIANT', () => {
        const voucher = {
          id: 'v-20m-bank',
          titleVi: 'Hóa đơn 20M chuyển khoản',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'Mua hàng 20M chuyển khoản ngân hàng',
          totalAmount: 20_000_000,
          paymentMethod: 'BANK_TRANSFER' as const,
          statutoryBasis: 'TT 219/2013',
          vendorTaxStatus: '00' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucher);
        expect(audit.isValid).toBe(true);
        expect(audit.vatDeductible).toBe(true);
        expect(audit.citDeductible).toBe(true);
      });
    });

    describe('4.2 Vendor Tax Status Invariants (Status 00 vs 03 vs 04)', () => {
      it('should reject invoice when vendor is Status 03 (Suspended / Tạm ngừng KD)', () => {
        const voucher = {
          id: 'v-status-03',
          titleVi: 'Nhà cung cấp tạm ngừng',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'Mua hàng từ cty tạm ngừng',
          totalAmount: 10_000_000,
          paymentMethod: 'BANK_TRANSFER' as const,
          statutoryBasis: 'NĐ 125/2020',
          vendorTaxStatus: '03' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucher);
        expect(audit.isValid).toBe(false);
        expect(audit.vatDeductible).toBe(false);
        expect(audit.citDeductible).toBe(false);
        expect(audit.issues.some((i) => i.includes('03'))).toBe(true);
      });

      it('should reject invoice when vendor is Status 04 (Runaway / Bỏ trốn khỏi địa chỉ KD)', () => {
        const voucher = {
          id: 'v-status-04',
          titleVi: 'Nhà cung cấp bỏ trốn',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'Mua hàng từ cty bỏ trốn',
          totalAmount: 50_000_000,
          paymentMethod: 'BANK_TRANSFER' as const,
          statutoryBasis: 'NĐ 125/2020 & CV 11797',
          vendorTaxStatus: '04' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucher);
        expect(audit.isValid).toBe(false);
        expect(audit.vatDeductible).toBe(false);
        expect(audit.citDeductible).toBe(false);
        expect(audit.issues.some((i) => i.includes('04'))).toBe(true);
      });
    });

    describe('4.3 Decision 1450 MCCQT & Signature Auditing', () => {
      it('should reject e-invoice starting with C symbol when MCCQT is not exactly 34 hex characters', () => {
        const voucherWithShortMccqt = {
          id: 'v-mccqt-short',
          titleVi: 'Mã CQT sai độ dài',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'MCCQT chỉ 30 ký tự',
          totalAmount: 5_000_000,
          paymentMethod: 'CASH' as const,
          statutoryBasis: 'QĐ 1450',
          invoiceSymbol: 'C26TAA',
          mccqt: '00C26TAA1234567890ABCDEF1234', // Only 28 chars!
          vendorTaxStatus: '00' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucherWithShortMccqt);
        expect(audit.isValid).toBe(false);
        expect(audit.issues.some((i) => i.includes('34 ký tự'))).toBe(true);
      });

      it('should reject voucher when mandatory signatures are missing (Segregation of Duties)', () => {
        const voucherMissingDirector = {
          id: 'v-missing-sig',
          titleVi: 'Thiếu chữ ký Giám đốc',
          voucherType: 'PAYMENT_VOUCHER' as const,
          scenarioDescriptionVi: 'Phiếu chi thiếu duyệt của giám đốc',
          totalAmount: 5_000_000,
          paymentMethod: 'CASH' as const,
          statutoryBasis: 'Luật Kế toán 88/2015',
          vendorTaxStatus: '00' as const,
          signers: {
            director: false, // MISSING!
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucherMissingDirector);
        expect(audit.isValid).toBe(false);
        expect(audit.issues.some((i) => i.includes('Giám đốc'))).toBe(true);
      });

      it('should flag arithmetic discrepancy between pretax + VAT and total amount', () => {
        const voucherWithMathError = {
          id: 'v-math-error',
          titleVi: 'Sai lệch số học',
          voucherType: 'VAT_INVOICE' as const,
          scenarioDescriptionVi: 'Tiền hàng 10M, VAT 1M nhưng ghi tổng 12M',
          pretaxAmount: 10_000_000,
          vatAmount: 1_000_000,
          totalAmount: 12_000_000, // Discrepancy of 1,000,000!
          paymentMethod: 'CASH' as const,
          statutoryBasis: 'NĐ 123/2020',
          vendorTaxStatus: '00' as const,
          signers: {
            director: true,
            chiefAccountant: true,
            cashierOrStorekeeper: true,
            preparer: true,
            receiverOrPayer: true,
          },
        };

        const audit = VoucherInspector.auditVoucher(voucherWithMathError);
        expect(audit.isValid).toBe(false);
        expect(audit.issues.some((i) => i.includes('Sai lệch số học'))).toBe(true);
      });
    });
  });

  // ==========================================================================
  // BATTERY 5: Storage Corruption & Prototype Pollution Injection
  // ==========================================================================
  describe('Battery 5: Storage Corruption & Prototype Pollution Injection', () => {
    let storageService: StorageService;

    beforeEach(() => {
      localStorage.clear();
      storageService = new StorageService();
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('5.1 Prototype Pollution Defense in Backup Import', () => {
      it('should not pollute Object.prototype when backup payload contains __proto__ injections', async () => {
        const maliciousPayload = JSON.stringify({
          app: 'vietnam-accounting-learning-web',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          __proto__: {
            pollutedProp: 'ATTACK_SUCCESSFUL',
          },
          customData: {
            localStorage: {
              __proto__: {
                injectedLocalStorage: 'LEAKED',
              },
              safe_key: 'safe_value',
            },
            indexedDb: {
              __proto__: {
                injectedIdb: 'LEAKED',
              },
            },
          },
        });

        const success = await storageService.importBackup(maliciousPayload);
        expect(success).toBe(true);

        // Verify Object prototype has NOT been polluted
        expect((Object.prototype as any).pollutedProp).toBeUndefined();
        expect((Object.prototype as any).injectedLocalStorage).toBeUndefined();
        expect((Object.prototype as any).injectedIdb).toBeUndefined();
        expect(({} as any).pollutedProp).toBeUndefined();
      });
    });

    describe('5.2 Corrupted JSON String & Non-App Format Defense', () => {
      it('should gracefully reject broken syntax JSON without throwing unhandled exceptions', async () => {
        const brokenJson = '{"app": "vietnam-accounting-learning-web", broken: }';
        const result = await storageService.importBackup(brokenJson);
        expect(result).toBe(false);
      });

      it('should reject backup from foreign application name', async () => {
        const foreignAppBackup = JSON.stringify({
          app: 'malicious-phishing-app',
          version: '1.0.0',
          customData: {},
        });
        const result = await storageService.importBackup(foreignAppBackup);
        expect(result).toBe(false);
      });

      it('should safely handle empty string or null backup strings', async () => {
        expect(await storageService.importBackup('')).toBe(false);
        expect(await storageService.importBackup('null')).toBe(false);
      });
    });

    describe('5.3 Streak Calendar Boundaries, Leap Years & Negative Time Shifts', () => {
      it('should not increment streak on negative time travel (system clock rolled back)', () => {
        const prevState: StreakState = {
          currentStreak: 5,
          bestStreak: 5,
          lastActiveDate: '2026-09-13',
          freezeBufferCount: 1,
          totalActiveDays: 5,
        };

        // User rolls back clock to 2026-09-10 (diff = -3 days)
        const result = StreakEngine.calculateStreakWithFreeze(prevState, '2026-09-10');
        expect(result.streakIncremented).toBe(false);
        expect(result.streakReset).toBe(false);
        expect(result.newState.currentStreak).toBe(5);
      });

      it('should correctly increment streak on Leap Year boundary (Feb 28 -> Feb 29, 2028)', () => {
        // 2028 is a leap year!
        const leapDiff = StreakEngine.getDaysBetween('2028-02-28', '2028-02-29');
        expect(leapDiff).toBe(1);

        const prevState: StreakState = {
          currentStreak: 10,
          bestStreak: 10,
          lastActiveDate: '2028-02-28',
          freezeBufferCount: 1,
          totalActiveDays: 10,
        };

        const result = StreakEngine.calculateStreakWithFreeze(prevState, '2028-02-29');
        expect(result.streakIncremented).toBe(true);
        expect(result.newState.currentStreak).toBe(11);
      });

      it('should correctly increment streak across calendar year boundaries (Dec 31 -> Jan 01)', () => {
        const yearEndDiff = StreakEngine.getDaysBetween('2026-12-31', '2027-01-01');
        expect(yearEndDiff).toBe(1);

        const prevState: StreakState = {
          currentStreak: 20,
          bestStreak: 20,
          lastActiveDate: '2026-12-31',
          freezeBufferCount: 1,
          totalActiveDays: 20,
        };

        const result = StreakEngine.calculateStreakWithFreeze(prevState, '2027-01-01');
        expect(result.streakIncremented).toBe(true);
        expect(result.newState.currentStreak).toBe(21);
      });

      it('should consume streak freeze buffer when exactly 1 day is missed (diff = 2 days)', () => {
        const prevState: StreakState = {
          currentStreak: 7,
          bestStreak: 7,
          lastActiveDate: '2026-09-10',
          freezeBufferCount: 1, // 1 freeze buffer available
          lastFreezeRefillWeek: '2026-W37',
          totalActiveDays: 7,
        };

        // Active again on 2026-09-12 (missed 2026-09-11, diff = 2)
        const result = StreakEngine.calculateStreakWithFreeze(prevState, '2026-09-12', '2026-W37');
        expect(result.freezeUsed).toBe(true);
        expect(result.streakIncremented).toBe(true);
        expect(result.streakReset).toBe(false);
        expect(result.newState.currentStreak).toBe(8); // Protected and incremented!
        expect(result.newState.freezeBufferCount).toBe(0); // Freeze buffer consumed!

        // If another day is missed in the same week (diff = 2 again, but 0 freezes left):
        const secondMiss = StreakEngine.calculateStreakWithFreeze(result.newState, '2026-09-14', '2026-W37');
        expect(secondMiss.freezeUsed).toBe(false);
        expect(secondMiss.streakReset).toBe(true);
        expect(secondMiss.newState.currentStreak).toBe(1); // Reset to 1!
        expect(secondMiss.newState.bestStreak).toBe(8); // Best streak preserved!
      });
    });

    describe('5.4 Key Namespace Isolation', () => {
      it('should isolate storage keys between adapters with different prefixes', async () => {
        const adapterA = new LocalStorageAdapter('namespace_a_');
        const adapterB = new LocalStorageAdapter('namespace_b_');

        await adapterA.setItem('test_key', 'VALUE_A');
        await adapterB.setItem('test_key', 'VALUE_B');

        expect(await adapterA.getItem('test_key')).toBe('VALUE_A');
        expect(await adapterB.getItem('test_key')).toBe('VALUE_B');

        const keysA = await adapterA.getAllKeys();
        const keysB = await adapterB.getAllKeys();
        expect(keysA).toEqual(['test_key']);
        expect(keysB).toEqual(['test_key']);
      });
    });
  });
});
