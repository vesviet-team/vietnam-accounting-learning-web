import { AssessmentItem, RuleOfOneDiagnosis } from '@/types/assessment';
import { JournalEntryRow, JournalBalanceValidation } from '@/types/workbench';
import { ExtendedVoucherCase } from '../fixtures/voucher-cases';

/**
 * GATING ENGINE — Enforces >= 70% passing threshold to unlock subsequent modules.
 */
export const GATING_PASSING_THRESHOLD = 70;

export class GatingEngine {
  /**
   * Checks if a learner is permitted to access a target day.
   * Days 1, 2, 3 are unlocked by default.
   * Day 4 requires passing Milestone Test 1 (Day 3) with score >= 70.
   * Day 7 requires passing Milestone Test 2 (Day 6) with score >= 70, etc.
   */
  static canAccessDay(
    targetDay: number,
    unlockedDays: number[],
    milestoneScores: Record<number, number>
  ): boolean {
    if (targetDay <= 0 || targetDay > 30) return false;
    if (targetDay <= 3) return true;

    // Check if day is explicitly in unlocked list
    if (unlockedDays.includes(targetDay)) return true;

    // Determine preceding required milestone
    // Day 4-6 requires Milestone 1 (Day 3)
    // Day 7-9 requires Milestone 2 (Day 6)
    const requiredMilestoneDay = (Math.ceil(targetDay / 3) - 1) * 3;
    const score = milestoneScores[requiredMilestoneDay];

    return typeof score === 'number' && score >= GATING_PASSING_THRESHOLD;
  }

  /**
   * Computes the new list of unlocked days after passing a milestone assessment.
   */
  static unlockNextModule(milestoneDay: number, currentlyUnlocked: number[]): number[] {
    const nextModuleStart = milestoneDay + 1;
    const nextModuleDays = [nextModuleStart, nextModuleStart + 1, nextModuleStart + 2].filter((d) => d <= 30);
    const combined = new Set([...currentlyUnlocked, ...nextModuleDays]);
    return Array.from(combined).sort((a, b) => a - b);
  }

  /**
   * Handles assessment attempt retakes:
   * - Appends to attempt history
   * - Preserves highest score
   * - Unlocks milestone if highest score >= 70%
   */
  static recordAttempt(
    _milestoneDay: number,
    newScore: number,
    history: number[] = [],
    previousBest: number = 0
  ): {
    score: number;
    passed: boolean;
    updatedHistory: number[];
    bestScore: number;
    unlocked: boolean;
  } {
    const updatedHistory = [...history, newScore];
    const bestScore = Math.max(previousBest, newScore);
    const passed = newScore >= GATING_PASSING_THRESHOLD;
    const unlocked = bestScore >= GATING_PASSING_THRESHOLD;

    return {
      score: newScore,
      passed,
      updatedHistory,
      bestScore,
      unlocked,
    };
  }
}

/**
 * GRADING ENGINE & RULE OF ONE DIAGNOSTIC PIPELINE
 */
export class GradingEngine {
  /**
   * Computes the total score (0 - 100) based on submitted answers.
   * DOK 1: 8 points each (4 items = 32)
   * DOK 2: 10 points each (4 items = 40)
   * DOK 3: 14 points each (2 items = 28)
   */
  static gradeAssessment(
    answers: Record<string, string>, // itemId -> optionId
    questions: AssessmentItem[]
  ): {
    score: number;
    correctCount: number;
    totalQuestions: number;
    itemResults: Record<string, boolean>;
  } {
    let score = 0;
    let correctCount = 0;
    const itemResults: Record<string, boolean> = {};

    for (const q of questions) {
      const selectedOptionId = answers[q.id];
      const correctOption = q.options.find((opt) => opt.isCorrect);
      const isCorrect = Boolean(selectedOptionId && correctOption && selectedOptionId === correctOption.id);

      itemResults[q.id] = isCorrect;
      if (isCorrect) {
        correctCount++;
        if (q.dokLevel === 'DOK_1') score += 8;
        else if (q.dokLevel === 'DOK_2') score += 10;
        else if (q.dokLevel === 'DOK_3') score += 14;
      }
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      correctCount,
      totalQuestions: questions.length,
      itemResults,
    };
  }

  static getProficiencyTier(score: number): 'beginning' | 'developing' | 'proficient' | 'advanced' {
    if (score >= 90) return 'advanced';
    if (score >= 70) return 'proficient';
    if (score >= 50) return 'developing';
    return 'beginning';
  }

