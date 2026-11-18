import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaxComplianceTools } from '@/components/voucher/TaxComplianceTools';
import {
  calculateEcommerceSellerTaxObligation,
  reconcileSellerWithPlatform,
  RECONCILIATION_VARIANCE_THRESHOLD_PERCENT,
} from '@/services/tax/ecommerce-tax';
import { calculateRdAdditionalDeduction } from '@/services/tax/rd-deduction';
import { STANDARD_CIT_RATE } from '@/services/tax/tax-guardrails';

/**
 * UI wrapper tests cho TaxComplianceTools (tab "Thuế TMĐT & R&D").
 * Mỗi test kiểm tra invariant tính toán THẬT (không snapshot):
 * kết quả UI phải khớp kết quả pure function của engine cùng input.
 */

const typeAmount = (textbox: HTMLInputElement, value: string) => {
  fireEvent.change(textbox, { target: { value } });
};

const getAmountInputByLabel = (labelText: RegExp): HTMLInputElement => {
  const label = screen.getByText(labelText).closest('label');
  if (!label) throw new Error(`Không tìm thấy label: ${labelText}`);
  const input = label.querySelector('input');
  if (!input) throw new Error(`Label "${labelText}" không có input`);
  return input as HTMLInputElement;
};

describe('TAX COMPLIANCE TOOLS UI WRAPPER', () => {
  it('renders both tool tabs and shows the e-commerce empty state before input', () => {
    render(<TaxComplianceTools />);

    expect(screen.getByTestId('tax-compliance-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tool-tab-ecommerce')).toBeInTheDocument();
    expect(screen.getByTestId('tool-tab-rd')).toBeInTheDocument();
    expect(screen.getByTestId('ecommerce-tax-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('ecommerce-empty-state')).toBeInTheDocument();
  });

  it('enterprise CIT computed by engine (taxable income x 20%) is shown with statutory basis', () => {
    const taxableIncome = 2_000_000_000;
    render(<TaxComplianceTools />);

    fireEvent.click(screen.getByTestId('seller-type-enterprise'));
    typeAmount(getAmountInputByLabel(/Doanh thu gộp trên sàn/i), '5000000000');
    typeAmount(getAmountInputByLabel(/Thu nhập chịu thuế TNDN/i), String(taxableIncome));

    const citEl = screen.getByTestId('ecom-cit-self-declared');
    expect(citEl).toHaveTextContent('400');

    // Invariant: UI phải khớp kết quả engine cùng input
    const engine = calculateEcommerceSellerTaxObligation(
      [
        {
          platform: 'SHOPEE',
          sellerType: 'ENTERPRISE',
          sellerName: 'Doanh nghiệp trên sàn TMĐT',
          grossRevenue: 5_000_000_000,
          platformFee: 0,
          netRevenue: 5_000_000_000,
          vatRate: 0,
          vatAmount: 0,
          transactionDate: '',
        },
      ],
      '11/2026',
      { name: 'Doanh nghiệp trên sàn TMĐT', type: 'ENTERPRISE' },
      { enterpriseTaxableIncome: taxableIncome }
    );
    expect(engine.citSelfDeclared).toBe(taxableIncome * STANDARD_CIT_RATE);
    expect(Number(citEl.textContent?.replace(/[^\d]/g, ''))).toBe(engine.citSelfDeclared);

    // Mỗi kết luận phải có statutoryBasis hiển thị
    expect(screen.getByTestId('ecom-basis-nd117')).toHaveTextContent(/117\/2025\/NĐ-CP/);
    expect(screen.getByTestId('ecom-basis-cit-rate')).toHaveTextContent(/20%/);
  });

  it('flags the 1B household threshold with ND 141/2026 statutory basis, and shows the reconciliation TODO-verify note', () => {
    render(<TaxComplianceTools />);

    // Hộ KD doanh thu > 1 tỷ
    typeAmount(getAmountInputByLabel(/Doanh thu gộp trên sàn/i), '1200000000');
    expect(screen.getByTestId('ecom-threshold-warning')).toBeInTheDocument();
    expect(screen.getByTestId('ecom-basis-nd141')).toHaveTextContent(/141\/2026\/NĐ-CP/);

    // Đối chiếu: tự khai 1.1 tỷ vs sàn 1 tỷ → lệch 10% > ngưỡng 5%
    typeAmount(getAmountInputByLabel(/Doanh thu tự khai báo/i), '1100000000');
    typeAmount(getAmountInputByLabel(/Doanh thu sàn báo cáo/i), '1000000000');

    expect(screen.getByTestId('ecom-variance-percent')).toHaveTextContent('10.0%');
    const recon = screen.getByTestId('ecom-reconciliation');
    expect(recon).toHaveTextContent(/LỆCH/);
    // Nhãn ngưỡng tham khảo: PHẢI ghi rõ chưa có statutoryBasis (TODO verify của engine)
    expect(recon).toHaveTextContent(/ngưỡng tham khảo, chưa có statutoryBasis/);

    // Invariant: UI variance khớp engine
    const engineRecon = reconcileSellerWithPlatform(1_100_000_000, 1_000_000_000);
    expect(engineRecon.reconciled).toBe(false);
    expect(engineRecon.adjustmentNeeded).toBe('ADDITIONAL_DECLARATION');
    expect(engineRecon.variancePercent).toBeGreaterThan(RECONCILIATION_VARIANCE_THRESHOLD_PERCENT);
  });

  it('R&D calculator: 200% deduction on 5B MOST-approved expenses, CIT saved x 20%, B4 reference and statutory basis', () => {
    render(<TaxComplianceTools />);

    fireEvent.click(screen.getByTestId('tool-tab-rd'));
    expect(screen.getByTestId('rd-empty-state')).toBeInTheDocument();

    typeAmount(getAmountInputByLabel(/Bộ KHCN phê duyệt/i), '5000000000');

    // Mức giảm thu nhập chịu thuế = 5 tỷ x 100% (khấu trừ thêm của mức 200%)
    expect(screen.getByTestId('rd-additional-deduction')).toHaveTextContent('5.000.000.000');
    // Thuế TNDN tiết kiệm = 5 tỷ x 20% = 1 tỷ
    expect(screen.getByTestId('rd-cit-saved')).toHaveTextContent('1.000.000.000');
    // Tham chiếu Chỉ tiêu B4 (khớp module-08 c24-6)
    expect(screen.getByTestId('rd-b4-reference')).toHaveTextContent(/Chỉ tiêu B4/);
    expect(screen.getByTestId('rd-b4-reference')).toHaveTextContent(/module-08, bài c24-6/);
    expect(screen.getByTestId('rd-basis-law67')).toHaveTextContent(/67\/2025\/QH15/);
    expect(screen.getByTestId('rd-basis-law67')).toHaveTextContent(/320\/2025\/NĐ-CP/);

    // Invariant: UI khớp engine
    const engine = calculateRdAdditionalDeduction([
      { id: 'x', descriptionVi: '', amount: 5_000_000_000, projectStatus: 'MOST_APPROVED' },
    ]);
    expect(engine.totalAdditionalDeduction).toBe(5_000_000_000);
    expect(engine.citAdjustmentB4).toBe(-5_000_000_000);
  });

  it('shows error state for invalid (negative) input in both tools', () => {
    render(<TaxComplianceTools />);

    typeAmount(getAmountInputByLabel(/Doanh thu gộp trên sàn/i), '-5');
    expect(screen.getByTestId('ecommerce-error-state')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tool-tab-rd'));
    typeAmount(getAmountInputByLabel(/Bộ KHCN phê duyệt/i), '-1000');
    expect(screen.getByTestId('rd-error-state')).toBeInTheDocument();
  });
});
