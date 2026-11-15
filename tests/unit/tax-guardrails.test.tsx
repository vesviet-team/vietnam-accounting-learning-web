import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  evaluateNonCashRule,
  evaluateVendorTaxStatus,
  calculateCitScheduleB4,
  calculateCitAdjustments,
  isCashPaymentMethod,
  NON_CASH_PAYMENT_THRESHOLD,
  STANDARD_CIT_RATE,
  STATUTORY_BASIS_NON_CASH,
  STATUTORY_BASIS_VENDOR_RUNAWAY,
  STATUTORY_BASIS_VENDOR_SUSPENDED,
  STATUTORY_BASIS_VENDOR_ACTIVE,
  ScheduleB4Item,
} from '@/services/tax/tax-guardrails';
import {
  isProhibitedInCircular133,
  getProhibitionRule,
  validateAccountForRegime,
  getProhibitedAccounts133,
} from '@/data/prohibited-accounts';
import { generateIncomeStatement } from '@/services/financial-statements/income-statement-engine';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';

describe('COMPREHENSIVE TAX COMPLIANCE & FRAUD GUARDRAILS (MILESTONE 5 / R5)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. CIRCULAR 133 PROHIBITED ACCOUNTS EXPANSION TESTS
  // =========================================================================
  describe('1. Circular 133 Prohibited Accounts Expansion', () => {
    const newlyAdded133Accounts = [
      { code: '157', nameSnippet: 'Hàng gửi đi bán', substitute: '156' },
      { code: '212', nameSnippet: 'Tài sản cố định thuê tài chính', substitute: '211' },
      { code: '213', nameSnippet: 'Tài sản cố định vô hình', substitute: '2113' },
      { code: '113', nameSnippet: 'Tiền đang chuyển', substitute: '111 / 112' },
      { code: '243', nameSnippet: 'Tài sản thuế thu nhập hoãn lại', substitute: 'Không sử dụng' },
      { code: '347', nameSnippet: 'Thuế thu nhập hoãn lại phải trả', substitute: 'Không sử dụng' },
    ];

    it.each(newlyAdded133Accounts)(
      'should flag account $code ($nameSnippet) as prohibited in Circular 133 with substitute $substitute',
      ({ code, nameSnippet, substitute }) => {
        expect(isProhibitedInCircular133(code)).toBe(true);
        const rule = getProhibitionRule(code);
        expect(rule).toBeDefined();
        expect(rule?.nameVi).toContain(nameSnippet);
        expect(rule?.substituteCode).toBe(substitute);
        expect(rule?.reasonVi).toBeDefined();
        expect(rule?.statutoryBasis).toBeDefined();
      }
    );

    it('should prohibit child sub-accounts of all new prohibited accounts', () => {
      // 157 sub-accounts: 1571, 1572
      expect(isProhibitedInCircular133('1571')).toBe(true);
      expect(isProhibitedInCircular133('1572')).toBe(true);
      expect(getProhibitionRule('1571')?.substituteCode).toBe('156');

      // 212 sub-accounts: 2121, 2122
      expect(isProhibitedInCircular133('2121')).toBe(true);
      expect(getProhibitionRule('2121')?.substituteCode).toBe('211');

      // 213 sub-accounts: 2131, 2132
      expect(isProhibitedInCircular133('2131')).toBe(true);
      expect(getProhibitionRule('2131')?.substituteCode).toBe('2113');

      // 113 sub-accounts: 1131, 1132
      expect(isProhibitedInCircular133('1131')).toBe(true);
      expect(getProhibitionRule('1131')?.substituteCode).toBe('111 / 112');

      // 243 & 347 sub-accounts
      expect(isProhibitedInCircular133('2431')).toBe(true);
      expect(isProhibitedInCircular133('3471')).toBe(true);
    });

    it('should validate accounts correctly based on AccountingRegime', () => {
      // In Circular 200: all these accounts are completely valid
      ['157', '212', '213', '113', '243', '347'].forEach((code) => {
        const check200 = validateAccountForRegime(code, 'CIRCULAR_200');
        expect(check200.isValid).toBe(true);
        expect(check200.isProhibited).toBe(false);
      });

      // In Circular 133: all these accounts must be rejected
      ['157', '212', '213', '113', '243', '347'].forEach((code) => {
        const check133 = validateAccountForRegime(code, 'CIRCULAR_133');
        expect(check133.isValid).toBe(false);
        expect(check133.isProhibited).toBe(true);
        expect(check133.warning).toContain('KHÔNG ĐƯỢC PHÉP');
      });
    });

    it('should ensure getProhibitedAccounts133 includes all newly added items when requested and identifies specific accounts', () => {
      // Default returns 7 core items for backward compatibility
      expect(getProhibitedAccounts133().length).toBe(7);

      // getProhibitedAccounts133(true) returns all 13 items
      const items = getProhibitedAccounts133(true);
      expect(items.length).toBe(13);
      const codes = items.map((i) => i.code);

      ['157', '212', '213', '113', '243', '347', '621', '622', '623', '627', '641', '521', '413'].forEach(
        (code) => {
          expect(codes).toContain(code);
        }
      );

      // Filter by specific code
      expect(getProhibitedAccounts133('157')[0]?.code).toBe('157');
      expect(getProhibitedAccounts133('212')[0]?.code).toBe('212');
      expect(getProhibitedAccounts133('213')[0]?.code).toBe('213');
      expect(getProhibitedAccounts133('113')[0]?.code).toBe('113');
    });

    it('should NOT flag valid Circular 133 accounts as prohibited', () => {
      const allowed = ['111', '112', '152', '153', '154', '155', '156', '211', '2113', '214', '331', '511', '6421', '6422', '911'];
      allowed.forEach((code) => {
        expect(isProhibitedInCircular133(code)).toBe(false);
      });
    });
  });

  // =========================================================================
  // 2. NON-CASH PAYMENT RULE (>= 20M VND) TESTS
  // =========================================================================
  describe('2. Non-Cash Payment Threshold Rule (>= 20,000,000 VND)', () => {
    it('should identify cash payment methods correctly', () => {
      expect(isCashPaymentMethod('CASH')).toBe(true);
      expect(isCashPaymentMethod('cash')).toBe(true);
      expect(isCashPaymentMethod('TM')).toBe(true);
      expect(isCashPaymentMethod('TIEN_MAT')).toBe(true);
      expect(isCashPaymentMethod('111')).toBe(true);
      expect(isCashPaymentMethod('1111')).toBe(true);
      expect(isCashPaymentMethod('Tiền mặt tại quỹ')).toBe(true);

      expect(isCashPaymentMethod('BANK_TRANSFER')).toBe(false);
      expect(isCashPaymentMethod('112')).toBe(false);
      expect(isCashPaymentMethod('CK')).toBe(false);
    });

    it('should pass boundary check: 19,999,999 VND paid in cash is NOT violated', () => {
      const res = evaluateNonCashRule(19_999_999, 'CASH');
      expect(res.isViolated).toBe(false);
      expect(res.vatCreditable).toBe(true);
      expect(res.citDeductible).toBe(true);
      expect(res.threshold).toBe(NON_CASH_PAYMENT_THRESHOLD);
      expect(res.statutoryBasis).toBe(STATUTORY_BASIS_NON_CASH);
    });

    it('should fail boundary check: exactly 20,000,000 VND paid in cash VIOLATES rule', () => {
      const res = evaluateNonCashRule(20_000_000, 'CASH');
      expect(res.isViolated).toBe(true);
      expect(res.vatCreditable).toBe(false);
      expect(res.citDeductible).toBe(false);
      expect(res.statutoryBasis).toBe(STATUTORY_BASIS_NON_CASH);
      expect(res.explanationVi).toContain('từ 20.000.000 VNĐ trở lên');
      expect(res.explanationVi).toContain('Chỉ tiêu B4');
    });

    it('should pass check: exactly 20,000,000 VND paid via bank transfer is COMPLIANT', () => {
      const res = evaluateNonCashRule(20_000_000, 'BANK_TRANSFER');
      expect(res.isViolated).toBe(false);
      expect(res.vatCreditable).toBe(true);
      expect(res.citDeductible).toBe(true);
    });

    it('should fail check: 100,000,000 VND paid in cash VIOLATES rule', () => {
      const res = evaluateNonCashRule(100_000_000, '111');
      expect(res.isViolated).toBe(true);
      expect(res.vatCreditable).toBe(false);
      expect(res.citDeductible).toBe(false);
    });

    it('should pass check: 100,000,000 VND paid via bank transfer is COMPLIANT', () => {
      const res = evaluateNonCashRule(100_000_000, 'BANK_TRANSFER');
      expect(res.isViolated).toBe(false);
      expect(res.vatCreditable).toBe(true);
      expect(res.citDeductible).toBe(true);
    });
  });

  // =========================================================================
  // 3. VENDOR TAX CODE STATUS EVALUATION TESTS
  // =========================================================================
  describe('3. Vendor Tax Status Evaluation (00 vs 03 vs 04)', () => {
    it('Status 00 (Active): should evaluate as NORMAL with zero fraud risk', () => {
      const res = evaluateVendorTaxStatus('0101234567', '00');
      expect(res.vendorTaxStatus).toBe('00');
      expect(res.riskLevel).toBe('NORMAL');
      expect(res.isFraudRisk).toBe(false);
      expect(res.vatCreditable).toBe(true);
      expect(res.citDeductible).toBe(true);
      expect(res.statutoryBasis).toBe(STATUTORY_BASIS_VENDOR_ACTIVE);
      expect(res.statusNameVi).toContain('Đang hoạt động');
    });

    it('Status 03 (Temporarily Suspended): should trigger MEDIUM risk warning', () => {
      const res = evaluateVendorTaxStatus('0109998888', '03');
      expect(res.vendorTaxStatus).toBe('03');
      expect(res.riskLevel).toBe('MEDIUM');
      expect(res.isFraudRisk).toBe(false);
      expect(res.vatCreditable).toBe(false);
      expect(res.citDeductible).toBe(false);
      expect(res.statutoryBasis).toBe(STATUTORY_BASIS_VENDOR_SUSPENDED);
      expect(res.recommendationVi).toContain('tạm ngừng');
      expect(res.recommendationVi).toContain('ngày phát hành');
    });

    it('Status 04 (Runaway / Inactive at Address): should flag 100% tax fraud and disallow VAT & CIT', () => {
      const res = evaluateVendorTaxStatus('0104445555', '04');
      expect(res.vendorTaxStatus).toBe('04');
      expect(res.riskLevel).toBe('HIGH');
      expect(res.isFraudRisk).toBe(true);
      expect(res.vatCreditable).toBe(false);
      expect(res.citDeductible).toBe(false);
      expect(res.statutoryBasis).toBe(STATUTORY_BASIS_VENDOR_RUNAWAY);
      expect(res.explanationVi).toContain('Nghị định 254/2026/NĐ-CP');
      expect(res.explanationVi).toContain('100% rủi ro gian lận thuế');
      expect(res.recommendationVi).toContain('Mục B4');
    });
  });

  // =========================================================================
  // 4. CIT SCHEDULE B4 & TAX ADJUSTMENT ENGINE TESTS
  // =========================================================================
  describe('4. CIT Schedule B4 Tax Adjustment Engine', () => {
    it('should aggregate disallowed expenses and compute adjusted CIT payable', () => {
      const items: ScheduleB4Item[] = [
        {
          code: 'B4-01',
          amount: 20_000_000,
          reasonVi: 'Hóa đơn >= 20M thanh toán tiền mặt',
        },
        {
          code: 'B4-02',
          amount: 30_000_000,
          reasonVi: 'Hóa đơn nhà cung cấp bỏ trốn Status 04',
        },
      ];

      const accountingProfit = 100_000_000;
      const res = calculateCitScheduleB4(accountingProfit, items);

      // Total B4 = 20M + 30M = 50M
      expect(res.totalB4Disallowed).toBe(50_000_000);
      // Taxable income = 100M + 50M = 150M
      expect(res.taxableIncome).toBe(150_000_000);
      // CIT rate = 20%
      expect(res.citRate).toBe(STANDARD_CIT_RATE);
      // CIT payable = 150M * 20% = 30M
      expect(res.citPayable).toBe(30_000_000);
      expect(res.items.length).toBe(2);
    });

    it('should handle negative accounting profit (loss) offset by B4 adjustments', () => {
      const items: ScheduleB4Item[] = [
        {
          code: 'B4-01',
          amount: 60_000_000,
          reasonVi: 'Chi phí không có hóa đơn hợp pháp',
        },
      ];

      // Company had accounting loss of -20M
      const res = calculateCitScheduleB4(-20_000_000, items);

      // Taxable income = -20M + 60M = 40M
      expect(res.taxableIncome).toBe(40_000_000);
      // CIT payable = 40M * 20% = 8M
      expect(res.citPayable).toBe(8_000_000);
    });

    it('should return zero tax payable when taxable income remains negative', () => {
      const items: ScheduleB4Item[] = [
        {
          code: 'B4-01',
          amount: 10_000_000,
          reasonVi: 'Chi phí vi phạm thanh toán',
        },
      ];

      // Accounting loss of -50M, with B4 of 10M -> taxable income -40M -> tax = 0
      const res = calculateCitScheduleB4(-50_000_000, items);
      expect(res.taxableIncome).toBe(-40_000_000);
      expect(res.citPayable).toBe(0);
    });

    it('calculateCitAdjustments helper should format items correctly', () => {
      const rawDisallowed = [
        {
          amount: 15_000_000,
          reasonVi: 'Tiền phạt vi phạm hành chính',
          code: 'B4-FINE',
        },
      ];
      const res = calculateCitAdjustments(rawDisallowed, 50_000_000);
      expect(res.totalB4Disallowed).toBe(15_000_000);
      expect(res.taxableIncome).toBe(65_000_000);
      expect(res.citPayable).toBe(13_000_000);
    });

    it('should integrate B4 disallowed expenses into generateIncomeStatement', () => {
      const amounts = {
        grossRevenue: 200_000_000,
        revenueDeductions: 0,
        costOfGoodsSold: 120_000_000,
        generalAdminExpenses: 30_000_000,
        // Pretax accounting profit = 200M - 120M - 30M = 50M
        disallowedExpenses: [
          {
            code: 'B4-CASH',
            amount: 10_000_000,
            reasonVi: 'Mua hàng 20M trả tiền mặt',
          },
        ],
      };

      const report = generateIncomeStatement(amounts);
      expect(report.accountingProfitBeforeTax).toBe(50_000_000);
      // Taxable income = 50M + 10M = 60M; CIT = 60M * 20% = 12M
      expect(report.citExpense).toBe(12_000_000);
      // Net profit after tax = 50M - 12M = 38M
      expect(report.netProfitAfterTax).toBe(38_000_000);
    });
  });

  // =========================================================================
  // 5. VOUCHER INSPECTOR INTEGRATION TESTS
  // =========================================================================
  describe('5. VoucherInspector Workbench Integration', () => {
    it('should display non-cash statutory warning for Case 2 (20M cash)', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Select Case 2
      const case2Btn = screen.getByText(/Hóa đơn Điện Máy Đúng 20 Triệu/i);
      fireEvent.click(case2Btn);

      // Warning alert for non-cash breach should be rendered in UI
      expect(
        screen.getByTestId('non-cash-rule-warning')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Cảnh báo Vi phạm Thanh toán Tiền mặt/i)
      ).toBeInTheDocument();
    });

    it('should display vendor status warning for Case 3 (Status 03)', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Select Case 3
      const case3Btn = screen.getByText(/Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng/i);
      fireEvent.click(case3Btn);

      expect(
        screen.getByTestId('vendor-tax-status-warning')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/NNT Tạm ngừng kinh doanh có thời hạn/i)
      ).toBeInTheDocument();
    });

    it('should display runaway fraud warning for Case 4 (Status 04)', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Select Case 4
      const case4Btn = screen.getByText(/Hóa đơn Phát sinh từ Doanh nghiệp Bỏ Địa chỉ/i);
      fireEvent.click(case4Btn);

      expect(
        screen.getByTestId('vendor-tax-status-warning')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/NNT Không hoạt động tại địa chỉ đã đăng ký/i)
      ).toBeInTheDocument();
    });

    it('should display VAT input and CIT Schedule B4 breakdown cards upon audit completion', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Select Case 2
      fireEvent.click(screen.getByText(/Hóa đơn Điện Máy Đúng 20 Triệu/i));

      // Check checklist
      fireEvent.click(screen.getByLabelText(/Vi phạm quy tắc thanh toán không dùng tiền mặt/i));
      fireEvent.click(screen.getByRole('button', { name: /CÓ SAI PHẠM/i }));
      fireEvent.click(screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i }));

      // Consequence cards must be visible
      expect(screen.getByTestId('vat-input-consequence-card')).toBeInTheDocument();
      expect(screen.getByTestId('cit-deductible-consequence-card')).toBeInTheDocument();
      expect(screen.getByText(/Rào chắn Thuế GTGT đầu vào \(TK 133\):/i)).toBeInTheDocument();
      expect(screen.getByText(/Rào chắn Chi phí Thuế TNDN & Mục B4:/i)).toBeInTheDocument();
    });
  });
});

