import { describe, it, expect } from 'vitest';
import {
  calculateRdAdditionalDeduction,
  validateRdProjectQualification,
  RdExpenseItem,
  STATUTORY_BASIS_RD_DEDUCTION,
  RD_ADDITIONAL_RATE_MOST,
  RD_ADDITIONAL_RATE_OTHER,
} from '@/services/tax/rd-deduction';

describe('R&D Additional Deduction Engine (Law 67/2025 + ND 320/2025)', () => {
  describe('calculateRdAdditionalDeduction', () => {
    it('should calculate 200% deduction for MOST-approved projects (100% additional)', () => {
      const expenses: RdExpenseItem[] = [
        {
          id: 'rd-01',
          descriptionVi: 'Dự án R&D được Bộ KHCN phê duyệt',
          amount: 5_000_000_000,
          projectStatus: 'MOST_APPROVED',
          mostApprovalNumber: '123/QD-KHCN',
          mostApprovalDate: '2026-01-15',
        },
      ];

      const result = calculateRdAdditionalDeduction(expenses);

      expect(result.totalRdExpenses).toBe(5_000_000_000);
      expect(result.mostApprovedExpenses).toBe(5_000_000_000);
      expect(result.otherQualifyingExpenses).toBe(0);
      expect(result.nonQualifyingExpenses).toBe(0);
      // 200% rate = 100% additional (2.0 - 1.0 = 1.0 = 100%)
      expect(result.additionalDeduction200).toBe(5_000_000_000);
      expect(result.additionalDeduction150).toBe(0);
      expect(result.totalAdditionalDeduction).toBe(5_000_000_000);
      // CIT Schedule B4 adjustment: negative = reduces taxable income
      expect(result.citAdjustmentB4).toBe(-5_000_000_000);
      expect(result.statutoryBasis).toBe(STATUTORY_BASIS_RD_DEDUCTION);
    });

    it('should calculate 150% deduction for other qualifying projects (50% additional)', () => {
      const expenses: RdExpenseItem[] = [
        {
          id: 'rd-02',
          descriptionVi: 'Chi phí R&D đủ điều kiện khác',
          amount: 2_000_000_000,
          projectStatus: 'OTHER_QUALIFYING',
        },
      ];

      const result = calculateRdAdditionalDeduction(expenses);

      expect(result.totalRdExpenses).toBe(2_000_000_000);
      expect(result.mostApprovedExpenses).toBe(0);
      expect(result.otherQualifyingExpenses).toBe(2_000_000_000);
      expect(result.nonQualifyingExpenses).toBe(0);
      // 150% rate = 50% additional (1.5 - 1.0 = 0.5 = 50%)
      expect(result.additionalDeduction200).toBe(0);
      expect(result.additionalDeduction150).toBe(1_000_000_000);
      expect(result.totalAdditionalDeduction).toBe(1_000_000_000);
      expect(result.citAdjustmentB4).toBe(-1_000_000_000);
    });

    it('should handle mixed project types', () => {
      const expenses: RdExpenseItem[] = [
        {
          id: 'rd-01',
          descriptionVi: 'Dự án R&D được Bộ KHCN phê duyệt',
          amount: 5_000_000_000,
          projectStatus: 'MOST_APPROVED',
        },
        {
          id: 'rd-02',
          descriptionVi: 'Chi phí R&D đủ điều kiện khác',
          amount: 2_000_000_000,
          projectStatus: 'OTHER_QUALIFYING',
        },
        {
          id: 'rd-03',
          descriptionVi: 'Chi phí R&D không đủ điều kiện',
          amount: 1_000_000_000,
          projectStatus: 'NON_QUALIFYING',
        },
      ];

      const result = calculateRdAdditionalDeduction(expenses);

      expect(result.totalRdExpenses).toBe(8_000_000_000);
      expect(result.mostApprovedExpenses).toBe(5_000_000_000);
      expect(result.otherQualifyingExpenses).toBe(2_000_000_000);
      expect(result.nonQualifyingExpenses).toBe(1_000_000_000);
      expect(result.additionalDeduction200).toBe(5_000_000_000); // 100% of 5B
      expect(result.additionalDeduction150).toBe(1_000_000_000); // 50% of 2B
      expect(result.totalAdditionalDeduction).toBe(6_000_000_000);
      expect(result.citAdjustmentB4).toBe(-6_000_000_000);
    });

    it('should filter out zero/negative amounts', () => {
      const expenses: RdExpenseItem[] = [
        { id: 'rd-01', descriptionVi: 'Valid', amount: 1_000_000_000, projectStatus: 'MOST_APPROVED' },
        { id: 'rd-02', descriptionVi: 'Zero', amount: 0, projectStatus: 'MOST_APPROVED' },
        { id: 'rd-03', descriptionVi: 'Negative', amount: -500_000_000, projectStatus: 'OTHER_QUALIFYING' },
      ];

      const result = calculateRdAdditionalDeduction(expenses);

      expect(result.totalRdExpenses).toBe(1_000_000_000);
      expect(result.mostApprovedExpenses).toBe(1_000_000_000);
    });

    it('should have correct statutory basis reference', () => {
      const expenses: RdExpenseItem[] = [
        { id: 'rd-01', descriptionVi: 'Test', amount: 1_000_000_000, projectStatus: 'MOST_APPROVED' },
      ];

      const result = calculateRdAdditionalDeduction(expenses);

      expect(result.statutoryBasis).toContain('Luật Thuế TNDN số 67/2025/QH15');
      expect(result.statutoryBasis).toContain('Nghị định 320/2025/NĐ-CP');
      expect(result.statutoryBasis).toContain('01/10/2025');
    });

    it('should include explanation with correct calculation breakdown', () => {
      const expenses: RdExpenseItem[] = [
        { id: 'rd-01', descriptionVi: 'MOST', amount: 5_000_000_000, projectStatus: 'MOST_APPROVED' },
        { id: 'rd-02', descriptionVi: 'Other', amount: 2_000_000_000, projectStatus: 'OTHER_QUALIFYING' },
      ];

      const result = calculateRdAdditionalDeduction(expenses);

      expect(result.explanationVi).toContain('5.000.000.000 đ');
      expect(result.explanationVi).toContain('2.000.000.000 đ');
      expect(result.explanationVi).toContain('100%');
      expect(result.explanationVi).toContain('50%');
      expect(result.explanationVi).toContain('6.000.000.000 đ');
    });
  });

  describe('validateRdProjectQualification', () => {
    it('should approve MOST-approved projects with full cost base', () => {
      const project = {
        hasMOSTApproval: true,
        personnelCost: 3_000_000_000,
        materialCost: 1_000_000_000,
        equipmentDepreciation: 500_000_000,
        outsourcingCost: 500_000_000,
        otherDirectCost: 0,
        adminOverhead: 1_000_000_000,
      };

      const result = validateRdProjectQualification(project);

      expect(result.qualifies).toBe(true);
      // MOST-approved includes admin overhead
      expect(result.totalQualifying).toBe(6_000_000_000);
      expect(result.reasonVi).toContain('Bộ KHCN phê duyệt');
    });

    it('should approve qualifying projects with direct costs only', () => {
      const project = {
        hasMOSTApproval: false,
        personnelCost: 2_000_000_000,
        materialCost: 1_000_000_000,
        equipmentDepreciation: 500_000_000,
        outsourcingCost: 500_000_000,
        otherDirectCost: 0,
        adminOverhead: 1_000_000_000,
      };

      const result = validateRdProjectQualification(project);

      expect(result.qualifies).toBe(true);
      // Only direct R&D costs, not admin overhead
      expect(result.totalQualifying).toBe(4_000_000_000);
      expect(result.reasonVi).toContain('khấu hao thiết bị');
      expect(result.reasonVi).toContain('Chi phí quản lý chung không được tính');
    });

    it('should reject projects with no qualifying costs', () => {
      const project = {
        hasMOSTApproval: false,
        personnelCost: 0,
        materialCost: 0,
        equipmentDepreciation: 0,
        outsourcingCost: 0,
        otherDirectCost: 0,
        adminOverhead: 1_000_000_000,
      };

      const result = validateRdProjectQualification(project);

      expect(result.qualifies).toBe(false);
      expect(result.totalQualifying).toBe(0);
      expect(result.reasonVi).toContain('Không có chi phí R&D');
    });
  });

  describe('Constants', () => {
    it('should have correct additional rates', () => {
      expect(RD_ADDITIONAL_RATE_MOST).toBe(2.0); // 200%
      expect(RD_ADDITIONAL_RATE_OTHER).toBe(1.5); // 150%
    });

    it('should have correct statutory basis', () => {
      expect(STATUTORY_BASIS_RD_DEDUCTION).toContain('67/2025/QH15');
      expect(STATUTORY_BASIS_RD_DEDUCTION).toContain('320/2025/NĐ-CP');
      expect(STATUTORY_BASIS_RD_DEDUCTION).toContain('01/10/2025');
    });
  });
});