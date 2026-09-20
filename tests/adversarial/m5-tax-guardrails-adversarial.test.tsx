import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  VendorTaxStatusCode,
} from '@/services/tax/tax-guardrails';
import { generateIncomeStatement } from '@/services/financial-statements/income-statement-engine';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';

/**
 * ============================================================================
 * ADVERSARIAL CHALLENGE SUITE: TAX BOUNDARIES, FRAUD GUARDRAILS & CIT INVARIANTS
 * Milestone 5 Adversarial Audit (Empirical Challenger)
 * ============================================================================
 *
 * Target: `src/services/tax/tax-guardrails.ts`
 *
 * Attack Vectors:
 * 1. Non-Cash Payment Exact Boundaries (19.999.999 đ, 20.000.000 đ, 20.000.001 đ, 50.000.000.000 đ).
 * 2. Payment Method Normalization & Diacritic/Whitespace Permutations.
 * 3. Vendor Tax Status Stress Matrix (00, 03, 04, Fallbacks across 10-digit, 13-digit & malformed MSTs).
 * 4. Schedule B4 & CIT Invariants (max(0, taxableIncome * 20%), Loss scenarios, Astronomical amounts, Malformed items).
 * 5. End-to-End Financial Statement Cascade & Voucher Workbench Integration.
 */