  /**
   * Rule of One Diagnostic Filter:
   * Selects EXACTLY ONE primary error focus based on pedagogical hierarchy:
   * Priority 1: Fundamental Accounting Concept (Debit/Credit nature, accounting equation)
   * Priority 2: Legal Threshold & Regulatory Mandate (>=20M non-cash rule, 36-month ceiling)
   * Priority 3: Regime Divergence (Circular 133 vs 200 account prohibitions)
   * Priority 4: Arithmetic / Other
   */
  static diagnoseRuleOfOne(
    answers: Record<string, string>,
    questions: AssessmentItem[]
  ): RuleOfOneDiagnosis | undefined {
    const wrongItems: AssessmentItem[] = [];

    for (const q of questions) {
      const selected = answers[q.id];
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (!selected || selected !== correctOpt?.id) {
        wrongItems.push(q);
      }
    }

    if (wrongItems.length === 0) {
      return undefined; // 100% correct, no remediation needed
    }

    // Sort wrong items by pedagogical priority
    const priorityMap: Record<string, number> = {
      FUNDAMENTAL_EQUATION: 1,
      NORMAL_BALANCE: 1,
      ACCOUNT_CLASSIFICATION: 1,
      DOUBLE_ENTRY_INVARIANT: 1,
      LEGAL_THRESHOLD_20M: 2,
      CASH_DEPOSIT_AT_BANK_RISK: 2,
      SAME_DAY_AGGREGATION_RULE: 2,
      NON_CASH_TAX_CONSEQUENCES: 2,
      PROHIBITED_ACCOUNTS_133: 3,
      SELLING_EXPENSE_REROUTING: 3,
      REVENUE_DEDUCTION_DIVERGENCE: 3,
    };

    wrongItems.sort((a, b) => {
      const pA = priorityMap[a.misconceptionFocus || ''] || 4;
      const pB = priorityMap[b.misconceptionFocus || ''] || 4;
      return pA - pB;
    });

    const primaryError = wrongItems[0];

    return {
      highestPriorityErrorVi: primaryError.explanationVi,
      growthMindsetFeedbackVi:
        'Bạn đã thể hiện nỗ lực rất tốt trong bài kiểm tra này! Hãy tiếp tục rèn luyện để làm chủ hoàn toàn các nguyên tắc cốt lõi.',
      actionableNextStepVi:
        primaryError.remediationStepVi || 'Hãy đọc lại phần lý thuyết liên quan và thực hiện lại bài kiểm tra để đạt mốc >= 70%.',
    };
  }
}

/**
 * JOURNALIZING WORKBENCH & BALANCE VALIDATOR
 */
export class BalanceValidator {
  /**
   * Enforces mathematical equality: Sum(Debit) === Sum(Credit).
   */
  static validateJournalBalance(rows: JournalEntryRow[]): JournalBalanceValidation {
    if (!rows || rows.length === 0) {
      return {
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: false,
        delta: 0,
        errorMessageVi: 'Bút toán phải có ít nhất 1 dòng ghi Nợ và 1 dòng ghi Có.',
      };
    }

    if (rows.length < 2) {
      return {
        totalDebit: rows[0]?.debitAmount || 0,
        totalCredit: rows[0]?.creditAmount || 0,
        isBalanced: false,
        delta: Math.abs((rows[0]?.debitAmount || 0) - (rows[0]?.creditAmount || 0)),
        errorMessageVi: 'Bút toán đơn phải có ít nhất hai tài khoản đối ứng (1 Nợ - 1 Có).',
      };
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const row of rows) {
      const debit = Number(row.debitAmount) || 0;
      const credit = Number(row.creditAmount) || 0;

      if (debit < 0 || credit < 0) {
        return {
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: false,
          delta: 0,
          errorMessageVi: 'Số tiền định khoản không được là số âm. Đối với bút toán giảm, hãy dùng tài khoản đối ứng hoặc bút toán đảo.',
        };
      }

      totalDebit += debit;
      totalCredit += credit;
    }

    // Precision rounding to avoid floating-point inaccuracies
    const roundedDebit = Math.round(totalDebit);
    const roundedCredit = Math.round(totalCredit);
    const delta = Math.abs(roundedDebit - roundedCredit);
    const isBalanced = delta === 0 && roundedDebit > 0;

    let errorMessageVi: string | undefined;
    if (!isBalanced) {
      if (roundedDebit === 0 && roundedCredit === 0) {
        errorMessageVi = 'Số tiền phát sinh trong bút toán phải lớn hơn 0.';
      } else {
        errorMessageVi = `Bút toán không cân bằng! Tổng Nợ (${this.formatVND(roundedDebit)}) lệch so với Tổng Có (${this.formatVND(roundedCredit)}) là ${this.formatVND(delta)}.`;
      }
    }

    return {
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      isBalanced,
      delta,
      errorMessageVi,
    };
  }

