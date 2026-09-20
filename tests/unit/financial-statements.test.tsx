import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  DAY_27_CLOSING_DATASET,
} from '@/services/financial-statements';
import { FinancialStatementsView } from '@/components/workbench/FinancialStatementsView';
import { Journalizer } from '@/components/workbench/Journalizer';
import { App } from '@/App';

describe('R4: Dynamic Financial Statements (B01-DN & B02-DN)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  // =========================================================================
  // 1. Balance Sheet Engine (B01-DN)
  // =========================================================================
  describe('Balance Sheet Engine (balance-sheet-engine.ts)', () => {
    it('aggregates short-term assets (Code 100) and long-term assets (Code 200) into Total Assets (Mã 270)', () => {
      const balances = {
        '111': { accountCode: '111', closingDebit: 50000000, closingCredit: 0, debitTotal: 50000000, creditTotal: 0 },
        '112': { accountCode: '112', closingDebit: 150000000, closingCredit: 0, debitTotal: 150000000, creditTotal: 0 },
        '131': { accountCode: '131', closingDebit: 100000000, closingCredit: 0, debitTotal: 100000000, creditTotal: 0 },
        '156': { accountCode: '156', closingDebit: 200000000, closingCredit: 0, debitTotal: 200000000, creditTotal: 0 },
        '1331': { accountCode: '1331', closingDebit: 20000000, closingCredit: 0, debitTotal: 20000000, creditTotal: 0 },
        '211': { accountCode: '211', closingDebit: 500000000, closingCredit: 0, debitTotal: 500000000, creditTotal: 0 },
        '214': { accountCode: '214', closingDebit: 0, closingCredit: 50000000, debitTotal: 0, creditTotal: 50000000 },
        '241': { accountCode: '241', closingDebit: 30000000, closingCredit: 0, debitTotal: 30000000, creditTotal: 0 },
        '331': { accountCode: '331', closingDebit: 0, closingCredit: 200000000, debitTotal: 0, creditTotal: 200000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 800000000, debitTotal: 0, creditTotal: 800000000 },
      };

      const report = generateBalanceSheet(balances, 'TT200');

      // Short term: 50M (111) + 150M (112) + 100M (131) + 200M (156) + 20M (1331) = 520M
      expect(report.assets.shortTerm.code100).toBe(520000000);
      expect(report.assets.shortTerm.items['110']).toBe(200000000);
      expect(report.assets.shortTerm.items['130']).toBe(100000000);
      expect(report.assets.shortTerm.items['140']).toBe(200000000);
      expect(report.assets.shortTerm.items['150']).toBe(20000000);

      // Long term: 500M (211) - 50M (214) + 30M (241) = 480M
      expect(report.assets.longTerm.code200).toBe(480000000);
      expect(report.assets.longTerm.items['221']).toBe(500000000);
      expect(report.assets.longTerm.items['222']).toBe(-50000000);
      expect(report.assets.longTerm.items['240']).toBe(30000000);

      // Total Assets: 520M + 480M = 1,000,000,000 (Mã 270)
      expect(report.assets.totalAssets).toBe(1000000000);
      expect(report.resources.totalResources).toBe(1000000000);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
    });

    it('enforces the fundamental mathematical invariant Mã 270 === Mã 300 + Mã 400', () => {
      const balances = {
        '112': { accountCode: '112', closingDebit: 600000000, closingCredit: 0, debitTotal: 600000000, creditTotal: 0 },
        '331': { accountCode: '331', closingDebit: 0, closingCredit: 250000000, debitTotal: 0, creditTotal: 250000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 350000000, debitTotal: 0, creditTotal: 350000000 },
      };

      const report = generateBalanceSheet(balances, 'TT200');
      expect(report.assets.totalAssets).toBe(600000000);
      expect(report.resources.liabilities.code300).toBe(250000000);
      expect(report.resources.equity.code400).toBe(350000000);
      expect(report.resources.totalResources).toBe(600000000);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
      expect(report.warnings.length).toBe(0);
    });

    it('detects balance mismatch (discrepancy > 0), sets isBalanced = false, and triggers explicit warning', () => {
      const unbalanced = {
        '112': { accountCode: '112', closingDebit: 500000000, closingCredit: 0, debitTotal: 500000000, creditTotal: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 470000000, debitTotal: 0, creditTotal: 470000000 },
      };

      const report = generateBalanceSheet(unbalanced, 'TT200');
      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(30000000);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('CẢNH BÁO MẤT CÂN ĐỐI');
      expect(report.warnings[0]).toContain('30.000.000');
    });

    it('correctly treats contra-asset TK 214 as negative deduction on Long-Term Assets', () => {
      const balances = {
        '211': { accountCode: '211', closingDebit: 800000000, closingCredit: 0, debitTotal: 800000000, creditTotal: 0 },
        '214': { accountCode: '214', closingDebit: 0, closingCredit: 160000000, debitTotal: 0, creditTotal: 160000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 640000000, debitTotal: 0, creditTotal: 640000000 },
      };

      const report = generateBalanceSheet(balances, 'TT200');
      expect(report.assets.longTerm.items['221']).toBe(800000000); // Cost
      expect(report.assets.longTerm.items['222']).toBe(-160000000); // Negative depreciation (222)
      expect(report.assets.longTerm.items['223']).toBe(-160000000); // Negative depreciation (223)
      expect(report.assets.longTerm.code200).toBe(640000000);
      expect(report.assets.totalAssets).toBe(640000000);
      expect(report.resources.totalResources).toBe(640000000);
      expect(report.isBalanced).toBe(true);
    });

    it('warns if temporary accounts (Classes 5-9) still have non-zero ending balances', () => {
      const balancesWithUnclearedExpenses = {
        '112': { accountCode: '112', closingDebit: 100000000, closingCredit: 0, debitTotal: 100000000, creditTotal: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 100000000, debitTotal: 0, creditTotal: 100000000 },
        '642': { accountCode: '642', closingDebit: 15000000, closingCredit: 0, debitTotal: 15000000, creditTotal: 0 },
      };

      const report = generateBalanceSheet(balancesWithUnclearedExpenses, 'TT200');
      const closingWarning = report.warnings.find((w) => w.includes('Tài khoản tạm thời 642'));
      expect(closingWarning).toBeDefined();
      expect(closingWarning).toContain('chưa được kết chuyển hết về TK 911');
    });

    it('fully balances the Capstone Day 27 closing dataset at 1,540,000,000 VNĐ', () => {
      const report = generateBalanceSheet(DAY_27_CLOSING_DATASET, 'TT200');
      expect(report.assets.totalAssets).toBe(1540000000);
      expect(report.resources.liabilities.code300).toBe(460000000);
      expect(report.resources.equity.code400).toBe(1080000000);
      expect(report.resources.totalResources).toBe(1540000000);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
      expect(report.warnings.length).toBe(0);
    });

    it('supports Circular 133 accounting regime', () => {
      const balances133 = {
        '112': { accountCode: '112', closingDebit: 300000000, closingCredit: 0, debitTotal: 300000000, creditTotal: 0 },
        '156': { accountCode: '156', closingDebit: 200000000, closingCredit: 0, debitTotal: 200000000, creditTotal: 0 },
        '331': { accountCode: '331', closingDebit: 0, closingCredit: 150000000, debitTotal: 0, creditTotal: 150000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 350000000, debitTotal: 0, creditTotal: 350000000 },
      };

      const report = generateBalanceSheet(balances133, 'TT133');
      expect(report.circular).toBe('TT133');
      expect(report.assets.totalAssets).toBe(500000000);
      expect(report.resources.totalResources).toBe(500000000);
      expect(report.isBalanced).toBe(true);
    });
  });

  // =========================================================================
  // 2. Income Statement Engine (B02-DN)
  // =========================================================================
  describe('Income Statement Engine (income-statement-engine.ts)', () => {
    it('computes 12-item multi-step cascade from Gross Revenue to Net Profit After Tax', () => {
      const report = generateIncomeStatement({
        revenue511: 500000000,
        deductions521: 20000000,
        cogs632: 280000000,
        financialIncome515: 15000000,
        financialExpense635: 5000000,
        sellingExpense641: 30000000,
        adminExpense642: 40000000,
        otherIncome711: 10000000,
        otherExpense811: 2000000,
      });

      // Mã 01: Gross Revenue
      expect(report.grossRevenue).toBe(500000000);
      // Mã 02: Deductions
      expect(report.revenueDeductions).toBe(20000000);
      // Mã 10 = 01 - 02: Net Revenue
      expect(report.netRevenue).toBe(480000000);
      // Mã 11: COGS
      expect(report.costOfGoodsSold).toBe(280000000);
      // Mã 20 = 10 - 11: Gross Profit
      expect(report.grossProfit).toBe(200000000);
      // Mã 21: Financial Income
      expect(report.financialIncome).toBe(15000000);
      // Mã 22: Financial Expenses
      expect(report.financialExpenses).toBe(5000000);
      // Mã 25: Selling Expenses
      expect(report.sellingExpenses).toBe(30000000);
      // Mã 26: Admin Expenses
      expect(report.generalAdminExpenses).toBe(40000000);
      // Mã 30 = 20 + 21 - 22 - 25 - 26: Operating Profit = 200M + 15M - 5M - 30M - 40M = 140M
      expect(report.operatingProfit).toBe(140000000);
      // Mã 31: Other Income
      expect(report.otherIncome).toBe(10000000);
      // Mã 32: Other Expenses
      expect(report.otherExpenses).toBe(2000000);
      // Mã 40 = 31 - 32: Other Profit
      expect(report.otherProfit).toBe(8000000);
      // Mã 50 = 30 + 40: Pretax Profit = 140M + 8M = 148M
      expect(report.accountingProfitBeforeTax).toBe(148000000);
      // Mã 51: Current CIT Expense = 148M * 20% = 29.6M
      expect(report.citExpense).toBe(29600000);
      // Mã 60 = 50 - 51: Net Profit After Tax = 148M - 29.6M = 118.4M
      expect(report.netProfitAfterTax).toBe(118400000);
    });

    it('adjusts CIT calculation when Schedule B4 non-deductible expenses are present', () => {
      const report = generateIncomeStatement({
        revenue511: 200000000,
        cogs632: 100000000,
        adminExpense642: 20000000,
        nonDeductibleB4: 20000000, // E.g. >=20M cash invoice or status 04 runaway invoice
        taxRate: 0.2,
      });

      // Pretax profit: 200M - 100M - 20M = 80M
      expect(report.accountingProfitBeforeTax).toBe(80000000);
      // Taxable income = 80M + 20M (B4) = 100M -> CIT = 100M * 20% = 20M
      expect(report.citExpense).toBe(20000000);
      // Net profit after tax = 80M - 20M = 60M
      expect(report.netProfitAfterTax).toBe(60000000);
    });

    it('extracts income statement numbers directly from ledger account records', () => {
      const report = generateIncomeStatement(DAY_27_CLOSING_DATASET);
      expect(report.grossRevenue).toBe(350000000); // 511
      expect(report.costOfGoodsSold).toBe(200000000); // 632
      expect(report.generalAdminExpenses).toBe(50000000); // 642
      expect(report.grossProfit).toBe(150000000);
      expect(report.operatingProfit).toBe(100000000);
      expect(report.accountingProfitBeforeTax).toBe(100000000);
      expect(report.citExpense).toBe(20000000); // 8211
      expect(report.netProfitAfterTax).toBe(80000000); // Mã 60 matches TK 4212 exactly
    });
  });

  // =========================================================================
  // 3. UI Component: FinancialStatementsView
  // =========================================================================
  describe('FinancialStatementsView UI', () => {
    it('renders prominent green invariant banner when balance sheet is balanced', () => {
      render(<FinancialStatementsView initialLedger={DAY_27_CLOSING_DATASET} />);

      // Verify banner test id
      const banner = screen.getByTestId('invariant-banner');
      expect(banner).toBeDefined();

      // Check verbatim banner text
      expect(
        screen.getByText(/Cân đối kế toán Tuyệt đối: Tổng Tài Sản \(Mã 270\) = Nguồn Vốn \(Mã 440\)/i)
      ).toBeDefined();

      // Check displayed numbers
      expect(screen.getAllByText(/1\.540\.000\.000 đ/i).length).toBeGreaterThan(0);
    });

    it('renders prominent red warning banner when balance sheet is unbalanced', () => {
      const unbalancedLedger = {
        '112': { accountCode: '112', closingDebit: 500000000, closingCredit: 0, debitTotal: 500000000, creditTotal: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 450000000, debitTotal: 0, creditTotal: 450000000 },
      };

      render(<FinancialStatementsView initialLedger={unbalancedLedger} />);

      const banner = screen.getByTestId('invariant-banner');
      expect(banner.className).toContain('bg-rose-50');

      // Check warning verbatim text
      expect(
        screen.getByText(/CẢNH BÁO: Bảng Cân đối kế toán bị LỆCH 50\.000\.000 đ!/i)
      ).toBeDefined();
    });

    it('switches view between B01-DN (Balance Sheet) and B02-DN (Income Statement)', () => {
      render(<FinancialStatementsView initialLedger={DAY_27_CLOSING_DATASET} />);

      // Default view is B01-DN
      expect(screen.getByText('BẢNG CÂN ĐỐI KẾ TOÁN')).toBeDefined();
      expect(screen.getByText('I. Tiền và các khoản tương đương tiền')).toBeDefined();

      // Switch to B02-DN
      const b02Tab = screen.getByText('B02-DN: Báo Cáo Kết Quả Kinh Doanh');
      fireEvent.click(b02Tab);

      expect(screen.getByText('BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH')).toBeDefined();
      expect(screen.getByText('1. Doanh thu bán hàng và cung cấp dịch vụ')).toBeDefined();
      expect(screen.getByText('16. Lợi nhuận sau thuế TNDN (Mã 60 = 50 - 51)')).toBeDefined();
    });

    it('toggles regime between Circular 200 and Circular 133', () => {
      const onRegimeChangeMock = vi.fn();
      render(
        <FinancialStatementsView
          currentRegime="CIRCULAR_200"
          onRegimeChange={onRegimeChangeMock}
          initialLedger={DAY_27_CLOSING_DATASET}
        />
      );

      const tt133Btn = screen.getByRole('button', { name: /Thông tư 133/i });
      fireEvent.click(tt133Btn);

      expect(onRegimeChangeMock).toHaveBeenCalledWith('CIRCULAR_133');
    });

    it('loads standard Day 27 closing data on button click', () => {
      const emptyLedger = {};
      render(<FinancialStatementsView initialLedger={emptyLedger} />);

      const loadBtn = screen.getByRole('button', { name: /Nạp số liệu chuẩn Ngày 27/i });
      fireEvent.click(loadBtn);

      expect(screen.getByText(/Đã nạp thành công bộ số liệu chuẩn Ngày 27/i)).toBeDefined();
      expect(
        screen.getByText(/Cân đối kế toán Tuyệt đối: Tổng Tài Sản \(Mã 270\) = Nguồn Vốn \(Mã 440\)/i)
      ).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Integration: Journalizer and App Navigation
  // =========================================================================
  describe('Journalizer & App Navigation Integration', () => {
    it('renders "Xem Báo Cáo Tài Chính" button in Journalizer and triggers callback', () => {
      const navMock = vi.fn();
      render(
        <Journalizer
          currentRegime="CIRCULAR_200"
          onNavigateToFinancialStatements={navMock}
        />
      );

      const bctcBtn = screen.getByRole('button', { name: /Xem Báo Cáo Tài Chính/i });
      expect(bctcBtn).toBeDefined();

      fireEvent.click(bctcBtn);
      expect(navMock).toHaveBeenCalledTimes(1);
    });

    it('renders financial statements navigation tab in App and displays FinancialStatementsView', async () => {
      render(<App />);

      const fsTab = screen.getByTestId('tab-financial-statements');
      expect(fsTab).toBeDefined();
      expect(fsTab.textContent).toContain('Báo Cáo Tài Chính (B01 & B02)');

      fireEvent.click(fsTab);

      // Verify FinancialStatementsView is rendered
      await waitFor(() => {
        expect(
          screen.getByText(/Phòng Thực Hành Lập Bộ Báo Cáo Tài Chính Động \(B01-DN & B02-DN\)/i)
        ).toBeDefined();
        expect(screen.getByTestId('invariant-banner')).toBeDefined();
      });
    });
  });
});