describe('ADVERSARIAL STRESS: Tax Guardrails & Regulatory Invariants (M5)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // BATTERY 1: Non-Cash Payment Threshold (>= 20M VNĐ) Exact Boundaries
  // ==========================================================================
  describe('Battery 1: Non-Cash Payment Exact Boundaries (TT 219/2013 & TT 96/2015)', () => {
    it('exact boundary: 19,999,999 VNĐ in cash is COMPLIANT (below 20M threshold)', () => {
      const result = evaluateNonCashRule(19_999_999, 'CASH');

      expect(result.isViolated).toBe(false);
      expect(result.vatCreditable).toBe(true);
      expect(result.citDeductible).toBe(true);
      expect(result.totalAmount).toBe(19_999_999);
      expect(result.threshold).toBe(NON_CASH_PAYMENT_THRESHOLD);
      expect(result.statutoryBasis).toBe(STATUTORY_BASIS_NON_CASH);
      expect(result.explanationVi).toContain('dưới 20.000.000 VNĐ');
    });

    it('exact boundary: exactly 20,000,000 VNĐ in cash VIOLATES non-cash condition (>= 20M rule)', () => {
      const result = evaluateNonCashRule(20_000_000, 'CASH');

      expect(result.isViolated).toBe(true);
      expect(result.vatCreditable).toBe(false);
      expect(result.citDeductible).toBe(false);
      expect(result.totalAmount).toBe(20_000_000);
      expect(result.threshold).toBe(20_000_000);
      expect(result.statutoryBasis).toBe(STATUTORY_BASIS_NON_CASH);
      expect(result.explanationVi).toContain('từ 20.000.000 VNĐ trở lên');
      expect(result.explanationVi).toContain('Chỉ tiêu B4');
    });

    it('exact boundary: exactly 20,000,000 VNĐ via bank transfer is FULLY COMPLIANT', () => {
      const result = evaluateNonCashRule(20_000_000, 'BANK_TRANSFER');

      expect(result.isViolated).toBe(false);
      expect(result.vatCreditable).toBe(true);
      expect(result.citDeductible).toBe(true);
      expect(result.totalAmount).toBe(20_000_000);
      expect(result.explanationVi).toContain('đáp ứng đầy đủ điều kiện');
    });

    it('exact boundary: 20,000,001 VNĐ in cash VIOLATES non-cash condition', () => {
      const result = evaluateNonCashRule(20_000_001, '111');

      expect(result.isViolated).toBe(true);
      expect(result.vatCreditable).toBe(false);
      expect(result.citDeductible).toBe(false);
      expect(result.totalAmount).toBe(20_000_001);
    });

    it('exact boundary: 20,000,001 VNĐ via bank transfer is FULLY COMPLIANT', () => {
      const result = evaluateNonCashRule(20_000_001, 'BANK_TRANSFER');

      expect(result.isViolated).toBe(false);
      expect(result.vatCreditable).toBe(true);
      expect(result.citDeductible).toBe(true);
    });

    it('astronomical scale: 50,000,000,000 VNĐ in cash VIOLATES non-cash condition', () => {
      const result = evaluateNonCashRule(50_000_000_000, 'TIEN_MAT');

      expect(result.isViolated).toBe(true);
      expect(result.vatCreditable).toBe(false);
      expect(result.citDeductible).toBe(false);
      expect(result.totalAmount).toBe(50_000_000_000);
    });

    it('astronomical scale: 50,000,000,000 VNĐ via bank transfer is FULLY COMPLIANT', () => {
      const result = evaluateNonCashRule(50_000_000_000, '1121');

      expect(result.isViolated).toBe(false);
      expect(result.vatCreditable).toBe(true);
      expect(result.citDeductible).toBe(true);
      expect(result.totalAmount).toBe(50_000_000_000);
    });

    it('floating precision: 19,999,999.99 VNĐ in cash is COMPLIANT (strictly < 20M)', () => {
      const result = evaluateNonCashRule(19_999_999.99, 'CASH');
      expect(result.isViolated).toBe(false);
      expect(result.vatCreditable).toBe(true);
    });

    it('floating precision: 20,000,000.01 VNĐ in cash VIOLATES (> 20M)', () => {
      const result = evaluateNonCashRule(20_000_000.01, 'CASH');
      expect(result.isViolated).toBe(true);
      expect(result.vatCreditable).toBe(false);
    });

    it('handles zero and negative invoice amounts safely without false violation', () => {
      // Zero amount
      const zeroCash = evaluateNonCashRule(0, 'CASH');
      expect(zeroCash.isViolated).toBe(false);
      expect(zeroCash.vatCreditable).toBe(true);

      // Return goods / discount credit note (-15M)
      const negativeCash = evaluateNonCashRule(-15_000_000, 'CASH');
      expect(negativeCash.isViolated).toBe(false);
      expect(negativeCash.vatCreditable).toBe(true);
    });
  });

  // ==========================================================================
  // BATTERY 2: Payment Method Variations, Normalization & Diacritics
  // ==========================================================================
  describe('Battery 2: Payment Method Normalization & Diacritic Permutations', () => {
    const cashVariations = [
      'CASH',
      'cash',
      'Cash',
      'TIEN_MAT',
      'tien_mat',
      'Tien_Mat',
      'TM',
      'tm',
      '111',
      '1111',
      '1112',
      '1113',
      'Tiền mặt',
      'TIỀN MẶT',
      'Tiền mặt tại quỹ',
      'TIEN MAT',
      'tien mat',
      '  CASH  ',
      '\tTIEN_MAT\n',
      '  1111  ',
      '   Tiền mặt   ',
    ];

    it.each(cashVariations)(
      'should identify cash payment method: "%s"',
      (method) => {
        expect(isCashPaymentMethod(method)).toBe(true);
        // If >= 20M, must trigger violation
        const res = evaluateNonCashRule(20_000_000, method);
        expect(res.isViolated).toBe(true);
        expect(res.vatCreditable).toBe(false);
        expect(res.citDeductible).toBe(false);
      }
    );

    const nonCashVariations = [
      'BANK_TRANSFER',
      'bank_transfer',
      'Bank_Transfer',
      '112',
      '1121',
      '1122',
      '1123',
      'CHUYEN_KHOAN',
      'chuyen_khoan',
      'CK',
      'ck',
      'UNC',
      'Ủy nhiệm chi',
      'Chuyển khoản qua BIDV',
      '  BANK_TRANSFER  ',
      '\t1121\n',
      '  CHUYEN_KHOAN  ',
    ];

    it.each(nonCashVariations)(
      'should identify non-cash payment method: "%s"',
      (method) => {
        expect(isCashPaymentMethod(method)).toBe(false);
        // Even at 100M, non-cash method must NOT violate
        const res = evaluateNonCashRule(100_000_000, method);
        expect(res.isViolated).toBe(false);
        expect(res.vatCreditable).toBe(true);
        expect(res.citDeductible).toBe(true);
      }
    );

    it('should handle undefined, null, and empty payment methods defensively', () => {
      expect(isCashPaymentMethod(undefined as unknown as string)).toBe(false);
      expect(isCashPaymentMethod(null as unknown as string)).toBe(false);
      expect(isCashPaymentMethod('')).toBe(false);
      expect(isCashPaymentMethod('   ')).toBe(false);

      const nullCheck = evaluateNonCashRule(20_000_000, null as unknown as string);
      expect(nullCheck.isViolated).toBe(false);

      const undefinedCheck = evaluateNonCashRule(20_000_000, undefined as unknown as string);
      expect(undefinedCheck.isViolated).toBe(false);
    });
  });

  // ==========================================================================
  // BATTERY 3: Vendor Tax Status Matrix & Fraud Prevention (00 vs 03 vs 04)
  // ==========================================================================
  describe('Battery 3: Vendor Tax Status Stress Matrix across MST Formats', () => {
    const testTaxCodes = [
      { type: '10-digit standard MST', mst: '0101234567' },
      { type: '10-digit standard MST (Southern)', mst: '0315887229' },
      { type: '13-digit branch MST', mst: '0101234567-001' },
      { type: '13-digit branch MST (999)', mst: '0315887229-999' },
      { type: 'Empty tax code', mst: '' },
      { type: 'Malformed tax code (short)', mst: '123' },
      { type: 'Malformed tax code (letters)', mst: 'ABCDEF1234' },
      { type: 'Special characters', mst: '!@#$%^&*()' },
    ];

    it.each(testTaxCodes)(
      'Status 00 (Active) for $type ($mst) must be NORMAL, creditable and deductible',
      ({ mst }) => {
        const res = evaluateVendorTaxStatus(mst, '00');
        expect(res.vendorTaxCode).toBe(mst);
        expect(res.vendorTaxStatus).toBe('00');
        expect(res.riskLevel).toBe('NORMAL');
        expect(res.isFraudRisk).toBe(false);
        expect(res.vatCreditable).toBe(true);
        expect(res.citDeductible).toBe(true);
        expect(res.statutoryBasis).toBe(STATUTORY_BASIS_VENDOR_ACTIVE);
        expect(res.statusNameVi).toContain('Đang hoạt động');
        expect(res.recommendationVi).toContain('đủ điều kiện');
      }
    );

    it.each(testTaxCodes)(
      'Status 03 (Suspended) for $type ($mst) must trigger audit warning and disallow deduction during suspension',
      ({ mst }) => {
        const res = evaluateVendorTaxStatus(mst, '03');
        expect(res.vendorTaxCode).toBe(mst);
        expect(res.vendorTaxStatus).toBe('03');
        expect(res.riskLevel).toBe('MEDIUM');
        expect(res.isFraudRisk).toBe(false);
        expect(res.vatCreditable).toBe(false);
        expect(res.citDeductible).toBe(false);
        expect(res.statutoryBasis).toBe(STATUTORY_BASIS_VENDOR_SUSPENDED);
        expect(res.statusNameVi).toContain('Tạm ngừng kinh doanh');
        expect(res.recommendationVi).toContain('Cảnh báo rủi ro thanh tra thuế cao');
        expect(res.recommendationVi).toContain('đối chiếu ngày phát hành');
      }
    );

    it.each(testTaxCodes)(
      'Status 04 (Runaway) for $type ($mst) must flag 100% tax fraud and disallow both VAT & CIT',
      ({ mst }) => {
        const res = evaluateVendorTaxStatus(mst, '04');
        expect(res.vendorTaxCode).toBe(mst);
        expect(res.vendorTaxStatus).toBe('04');
        expect(res.riskLevel).toBe('HIGH');
        expect(res.isFraudRisk).toBe(true);
        expect(res.vatCreditable).toBe(false);
        expect(res.citDeductible).toBe(false);
        expect(res.statutoryBasis).toBe(STATUTORY_BASIS_VENDOR_RUNAWAY);
        expect(res.statusNameVi).toContain('Bỏ trốn');
        expect(res.explanationVi).toContain('Khoản 2 Điều 4 Nghị định 123/2020/NĐ-CP');
        expect(res.explanationVi).toContain('100% rủi ro gian lận thuế');
        expect(res.recommendationVi).toContain('Mục B4');
      }
    );

    it('fallback behavior: unrecognized status code fails closed to Status 04 (HIGH risk fraud)', () => {
      const res = evaluateVendorTaxStatus('0101234567', '99' as VendorTaxStatusCode);
      expect(res.vendorTaxStatus).toBe('04');
      expect(res.riskLevel).toBe('HIGH');
      expect(res.isFraudRisk).toBe(true);
      expect(res.vatCreditable).toBe(false);
      expect(res.citDeductible).toBe(false);
    });
  });

  // ==========================================================================
  // BATTERY 4: Schedule B4 & CIT Invariants (Losses, Break-even, Trillion Scale)
  // ==========================================================================
  describe('Battery 4: Schedule B4 & CIT Calculation Invariants', () => {
    it('accounting loss offset by large B4 disallowed expenses creates positive taxable income', () => {
      // Company lost -100M VND, but had 160M VND of disallowed expenses (B4)
      const b4Items: ScheduleB4Item[] = [
        { code: 'B4-CASH', amount: 60_000_000, reasonVi: 'Hóa đơn tiền mặt >= 20M' },
        { code: 'B4-RUNAWAY', amount: 100_000_000, reasonVi: 'Hóa đơn nhà cung cấp bỏ trốn Status 04' },
      ];

      const res = calculateCitScheduleB4(-100_000_000, b4Items);

      expect(res.accountingProfitBeforeTax).toBe(-100_000_000);
      expect(res.totalB4Disallowed).toBe(160_000_000);
      // Taxable income = -100M + 160M = +60M
      expect(res.taxableIncome).toBe(60_000_000);
      expect(res.citRate).toBe(STANDARD_CIT_RATE);
      // CIT payable = 60M * 20% = 12M
      expect(res.citPayable).toBe(12_000_000);
    });

    it('accounting loss exceeding B4 adjustments yields 0 CIT payable (never negative)', () => {
      // Accounting loss = -300M, B4 = 100M -> Taxable income = -200M
      const b4Items: ScheduleB4Item[] = [
        { code: 'B4-01', amount: 100_000_000, reasonVi: 'Chi phí không hóa đơn' },
      ];

      const res = calculateCitScheduleB4(-300_000_000, b4Items);

      expect(res.taxableIncome).toBe(-200_000_000);
      // Invariant: CIT Payable must NEVER be negative
      expect(res.citPayable).toBe(0);
      expect(res.citPayable).toBeGreaterThanOrEqual(0);
    });

    it('loss exactly equal to B4 adjustments yields 0 CIT payable', () => {
      const b4Items: ScheduleB4Item[] = [
        { code: 'B4-01', amount: 50_000_000, reasonVi: 'Chi phí bị loại' },
      ];

      const res = calculateCitScheduleB4(-50_000_000, b4Items);
      expect(res.taxableIncome).toBe(0);
      expect(res.citPayable).toBe(0);
    });

    it('zero accounting profit with B4 adjustments generates proportional CIT', () => {
      const b4Items: ScheduleB4Item[] = [
        { code: 'B4-01', amount: 80_000_000, reasonVi: 'Tiền phạt vi phạm thuế' },
      ];

      const res = calculateCitScheduleB4(0, b4Items);
      expect(res.taxableIncome).toBe(80_000_000);
      expect(res.citPayable).toBe(16_000_000);
    });

    it('zero profit with zero B4 adjustments generates zero CIT', () => {
      const res = calculateCitScheduleB4(0, []);
      expect(res.taxableIncome).toBe(0);
      expect(res.citPayable).toBe(0);
    });

    it('handles astronomical amounts (trillion-scale) without overflow or precision collapse', () => {
      // Profit: 50 trillion VND, B4: 10 trillion VND
      const b4Items: ScheduleB4Item[] = [
        { code: 'B4-BIG', amount: 10_000_000_000_000, reasonVi: 'Khoản chi lớn' },
      ];

      const res = calculateCitScheduleB4(50_000_000_000_000, b4Items);

      expect(res.taxableIncome).toBe(60_000_000_000_000);
      expect(res.citPayable).toBe(12_000_000_000_000);
    });

    it('handles empty, undefined, and null disallowed expenses arrays gracefully', () => {
      const emptyRes = calculateCitScheduleB4(100_000_000, []);
      expect(emptyRes.totalB4Disallowed).toBe(0);
      expect(emptyRes.taxableIncome).toBe(100_000_000);
      expect(emptyRes.citPayable).toBe(20_000_000);

      const undefinedRes = calculateCitScheduleB4(100_000_000, undefined);
      expect(undefinedRes.totalB4Disallowed).toBe(0);
      expect(undefinedRes.taxableIncome).toBe(100_000_000);
      expect(undefinedRes.citPayable).toBe(20_000_000);

      const nullRes = calculateCitScheduleB4(100_000_000, null as unknown as ScheduleB4Item[]);
      expect(nullRes.totalB4Disallowed).toBe(0);
      expect(nullRes.taxableIncome).toBe(100_000_000);
      expect(nullRes.citPayable).toBe(20_000_000);
    });

    it('defensively clamps negative amounts in B4 items to 0 (cannot illegally reduce B4)', () => {
      const maliciousItems: ScheduleB4Item[] = [
        { code: 'MAL-1', amount: -50_000_000, reasonVi: 'Cố tình nhập số âm' },
        { code: 'VALID', amount: 20_000_000, reasonVi: 'Hợp lệ' },
      ];

      const res = calculateCitScheduleB4(100_000_000, maliciousItems);
      // Malicious negative item is clamped to 0, total B4 is 20M
      expect(res.totalB4Disallowed).toBe(20_000_000);
      expect(res.taxableIncome).toBe(120_000_000);
      expect(res.citPayable).toBe(24_000_000);
    });

    it('handles non-numeric, NaN, and string amounts in B4 items safely', () => {
      const dirtyItems = [
        { code: 'DIRT-1', amount: '30000000' as unknown as number, reasonVi: 'String amount' },
        { code: 'DIRT-2', amount: NaN, reasonVi: 'NaN amount' },
        { code: 'DIRT-3', amount: null as unknown as number, reasonVi: 'Null amount' },
        { code: 'DIRT-4', amount: undefined as unknown as number, reasonVi: 'Undefined amount' },
      ];

      const res = calculateCitScheduleB4(50_000_000, dirtyItems);
      // '30000000' parsed to 30M, NaN/null/undefined converted to 0
      expect(res.totalB4Disallowed).toBe(30_000_000);
      expect(res.taxableIncome).toBe(80_000_000);
      expect(res.citPayable).toBe(16_000_000);
    });

    it('stress tests accumulator with 500 B4 items', () => {
      const items: ScheduleB4Item[] = Array.from({ length: 500 }, (_, i) => ({
        code: `B4-${i}`,
        amount: 1_000_000,
        reasonVi: `Khoản chi thứ ${i}`,
      }));

      const res = calculateCitScheduleB4(100_000_000, items);
      // 500 * 1M = 500M
      expect(res.totalB4Disallowed).toBe(500_000_000);
      expect(res.taxableIncome).toBe(600_000_000);
      expect(res.citPayable).toBe(120_000_000);
    });

    it('rounds fractional taxable income to exact integer VNĐ', () => {
      // 10,000,001.33 * 20% = 2,000,000.266 -> Math.round -> 2,000,000
      const res = calculateCitScheduleB4(10_000_001.33, []);
      expect(res.citPayable).toBe(2_000_000);
    });

    it('calculateCitAdjustments helper creates valid B4 items and defaults profit to 0', () => {
      const simpleItems = [
        { code: 'B4-01', amount: 25_000_000, reasonVi: 'Hóa đơn tiền mặt 25M' },
      ];

      // Default profit is 0
      const res = calculateCitAdjustments(simpleItems);
      expect(res.accountingProfitBeforeTax).toBe(0);
      expect(res.totalB4Disallowed).toBe(25_000_000);
      expect(res.taxableIncome).toBe(25_000_000);
      expect(res.citPayable).toBe(5_000_000);
      expect(res.items[0]?.statutoryBasis).toContain('Thông tư 78/2014/TT-BTC');
    });
  });

  // ==========================================================================
  // BATTERY 5: Income Statement & VoucherInspector End-to-End Cascade
  // ==========================================================================
  describe('Battery 5: Income Statement Cascade & VoucherInspector UI Diagnostics', () => {
    it('integrates B4 disallowed expenses into Income Statement cascade (Mã 50 -> Mã 51 -> Mã 60)', () => {
      const amounts = {
        grossRevenue: 500_000_000,
        revenueDeductions: 0,
        costOfGoodsSold: 300_000_000,
        generalAdminExpenses: 100_000_000,
        // Pre-tax accounting profit (Mã 50) = 500M - 300M - 100M = 100M
        disallowedExpenses: [
          {
            code: 'B4-CASH-20M',
            amount: 50_000_000,
            reasonVi: 'Chi phí mua hàng thanh toán tiền mặt >= 20M',
          },
        ],
      };

      const statement = generateIncomeStatement(amounts);

      // Mã 50 (Accounting profit) must NOT be distorted by B4
      expect(statement.accountingProfitBeforeTax).toBe(100_000_000);

      // Mã 51 (CIT expense) must reflect taxable income = 100M + 50M = 150M -> 150M * 20% = 30M
      expect(statement.citExpense).toBe(30_000_000);

      // Mã 60 (Net profit after tax) = Mã 50 - Mã 51 = 100M - 30M = 70M
      expect(statement.netProfitAfterTax).toBe(70_000_000);
    });

    it('renders and verifies all 4 VoucherInspector cases under adversarial inspection', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Case 1: Valid cash 15M -> no warning banner
      expect(screen.queryByTestId('non-cash-rule-warning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vendor-tax-status-warning')).not.toBeInTheDocument();

      // Case 2: Cash 20M -> non-cash warning must trigger
      fireEvent.click(screen.getByText(/Hóa đơn Điện Máy Đúng 20 Triệu/i));
      expect(screen.getByTestId('non-cash-rule-warning')).toBeInTheDocument();
      expect(screen.getByText(/Cảnh báo Vi phạm Thanh toán Tiền mặt/i)).toBeInTheDocument();

      // Case 3: Status 03 Suspended -> vendor tax status warning must trigger
      fireEvent.click(screen.getByText(/Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng/i));
      expect(screen.getByTestId('vendor-tax-status-warning')).toBeInTheDocument();
      expect(screen.getByText(/NNT Tạm ngừng kinh doanh có thời hạn/i)).toBeInTheDocument();

      // Case 4: Status 04 Runaway -> runaway fraud warning must trigger
      fireEvent.click(screen.getByText(/Hóa đơn Phát sinh từ Doanh nghiệp Bỏ Địa chỉ/i));
      expect(screen.getByTestId('vendor-tax-status-warning')).toBeInTheDocument();
      expect(screen.getByText(/NNT Không hoạt động tại địa chỉ đã đăng ký/i)).toBeInTheDocument();
    });
  });
});