import {
  evaluatePitDeduction,
  evaluateSmeTaxReduction,
  evaluateVatReductionWindow,
  STATUTORY_BASIS_PIT_LAW_2025,
  SME_TAX_REDUCTION_REVENUE_THRESHOLD,
  SME_TAX_REDUCTION_RATE,
  VAT_REDUCED_RATE,
  VAT_REDUCED_RATE_VALID_UNTIL,
} from '@/services/tax/tax-guardrails';

describe('PIT DEDUCTION GUARDRAIL - Nghị quyết 110/2025/UBTVQH15 (áp dụng từ kỳ tính thuế 2026)', () => {
  it('should apply new-law deductions (15.5M self + 6.2M dependent) ngay từ 01/01/2026 (kỳ tính thuế 2026): gross 20M, 1 dependent -> taxable 0', () => {
    const result = evaluatePitDeduction(20_000_000, 1, '2026-01-01');

    expect(result.applicableLaw).toBe('LAW_109_2025');
    expect(result.selfDeduction).toBe(15_500_000);
    expect(result.dependentDeduction).toBe(6_200_000);
    // Total monthly deduction = 15.5M + 6.2M = 21.7M
    expect(result.totalMonthlyDeduction).toBe(21_700_000);
    expect(result.totalAnnualDeduction).toBe(21_700_000 * 12);
    // Taxable = max(0, 20M - 21.7M) = 0
    expect(result.taxableMonthlyIncome).toBe(0);
    expect(result.statutoryBasis).toBe(STATUTORY_BASIS_PIT_LAW_2025);
    expect(result.statutoryBasis).toContain('110/2025/UBTVQH15');
    expect(result.statutoryBasis).toContain('2026-01-01');
    expect(result.explanationVi).toContain('15.500.000');
    expect(result.explanationVi).toContain('6.200.000');
  });

  it('should compute taxable income for gross 30M with 2 dependents: 30M - (15.5M + 12.4M) = 2.1M', () => {
    const result = evaluatePitDeduction(30_000_000, 2, '2026-08-15');

    expect(result.applicableLaw).toBe('LAW_109_2025');
    expect(result.selfDeduction).toBe(15_500_000);
    expect(result.dependentDeduction).toBe(12_400_000);
    expect(result.totalMonthlyDeduction).toBe(27_900_000);
    // Taxable = 30M - 27.9M = 2.1M
    expect(result.taxableMonthlyIncome).toBe(2_100_000);
  });

  it('should fall back to previous-law deductions (11M self + 4.4M dependent) for tax year 2025 (before 2026-01-01)', () => {
    const result = evaluatePitDeduction(30_000_000, 2, '2025-12-31');

    expect(result.applicableLaw).toBe('LAW_04_2007');
    expect(result.selfDeduction).toBe(11_000_000);
    expect(result.dependentDeduction).toBe(8_800_000);
    expect(result.totalMonthlyDeduction).toBe(19_800_000);
    // Taxable = 30M - 19.8M = 10.2M
    expect(result.taxableMonthlyIncome).toBe(10_200_000);
    expect(result.explanationVi).toContain('11.000.000');
    expect(result.explanationVi).toContain('4.400.000');
  });

  it('should apply the new deductions to the WHOLE of 2026, not just from 01/07/2026', () => {
    // Kỳ tính thuế 2026 áp dụng 15.5M/6.2M ngay từ kỳ đầu tiên của năm (NQ 110/2025/UBTVQH15)
    const earlyYear = evaluatePitDeduction(30_000_000, 2, '2026-01-31');
    expect(earlyYear.selfDeduction).toBe(15_500_000);
    expect(earlyYear.totalMonthlyDeduction).toBe(27_900_000);
  });

  it('should handle zero dependents with default asOfDate under the new law', () => {
    const result = evaluatePitDeduction(25_000_000);

    expect(result.dependents).toBe(0);
    expect(result.dependentDeduction).toBe(0);
    expect(result.applicableLaw).toBe('LAW_109_2025');
    expect(result.totalMonthlyDeduction).toBe(15_500_000);
    // Taxable = 25M - 15.5M = 9.5M
    expect(result.taxableMonthlyIncome).toBe(9_500_000);
  });
});

