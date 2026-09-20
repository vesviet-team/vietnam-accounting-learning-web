import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManufacturingCostCalculator from '@/components/workbench/cogs/ManufacturingCostCalculator';
import { ManufacturingCostInput } from '@/types/cogs';

describe('Manufacturing Cost Workbench & Abnormal Waste Calculator (ManufacturingCostCalculator.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // T3.1: Renders all cost input fields ($D_{đk}$, NVL, NCTT, SXC, định mức, $Q_{tp}$, $Q_{dd}$, % hoàn thành)
  // =========================================================================
  it('T3.1: Renders all cost input fields (D_dk, NVL, NCTT, SXC, technical norms, Q_tp, Q_dd, % completion)', () => {
    render(<ManufacturingCostCalculator />);

    // Verify Title & Regulatory Header
    expect(
      screen.getByText(/BÀN TÍNH GIÁ THÀNH SẢN XUẤT & BÓC TÁCH CHI PHÍ VƯỢT ĐỊNH MỨC/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/VAS 02 Đoạn 11 & IAS 2 Para 16/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chỉ tiêu B4 Tờ khai 03\/TNDN/i).length).toBeGreaterThanOrEqual(1);

    // Verify all cost input elements
    expect(screen.getByTestId('input-beginning-wip')).toBeInTheDocument();
    expect(screen.getByTestId('input-actual-direct-material')).toBeInTheDocument();
    expect(screen.getByTestId('input-normal-direct-material')).toBeInTheDocument();
    expect(screen.getByTestId('input-actual-direct-labor')).toBeInTheDocument();
    expect(screen.getByTestId('input-normal-direct-labor')).toBeInTheDocument();
    expect(screen.getByTestId('input-actual-overhead')).toBeInTheDocument();

    // Verify quantities & methods
    expect(screen.getByTestId('input-finished-units')).toBeInTheDocument();
    expect(screen.getByTestId('input-ending-wip-units')).toBeInTheDocument();
    expect(screen.getByTestId('wip-method-DIRECT_MATERIAL')).toBeInTheDocument();
    expect(screen.getByTestId('wip-method-EQUIVALENT_UNITS')).toBeInTheDocument();

    // Switch to EUP to reveal completion percentage field
    fireEvent.click(screen.getByTestId('wip-method-EQUIVALENT_UNITS'));
    expect(screen.getByTestId('input-completion-percentage')).toBeInTheDocument();
  });

  // =========================================================================
  // T3.2: Switches between Circular 99/200 mode and Circular 133 mode
  // =========================================================================
  it('T3.2: Switches between Circular 99/200 mode (accounts 621, 622, 627) and Circular 133 mode (sub-accounts 1541, 1542, 1544)', () => {
    render(<ManufacturingCostCalculator />);

    // Initially in Circular 200 mode
    const flowIndicator = screen.getByTestId('coa-flow-indicator');
    expect(flowIndicator).toHaveTextContent('TK 621 (NVL)');
    expect(flowIndicator).toHaveTextContent('TK 622 (Nhân công)');
    expect(flowIndicator).toHaveTextContent('TK 627 (SXC)');
    expect(flowIndicator).toHaveTextContent('TK 154');
    expect(flowIndicator).toHaveTextContent('TK 155');

    // Verify journal entries contain TK 621 under Circular 200
    const journalTable = screen.getByTestId('journal-entries-table');
    expect(journalTable).toHaveTextContent(/Có 621/i);

    // Switch to Circular 133
    const btn133 = screen.getByTestId('regime-btn-CIRCULAR_133');
    fireEvent.click(btn133);

    // Verify flow indicator updates to 1541, 1542, 1544
    expect(flowIndicator).toHaveTextContent('TK 1541 (NVL)');
    expect(flowIndicator).toHaveTextContent('TK 1542 (Nhân công)');
    expect(flowIndicator).toHaveTextContent('TK 1544 (SXC)');
    expect(flowIndicator).toHaveTextContent('Cấm sử dụng TK 621, 622, 627 theo Thông tư 133');

    // In Circular 133, accounts 621, 622, 627 must NOT appear in journal entries
    expect(journalTable).not.toHaveTextContent(/Có 621/i);
    expect(journalTable).not.toHaveTextContent(/Có 622/i);
    expect(journalTable).not.toHaveTextContent(/Có 627/i);
    expect(journalTable).toHaveTextContent(/Có 152/i);

    // Switch back to Circular 200
    const btn200 = screen.getByTestId('regime-btn-CIRCULAR_200');
    fireEvent.click(btn200);
    expect(flowIndicator).toHaveTextContent('TK 621 (NVL)');
  });

  // =========================================================================
  // T3.3: Calculates total cost Z and unit cost z accurately
  // =========================================================================
  it('T3.3: Calculates total manufacturing cost Z and unit cost z accurately', () => {
    const customInput: Partial<ManufacturingCostInput> = {
      regime: 'CIRCULAR_200',
      beginningWip: 10_000_000,
      actualDirectMaterial: 60_000_000,
      normalDirectMaterial: 60_000_000,
      actualDirectLabor: 20_000_000,
      normalDirectLabor: 20_000_000,
      actualOverhead: 10_000_000,
      finishedUnits: 800,
      endingWipUnits: 200,
      wipMethod: 'DIRECT_MATERIAL',
    };

    render(<ManufacturingCostCalculator initialInput={customInput} />);

    // Verification of Mathematical Formula:
    // C_hợp lý = 60M + 20M + 10M = 90M
    // Total units = 800 + 200 = 1000
    // Ending WIP (Direct Material): (10M + 60M) / 1000 * 200 = 14M
    // Total Z = 10M + 90M - 14M = 86M
    // Unit z = 86M / 800 = 107,500 đ/sp
    expect(screen.getByTestId('kpi-beginning-wip')).toHaveTextContent('10.000.000 đ');
    expect(screen.getByTestId('kpi-total-eligible-cost')).toHaveTextContent('90.000.000 đ');
    expect(screen.getByTestId('kpi-ending-wip-cost')).toHaveTextContent('14.000.000 đ');
    expect(screen.getByTestId('kpi-total-cost-z')).toHaveTextContent('86.000.000 đ');
    expect(screen.getByTestId('kpi-unit-cost-z')).toHaveTextContent('107.500 đ/sp');
  });

  // =========================================================================
  // T3.4: Switches WIP method between "Direct Material" and "EUP" and verifies difference in ending WIP
  // =========================================================================
  it('T3.4: Switches WIP method between "Direct Material" and "EUP" and verifies difference in ending WIP', () => {
    const customInput: Partial<ManufacturingCostInput> = {
      regime: 'CIRCULAR_200',
      beginningWip: 10_000_000,
      actualDirectMaterial: 60_000_000,
      normalDirectMaterial: 60_000_000,
      actualDirectLabor: 20_000_000,
      normalDirectLabor: 20_000_000,
      actualOverhead: 10_000_000,
      finishedUnits: 800,
      endingWipUnits: 200,
      wipMethod: 'DIRECT_MATERIAL',
      completionPercentage: 50,
    };

    render(<ManufacturingCostCalculator initialInput={customInput} />);

    // Direct Material ending WIP is 14,000,000 đ
    expect(screen.getByTestId('kpi-ending-wip-cost')).toHaveTextContent('14.000.000 đ');
    expect(screen.getByTestId('kpi-total-cost-z')).toHaveTextContent('86.000.000 đ');

    // Switch to EUP with 50% completion
    fireEvent.click(screen.getByTestId('wip-method-EQUIVALENT_UNITS'));

    // Under EUP (50%):
    // Q_dd_td = 200 * 50% = 100
    // Total conversion units = 800 + 100 = 900
    // Total conversion cost = 20M + 10M = 30M
    // Unit conversion = 30M / 900 = 33,333.33
    // Conversion WIP = 33,333.33 * 100 = 3,333,333
    // Material WIP = 14,000,000
    // Total Ending WIP = 14M + 3,333,333 = 17,333,333 đ
    // Total Z = 10M + 90M - 17,333,333 = 82,666,667 đ
    expect(screen.getByTestId('kpi-ending-wip-cost')).toHaveTextContent('17.333.333 đ');
    expect(screen.getByTestId('kpi-total-cost-z')).toHaveTextContent('82.666.667 đ');
  });

  // =========================================================================
  // T3.5: Calculates and displays abnormal material waste exceeding technical norm
  // =========================================================================
  it('T3.5: Calculates and displays abnormal material waste exceeding technical norm (VAS 02 Paragraph 11)', () => {
    const customInput: Partial<ManufacturingCostInput> = {
      actualDirectMaterial: 150_000_000,
      normalDirectMaterial: 120_000_000, // 30,000,000 đ abnormal waste
      actualDirectLabor: 40_000_000,
      normalDirectLabor: 40_000_000,
      actualOverhead: 30_000_000,
    };

    render(<ManufacturingCostCalculator initialInput={customInput} />);

    // Check abnormal waste display
    expect(screen.getByTestId('kpi-abnormal-waste')).toHaveTextContent('30.000.000 đ');

    // Eligible cost must only absorb normal direct material (120M) + labor (40M) + overhead (30M) = 190M
    expect(screen.getByTestId('kpi-total-eligible-cost')).toHaveTextContent('190.000.000 đ');

    // Waste label indicator
    expect(screen.getByText(/Vượt: 30.000.000 đ/i)).toBeInTheDocument();
  });

  // =========================================================================
  // T3.6: Displays tax impact card (abnormal waste routed to TK 632 and resulting CIT impact at 20% / Chỉ tiêu B4)
  // =========================================================================
  it('T3.6: Displays tax impact card: abnormal cost routed to TK 632 and resulting CIT impact at 20% (Chỉ tiêu B4)', () => {
    const customInput: Partial<ManufacturingCostInput> = {
      actualDirectMaterial: 150_000_000,
      normalDirectMaterial: 120_000_000, // 30M abnormal waste
    };

    render(<ManufacturingCostCalculator initialInput={customInput} />);

    // Tax Card Checks
    const taxCard = screen.getByTestId('cit-tax-card');
    expect(taxCard).toBeInTheDocument();
    expect(taxCard).toHaveTextContent('Chỉ Tiêu B4 Tờ Khai 03/TNDN');

    // Check Schedule B4 and 20% CIT amounts
    expect(screen.getByTestId('cit-b4-amount')).toHaveTextContent('30.000.000 đ');
    expect(screen.getByTestId('cit-tax-amount')).toHaveTextContent('6.000.000 đ');

    // Statutory references
    expect(taxCard).toHaveTextContent('VAS 02 Đoạn 11');
    expect(taxCard).toHaveTextContent('Thông tư 78/2014');
    expect(taxCard).toHaveTextContent('Thông tư 96/2015');

    // When abnormal waste is 0, warning should state no abnormal adjustments
    fireEvent.change(screen.getByTestId('input-normal-direct-material'), {
      target: { value: '150000000' },
    });
    expect(screen.getByTestId('kpi-abnormal-waste')).toHaveTextContent('0 đ');
    expect(
      screen.getByText(/Không phát sinh điều chỉnh tăng thu nhập chịu thuế tại Chỉ tiêu B4/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // T3.7: Displays double-entry accounting preview (Nợ 155/Có 154, Nợ 632/Có 154 hoặc 621)
  // =========================================================================
  it('T3.7: Displays accounting double-entry preview: Nợ 155 / Có 154, Nợ 632 / Có 154 (hoặc 621)', () => {
    const customInput: Partial<ManufacturingCostInput> = {
      regime: 'CIRCULAR_200',
      actualDirectMaterial: 120_000_000,
      normalDirectMaterial: 100_000_000, // 20M abnormal
    };

    render(<ManufacturingCostCalculator initialInput={customInput} />);

    const journalTable = screen.getByTestId('journal-entries-table');

    // Under Circular 200:
    // Nợ 154 / Có 621 (100M)
    // Nợ 632 / Có 621 (20M abnormal)
    // Nợ 155 / Có 154 (Total cost Z)
    expect(within(journalTable).getAllByText(/Nợ 154/i).length).toBeGreaterThanOrEqual(1);
    expect(within(journalTable).getAllByText(/Có 621/i).length).toBeGreaterThanOrEqual(1);
    expect(within(journalTable).getAllByText(/Nợ 632/i).length).toBeGreaterThanOrEqual(1);
    expect(within(journalTable).getAllByText(/Nợ 155/i).length).toBeGreaterThanOrEqual(1);

    // Switch to Circular 133
    fireEvent.click(screen.getByTestId('regime-btn-CIRCULAR_133'));

    // Under Circular 133:
    // Nợ 632 / Có 154 (20M abnormal)
    // Nợ 155 / Có 154 (Total cost Z)
    expect(within(journalTable).getAllByText(/Nợ 632/i).length).toBeGreaterThanOrEqual(1);
    expect(within(journalTable).getAllByText(/Có 154/i).length).toBeGreaterThanOrEqual(1);
    expect(within(journalTable).getAllByText(/Nợ 155/i).length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // T3.8: Provides "1-Click Transfer to Journalizer" button passing entries into callback/workbench state
  // =========================================================================
  it('T3.8: Provides "1-Click Transfer to Journalizer" button passing entries into callback/workbench state', () => {
    const handleExportMock = vi.fn();

    render(<ManufacturingCostCalculator onExportToJournalizer={handleExportMock} />);

    const exportBtn = screen.getByTestId('export-journalizer-btn');
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).not.toBeDisabled();

    // Click Export
    fireEvent.click(exportBtn);

    // Verify callback was invoked
    expect(handleExportMock).toHaveBeenCalledTimes(1);
    const passedEntries = handleExportMock.mock.calls[0][0];
    expect(Array.isArray(passedEntries)).toBe(true);
    expect(passedEntries.length).toBeGreaterThan(0);

    // Verify entry contains finished goods voucher (Nợ 155 / Có 154)
    const finishedGoodsVoucher = passedEntries.find(
      (e: any) => e.debitAccount === '155' && e.creditAccount === '154'
    );
    expect(finishedGoodsVoucher).toBeDefined();

    // Verify success confirmation banner
    expect(screen.getByTestId('export-success-banner')).toBeInTheDocument();
    expect(screen.getByText(/Đã kết chuyển thành công/i)).toBeInTheDocument();
  });

  // =========================================================================
  // T3.9: Form validation prevents negative inputs or completion percentage >100%
  // =========================================================================
  it('T3.9: Form validation prevents negative inputs or completion percentage >100%', () => {
    render(<ManufacturingCostCalculator />);

    // Input negative beginning WIP
    fireEvent.change(screen.getByTestId('input-beginning-wip'), {
      target: { value: '-5000000' },
    });

    const validationAlert = screen.getByTestId('validation-error-alert');
    expect(validationAlert).toBeInTheDocument();
    expect(
      within(validationAlert).getByText(/Chi phí dở dang đầu kỳ không được âm/i)
    ).toBeInTheDocument();

    // Switch to EUP and enter completion percentage > 100
    fireEvent.click(screen.getByTestId('wip-method-EQUIVALENT_UNITS'));
    fireEvent.change(screen.getByTestId('input-completion-percentage'), {
      target: { value: '150' },
    });

    expect(
      within(validationAlert).getByText(/Tỷ lệ hoàn thành phải nằm trong khoảng từ 0% đến 100%/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // T3.10: Zero production ($Q_{tp} = 0$) handles division-by-zero gracefully (z = 0 or N/A)
  // =========================================================================
  it('T3.10: Zero production (Q_tp = 0) handles division-by-zero gracefully (z = 0 or N/A)', () => {
    render(<ManufacturingCostCalculator />);

    // Set finished units to 0
    fireEvent.change(screen.getByTestId('input-finished-units'), {
      target: { value: '0' },
    });

    // Verify component handles division-by-zero without crashing or NaN
    const unitCostZElement = screen.getByTestId('kpi-unit-cost-z');
    expect(unitCostZElement).toBeInTheDocument();
    expect(unitCostZElement.textContent).toMatch(/0|N\/A/i);
    expect(unitCostZElement.textContent).not.toContain('NaN');

    // Total cost Z is 0
    expect(screen.getByTestId('kpi-total-cost-z')).toHaveTextContent('0 đ');
  });
});
