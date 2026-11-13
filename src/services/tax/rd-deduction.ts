/**
 * R&D Additional Deduction Engine
 * Law on Corporate Income Tax No. 67/2025/QH15 & Decree 320/2025/NĐ-CP
 * Effective: 01/10/2025 (Law), applicable for tax period 2025 onwards
 *
 * Provides additional deduction for R&D expenses:
 * - 200% for R&D projects approved by Ministry of Science and Technology (MOST)
 * - 150% for other qualifying R&D expenses
 * - Additional deduction = Qualifying R&D expenses × (Additional deduction rate - 100%)
 * - Recorded in CIT Schedule B4 (Chỉ tiêu B4) as non-deductible adjustment
 */

export type RdProjectStatus = 'MOST_APPROVED' | 'OTHER_QUALIFYING' | 'NON_QUALIFYING';

export interface RdExpenseItem {
  id: string;
  descriptionVi: string;
  amount: number;
  projectStatus: RdProjectStatus;
  mostApprovalNumber?: string;
  mostApprovalDate?: string;
}

export interface RdDeductionResult {
  totalRdExpenses: number;
  mostApprovedExpenses: number;
  otherQualifyingExpenses: number;
  nonQualifyingExpenses: number;
  additionalDeduction200: number; // 100% additional (200% - 100%)
  additionalDeduction150: number; // 50% additional (150% - 100%)
  totalAdditionalDeduction: number;
  citAdjustmentB4: number; // Amount to add back in CIT Schedule B4
  statutoryBasis: string;
  explanationVi: string;
}

export const STATUTORY_BASIS_RD_DEDUCTION =
  'Luật Thuế TNDN số 67/2025/QH15 (Điều 14) & Nghị định 320/2025/NĐ-CP (Điều 8-10), hiệu lực từ 01/10/2025, áp dụng kỳ tính thuế 2025 trở đi';

export const RD_ADDITIONAL_RATE_MOST = 2.0; // 200%
export const RD_ADDITIONAL_RATE_OTHER = 1.5; // 150%

/**
 * Calculates R&D additional deduction per Law 67/2025 & Decree 320/2025.
 *
 * Rules:
 * - MOST-approved R&D projects: 200% deduction (100% additional deduction on top of normal 100%)
 * - Other qualifying R&D expenses: 150% deduction (50% additional deduction)
 * - Non-qualifying: 100% normal deduction only
 * - Additional deduction amount recorded in CIT Schedule B4 (Chỉ tiêu B4)
 */
export function calculateRdAdditionalDeduction(expenses: RdExpenseItem[]): RdDeductionResult {
  const validExpenses = expenses.filter((e) => e.amount > 0);

  const mostApprovedExpenses = validExpenses
    .filter((e) => e.projectStatus === 'MOST_APPROVED')
    .reduce((sum, e) => sum + e.amount, 0);

  const otherQualifyingExpenses = validExpenses
    .filter((e) => e.projectStatus === 'OTHER_QUALIFYING')
    .reduce((sum, e) => sum + e.amount, 0);

  const nonQualifyingExpenses = validExpenses
    .filter((e) => e.projectStatus === 'NON_QUALIFYING')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalRdExpenses = mostApprovedExpenses + otherQualifyingExpenses + nonQualifyingExpenses;

  // Additional deduction = (Rate - 1) × Qualifying expenses
  // 200% rate = 100% additional (2.0 - 1.0 = 1.0 = 100%)
  // 150% rate = 50% additional (1.5 - 1.0 = 0.5 = 50%)
  const additionalDeduction200 = mostApprovedExpenses * (RD_ADDITIONAL_RATE_MOST - 1); // 100% additional
  const additionalDeduction150 = otherQualifyingExpenses * (RD_ADDITIONAL_RATE_OTHER - 1); // 50% additional

  const totalAdditionalDeduction = additionalDeduction200 + additionalDeduction150;

  // CIT Schedule B4 adjustment: the additional deduction reduces taxable income
  // So we add it back to accounting profit to get taxable income
  const citAdjustmentB4 = -totalAdditionalDeduction; // Negative = reduces taxable income

  const explanationVi = `
Theo Luật Thuế TNDN số 67/2025/QH15 (Điều 14) và Nghị định 320/2025/NĐ-CP (Điều 8-10):
- Dự án R&D được Bộ KHCN phê duyệt: khấu trừ thêm 100% (tổng 200%) → ${formatCurrencyVnd(mostApprovedExpenses)} x 100% = ${formatCurrencyVnd(additionalDeduction200)}
- Chi phí R&D đủ điều kiện khác: khấu trừ thêm 50% (tổng 150%) → ${formatCurrencyVnd(otherQualifyingExpenses)} x 50% = ${formatCurrencyVnd(additionalDeduction150)}
- Chi phí R&D không đủ điều kiện: chỉ khấu trừ bình thường 100%

Tổng khấu trừ thêm R&D: ${formatCurrencyVnd(totalAdditionalDeduction)}
Điều chỉnh Chỉ tiêu B4 Tờ khai QTT TNDN: ${formatCurrencyVnd(citAdjustmentB4)} (giảm thu nhập chịu thuế)
  `.trim();

  return {
    totalRdExpenses,
    mostApprovedExpenses,
    otherQualifyingExpenses,
    nonQualifyingExpenses,
    additionalDeduction200,
    additionalDeduction150,
    totalAdditionalDeduction,
    citAdjustmentB4,
    statutoryBasis: STATUTORY_BASIS_RD_DEDUCTION,
    explanationVi,
  };
}

function formatCurrencyVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

/**
 * Validates if an R&D project qualifies for additional deduction per Decree 320/2025.
 * Criteria (Điều 8 NĐ 320/2025):
 * 1. Project has clear R&D objectives, content, budget, timeline
 * 2. Conducted by enterprise with R&D capacity (personnel, facilities, equipment)
 * 3. Expenses directly serve R&D: personnel, materials, equipment depreciation, outsourcing, etc.
 * 4. Not including: land use rights, financial expenses, admin overhead, marketing
 */
export function validateRdProjectQualification(
  project: { hasMOSTApproval: boolean; personnelCost: number; materialCost: number; equipmentDepreciation: number; outsourcingCost: number; otherDirectCost: number; adminOverhead: number }
): { qualifies: boolean; totalQualifying: number; reasonVi: string } {
  const qualifyingCosts = project.personnelCost + project.materialCost + project.equipmentDepreciation + project.outsourcingCost + project.otherDirectCost;
  const totalCosts = qualifyingCosts + project.adminOverhead;

  if (project.hasMOSTApproval) {
    return {
      qualifies: true,
      totalQualifying: totalCosts, // MOST-approved projects can include more costs
      reasonVi: 'Dự án R&D được Bộ KHCN phê duyệt - áp dụng khấu trừ 200% toàn bộ chi phí đủ điều kiện.',
    };
  }

  if (qualifyingCosts > 0) {
    return {
      qualifies: true,
      totalQualifying: qualifyingCosts, // Only direct R&D costs
      reasonVi: 'Chi phí R&D đủ điều kiện (nhân sự, vật liệu, khấu hao thiết bị, thuê ngoài) - áp dụng khấu trừ 150%. Chi phí quản lý chung không được tính.',
    };
  }

  return {
    qualifies: false,
    totalQualifying: 0,
    reasonVi: 'Không có chi phí R&D trực tiếp đủ điều kiện theo Điều 8 Nghị định 320/2025/NĐ-CP.',
  };
}