describe('SME 30% CIT/PIT REDUCTION GUARDRAIL - NĐ 398/2026/NĐ-CP (kỳ tính thuế 2026-2027)', () => {
  it('should grant the 30% reduction at the exact 10B revenue boundary (doanh thu đúng 10 tỷ vẫn được giảm)', () => {
    const result = evaluateSmeTaxReduction(10_000_000_000, 2026);

    expect(result.status).toBe('ELIGIBLE');
    expect(result.isEligible).toBe(true);
    expect(result.revenueThreshold).toBe(SME_TAX_REDUCTION_REVENUE_THRESHOLD);
    expect(result.reductionRate).toBe(SME_TAX_REDUCTION_RATE);
    expect(result.statutoryBasis).toContain('398/2026/NĐ-CP');
    expect(result.statutoryBasis).toContain('NQ 43/2026/QH16');
    expect(result.explanationVi).toContain('GIẢM 30%');
    expect(result.declarationFormVi).toContain('Mẫu 01');
  });

  it('should withdraw the reduction at 10B + 1 VND with Mẫu 03 additional-payment warning', () => {
    const result = evaluateSmeTaxReduction(10_000_000_001, 2026);

    expect(result.status).toBe('REVENUE_EXCEEDED');
    expect(result.isEligible).toBe(false);
    expect(result.explanationVi).toContain('NỘP BỔ SUNG');
    expect(result.declarationFormVi).toContain('Mẫu 03');
    expect(result.statutoryBasis).toContain('398/2026/NĐ-CP');
  });

  it('should apply the reduction for tax year 2027', () => {
    const result = evaluateSmeTaxReduction(8_000_000_000, 2027);
    expect(result.status).toBe('ELIGIBLE');
    expect(result.isEligible).toBe(true);
    expect(result.taxYear).toBe(2027);
  });

  it('should NOT apply for tax year 2025 (before the 2026-2027 window)', () => {
    const result = evaluateSmeTaxReduction(5_000_000_000, 2025);

    expect(result.status).toBe('YEAR_NOT_APPLICABLE');
    expect(result.isEligible).toBe(false);
    expect(result.explanationVi).toContain('2026 và 2027');
  });

  it('should NOT apply for tax year 2028 (after the 2026-2027 window)', () => {
    const result = evaluateSmeTaxReduction(5_000_000_000, 2028);

    expect(result.status).toBe('YEAR_NOT_APPLICABLE');
    expect(result.isEligible).toBe(false);
  });

  it('should encode the accounting invariant: CIT payable after reduction = 0.7 x CIT payable', () => {
    // Invariant kế toán thật: DN doanh thu 8 tỷ, thuế TNDN xác định 200tr
    // → sau giảm 30% còn 200tr x 0.7 = 140tr (TNDN tính trên số thuế sau ưu đãi)
    const result = evaluateSmeTaxReduction(8_000_000_000, 2026);
    const citBefore = 200_000_000;
    const citAfter = Math.round(citBefore * (1 - result.reductionRate));
    expect(result.isEligible).toBe(true);
    expect(citAfter).toBe(140_000_000);
  });
});