  static formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}

/**
 * VOUCHER INSPECTION ENGINE
 */
export class VoucherInspector {
  static auditVoucher(voucher: ExtendedVoucherCase): {
    isValid: boolean;
    issues: string[];
    vatDeductible: boolean;
    citDeductible: boolean;
  } {
    const issues: string[] = [];
    let vatDeductible = true;
    let citDeductible = true;

    // Rule 1: Circular 219/2013 & Circular 96/2015 Non-cash threshold >= 20,000,000 VND
    if (voucher.totalAmount >= 20000000 && voucher.paymentMethod === 'CASH') {
      issues.push(
        'Vi phạm quy định thanh toán không dùng tiền mặt: Hóa đơn có giá trị từ 20.000.000 VNĐ trở lên thanh toán tiền mặt.'
      );
      vatDeductible = false;
      citDeductible = false;
    }

    // Rule 2: Vendor Tax Status (Status 03: Suspended, Status 04: Runaway)
    if (voucher.vendorTaxStatus === '03') {
      issues.push('Nhà cung cấp đang ở Trạng thái MST 03 (Tạm ngừng kinh doanh). Hóa đơn có rủi ro cao về thuế.');
      vatDeductible = false;
      citDeductible = false;
    } else if (voucher.vendorTaxStatus === '04') {
      issues.push(
        'Nhà cung cấp đang ở Trạng thái MST Status 04 (không hoạt động tại địa chỉ đăng ký). Hóa đơn bất hợp pháp theo NĐ 125/2020.'
      );
      vatDeductible = false;
      citDeductible = false;
    }

    // Rule 3: Decision 1450 MCCQT validation (Must be 34 hex chars if invoice symbol starts with 'C')
    if (voucher.invoiceSymbol?.startsWith('C')) {
      if (!voucher.mccqt || voucher.mccqt.length !== 34) {
        issues.push(
          `Mã CQT không hợp lệ: Hóa đơn ký hiệu '${voucher.invoiceSymbol}' phải có Mã cơ quan thuế dài đúng 34 ký tự.`
        );
        vatDeductible = false;
      }
    }

    // Rule 4: Arithmetic check
    if (
      typeof voucher.pretaxAmount === 'number' &&
      typeof voucher.vatAmount === 'number' &&
      typeof voucher.totalAmount === 'number'
    ) {
      const calculatedGross = voucher.pretaxAmount + voucher.vatAmount;
      if (Math.abs(calculatedGross - voucher.totalAmount) > 2) {
        // allowing 2 VND rounding variance
        issues.push(
          `Sai lệch số học: Tổng tiền trước thuế (${voucher.pretaxAmount}) + Thuế GTGT (${voucher.vatAmount}) không bằng Tổng thanh toán (${voucher.totalAmount}).`
        );
      }
    }

    // Rule 5: Signatures check
    if (voucher.signers) {
      if (!voucher.signers.director) {
        issues.push('Thiếu chữ ký phê duyệt của Thủ trưởng đơn vị (Giám đốc).');
      }
      if (!voucher.signers.chiefAccountant) {
        issues.push('Thiếu chữ ký của Kế toán trưởng.');
      }
      if (!voucher.signers.cashierOrStorekeeper) {
        issues.push('Thiếu chữ ký xác nhận của Thủ quỹ / Thủ kho.');
      }
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      issues,
      vatDeductible,
      citDeductible,
    };
  }
}

/**
 * STREAK ENGINE — Daily habit tracker with continuity calculation
 */
export class StreakEngine {
  static calculateStreak(lastActiveDateStr: string | null, currentDateStr: string, currentStreak: number): number {
    if (!lastActiveDateStr) {
      return 1; // First day of learning
    }

    const lastActive = new Date(lastActiveDateStr);
    const current = new Date(currentDateStr);

    // Normalize to UTC midnight
    const diffMs = current.setUTCHours(0, 0, 0, 0) - lastActive.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return currentStreak; // Same day, no streak change
    } else if (diffDays === 1) {
      return currentStreak + 1; // Consecutive day, increment
    } else {
      return 1; // Missed day, streak resets to 1
    }
  }
}
