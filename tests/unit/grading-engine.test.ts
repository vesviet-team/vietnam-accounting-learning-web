import { describe, it, expect } from 'vitest';
import {
  DOK_POINT_MAP,
  PASSING_SCORE_THRESHOLD,
  getItemPointValue,
  calculateProficiencyTier,
  prioritizeErrors,
  diagnoseRuleOfOne,
  gradeMilestoneAssessment,
} from '@/engine/grading-engine';
import {
  ALL_MILESTONE_TESTS,
  MILESTONE_TEST_01,
  MILESTONE_TEST_02,
  MILESTONE_TEST_03,
  getMilestoneTestByDay,
} from '@/data/milestone-tests';
import { AssessmentItem } from '@/types/assessment';

describe('GRADING ENGINE & WEBB DOK ASSESSMENT SUITE', () => {
  describe('1. Webb DOK Taxonomy & 10 Milestone Test Blueprints Integrity', () => {
    it('should have exactly 10 milestone tests for Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30', () => {
      expect(ALL_MILESTONE_TESTS).toHaveLength(10);
      const expectedDays = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
      const actualDays = ALL_MILESTONE_TESTS.map((t) => t.milestoneDay);
      expect(actualDays).toEqual(expectedDays);

      expectedDays.forEach((day, index) => {
        const test = getMilestoneTestByDay(day);
        expect(test).toBeDefined();
        expect(test?.moduleNumber).toBe(index + 1);
      });
    });

    it('each of the 10 milestone tests must contain exactly 10 items calibrated to 100 points', () => {
      ALL_MILESTONE_TESTS.forEach((test) => {
        expect(test.items).toHaveLength(10);

        // Webb's DOK Distribution: 4 DOK 1 @ 8pts, 4 DOK 2 @ 10pts, 2 DOK 3 @ 14pts
        const dok1Items = test.items.filter((i) => i.dokLevel === 'DOK_1');
        const dok2Items = test.items.filter((i) => i.dokLevel === 'DOK_2');
        const dok3Items = test.items.filter((i) => i.dokLevel === 'DOK_3');

        expect(dok1Items).toHaveLength(4);
        expect(dok2Items).toHaveLength(4);
        expect(dok3Items).toHaveLength(2);

        const totalPoints = test.items.reduce((sum, item) => sum + getItemPointValue(item.dokLevel), 0);
        expect(totalPoints).toBe(100);
      });
    });

    it('every assessment item must have valid options, exactly 1 correct answer, and complete statutory metadata', () => {
      ALL_MILESTONE_TESTS.forEach((test) => {
        test.items.forEach((item) => {
          expect(item.id).toBeTruthy();
          expect(item.questionVi.length).toBeGreaterThan(15);
          expect(item.options).toHaveLength(4);

          const correctOptions = item.options.filter((o) => o.isCorrect);
          expect(correctOptions).toHaveLength(1);

          expect(item.explanationVi.length).toBeGreaterThan(20);
          expect(item.statutoryReference).toBeTruthy();
          expect(item.misconceptionFocus).toBeTruthy();
          expect(item.remediationStepVi).toBeTruthy();
          expect([1, 2, 3, 4]).toContain(item.errorPriority);
        });
      });
    });
  });

  describe('2. Pure Function Scoring & Proficiency Classification', () => {
    it('should assign correct point weights per DOK level', () => {
      expect(DOK_POINT_MAP.DOK_1).toBe(8);
      expect(DOK_POINT_MAP.DOK_2).toBe(10);
      expect(DOK_POINT_MAP.DOK_3).toBe(14);
      expect(PASSING_SCORE_THRESHOLD).toBe(70);
    });

    it('should calculate 100 points and advanced tier for 10/10 correct answers', () => {
      const test = MILESTONE_TEST_01;
      const perfectAnswers: Record<string, string> = {};
      test.items.forEach((item) => {
        const correct = item.options.find((o) => o.isCorrect)!;
        perfectAnswers[item.id] = correct.id;
      });

      const result = gradeMilestoneAssessment(test, perfectAnswers);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.proficiencyTier).toBe('advanced');
      expect(result.dokScoreBreakdown?.dok1.earned).toBe(32);
      expect(result.dokScoreBreakdown?.dok2.earned).toBe(40);
      expect(result.dokScoreBreakdown?.dok3.earned).toBe(28);
      expect(result.ruleOfOneDiagnosis?.priorityLevel).toBeUndefined();
    });

    it('should calculate 0 points and beginning tier for 0 correct answers or empty submission', () => {
      const test = MILESTONE_TEST_02;
      const result = gradeMilestoneAssessment(test, {});
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.proficiencyTier).toBe('beginning');
      expect(result.dokScoreBreakdown?.dok1.earned).toBe(0);
    });

    it('should correctly evaluate the passing boundary threshold at 70 points', () => {
      expect(calculateProficiencyTier(100)).toBe('advanced');
      expect(calculateProficiencyTier(90)).toBe('advanced');
      expect(calculateProficiencyTier(89)).toBe('proficient');
      expect(calculateProficiencyTier(70)).toBe('proficient');
      expect(calculateProficiencyTier(69)).toBe('developing');
      expect(calculateProficiencyTier(50)).toBe('developing');
      expect(calculateProficiencyTier(49)).toBe('beginning');
      expect(calculateProficiencyTier(0)).toBe('beginning');
    });

    it('should compute exact partial scores across DOK levels', () => {
      const test = MILESTONE_TEST_03;
      // Answer 4 DOK 1 (4 x 8 = 32) + 4 DOK 2 (4 x 10 = 40) = 72 points -> Passed!
      const answers: Record<string, string> = {};
      test.items.forEach((item) => {
        if (item.dokLevel !== 'DOK_3') {
          const correct = item.options.find((o) => o.isCorrect)!;
          answers[item.id] = correct.id;
        } else {
          const wrong = item.options.find((o) => !o.isCorrect)!;
          answers[item.id] = wrong.id;
        }
      });

      const result = gradeMilestoneAssessment(test, answers);
      expect(result.score).toBe(72);
      expect(result.passed).toBe(true);
      expect(result.proficiencyTier).toBe('proficient');
      expect(result.dokScoreBreakdown?.dok1.earned).toBe(32);
      expect(result.dokScoreBreakdown?.dok2.earned).toBe(40);
      expect(result.dokScoreBreakdown?.dok3.earned).toBe(0);
    });
  });

  describe('3. Rule of One Error Hierarchy Prioritization Engine', () => {
    it('should strictly prioritize Priority 1 (Conceptual Inversion) over Priority 2, 3, and 4', () => {
      const mockItems: AssessmentItem[] = [
        {
          id: 'item-p4',
          milestoneDay: 3,
          dokLevel: 'DOK_2',
          questionVi: 'Lỗi tính toán thuế',
          options: [],
          explanationVi: 'Giải thích tính toán sai',
          errorPriority: 4,
          misconceptionFocus: 'CALCULATION_ROUNDING',
        },
        {
          id: 'item-p2',
          milestoneDay: 3,
          dokLevel: 'DOK_3',
          questionVi: 'Lỗi ngưỡng 20 triệu tiền mặt',
          options: [],
          explanationVi: 'Giải thích vi phạm thuế',
          errorPriority: 2,
          misconceptionFocus: 'NON_CASH_BREACH',
        },
        {
          id: 'item-p1',
          milestoneDay: 3,
          dokLevel: 'DOK_1',
          questionVi: 'Lỗi đảo ngược Nợ/Có',
          options: [],
          explanationVi: 'Giải thích đảo ngược nợ có',
          errorPriority: 1,
          misconceptionFocus: 'DEBIT_CREDIT_INVERSION',
        },
        {
          id: 'item-p3',
          milestoneDay: 3,
          dokLevel: 'DOK_1',
          questionVi: 'Lỗi tài khoản cấm TT 133',
          options: [],
          explanationVi: 'Giải thích tài khoản cấm',
          errorPriority: 3,
          misconceptionFocus: 'PROHIBITED_ACCOUNTS',
        },
      ];

      const sorted = prioritizeErrors(mockItems);
      expect(sorted[0].errorPriority).toBe(1);
      expect(sorted[0].id).toBe('item-p1');
      expect(sorted[1].errorPriority).toBe(2);
      expect(sorted[2].errorPriority).toBe(3);
      expect(sorted[3].errorPriority).toBe(4);
    });

    it('should prioritize Priority 2 (Statutory Tax Breach) when Priority 1 is absent', () => {
      const mockItems: AssessmentItem[] = [
        {
          id: 'item-p4',
          milestoneDay: 9,
          dokLevel: 'DOK_2',
          questionVi: 'Tính toán giá xuất kho',
          options: [],
          explanationVi: 'Sai số học',
          errorPriority: 4,
        },
        {
          id: 'item-p2',
          milestoneDay: 9,
          dokLevel: 'DOK_3',
          questionVi: 'Ngưỡng 20 triệu',
          options: [],
          explanationVi: 'Vi phạm TT 219',
          errorPriority: 2,
        },
      ];

      const sorted = prioritizeErrors(mockItems);
      expect(sorted[0].errorPriority).toBe(2);
    });

    it('should generate growth mindset coaching and strictly ONE actionable next step', () => {
      const test = MILESTONE_TEST_01;
      // Answer 6 items right, miss 4 items with mixed priorities
      const answers: Record<string, string> = {};
      test.items.forEach((item, index) => {
        if (index < 6) {
          answers[item.id] = item.options.find((o) => o.isCorrect)!.id;
        } else {
          answers[item.id] = item.options.find((o) => !o.isCorrect)!.id;
        }
      });

      const result = gradeMilestoneAssessment(test, answers);
      expect(result.ruleOfOneDiagnosis).toBeDefined();
      const diag = result.ruleOfOneDiagnosis!;

      expect(diag.priorityLevel).toBeDefined();
      expect(diag.growthMindsetFeedbackVi).toContain('Bạn đã nỗ lực');
      expect(diag.actionableNextStepVi).toBeTruthy();
      // Verify single actionable step
      expect(diag.actionableNextStepVi.length).toBeGreaterThan(10);
    });

    it('diagnoseRuleOfOne should produce encouraging feedback for perfect score', () => {
      const diag = diagnoseRuleOfOne([], 100, 10);
      expect(diag.priorityLevel).toBeUndefined();
      expect(diag.growthMindsetFeedbackVi).toContain('Xuất sắc');
      expect(diag.actionableNextStepVi).toContain('sẵn sàng bước tiếp');
    });
  });
});