describe('VAT 2% REDUCTION WINDOW GUARDRAIL - NĐ 174/2025/NĐ-CP (8% chỉ đến 31/12/2026)', () => {
  it('should keep the 8% rate active within the reduction window (2026)', () => {
    const result = evaluateVatReductionWindow('2026-12-31');

    expect(result.isWithinReductionWindow).toBe(true);
    expect(result.applicableRate).toBe(VAT_REDUCED_RATE);
    expect(result.householdBusinessGoodsRate).toBe(0.008);
    expect(result.warningVi).toBeNull();
    expect(VAT_REDUCED_RATE).toBe(0.08);
    expect(VAT_REDUCED_RATE_VALID_UNTIL).toBe('2026-12-31');
  });

  it('should warn that the rate returns to 10% from 2027-01-01', () => {
    const result = evaluateVatReductionWindow('2027-01-01');

    expect(result.isWithinReductionWindow).toBe(false);
    expect(result.applicableRate).toBe(0.10);
    expect(result.householdBusinessGoodsRate).toBe(0.01);
    expect(result.warningVi).toContain('2027-01-01');
    expect(result.warningVi).toContain('10%');
    expect(result.warningVi).toContain('174/2025');
  });

  it('should report the pre-window period (before 2025-07-01) at the standard 10% rate', () => {
    const result = evaluateVatReductionWindow('2025-06-30');

    expect(result.isWithinReductionWindow).toBe(false);
    expect(result.applicableRate).toBe(0.10);
    expect(result.warningVi).toContain('2025-07-01');
  });
});
