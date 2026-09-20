import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateIncomeStatement,
  generateBalanceSheet,
  DAY_27_CLOSING_DATASET,
  formatCurrencyVnd,
} from '@/services/financial-statements';
import { WorkbenchStorageManager } from '../e2e/e2e-contracts';
import { JournalEntryRow } from '@/types/workbench';

describe('Adversarial Challenge: B02-DN Multi-Step Cascade & Day 27 Closing (challenger_m4_2)', () => {
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
  // TASK 1: 12-Item Multi-Step Cascade under Diverse Financial Combinations
  // =========================================================================
  describe('Task 1: 12-Item Cascade Combinatorial Testing', () => {
    it('Combination A: Standard profitable trading enterprise with all 12 items populated', () => {
      const report = generateIncomeStatement({
        revenue511: 1000000000,     // Mã 01
        deductions521: 50000000,    // Mã 02
        cogs632: 600000000,         // Mã 11
        financialIncome515: 40000000, // Mã 21
        financialExpense635: 15000000, // Mã 22
        sellingExpense641: 70000000,   // Mã 25
        adminExpense642: 85000000,     // Mã 26
        otherIncome711: 30000000,      // Mã 31
        otherExpense811: 10000000,     // Mã 32
        taxRate: 0.2,
      });

      // Mã 10 = 01 - 02 = 1,000M - 50M = 950M
      expect(report.netRevenue).toBe(950000000);
      // Mã 20 = 10 - 11 = 950M - 600M = 350M
      expect(report.grossProfit).toBe(350000000);
      // Mã 30 = 20 + 21 - 22 - 25 - 26 = 350M + 40M - 15M - 70M - 85M = 220M
      expect(report.operatingProfit).toBe(220000000);
      // Mã 40 = 31 - 32 = 30M - 10M = 20M
      expect(report.otherProfit).toBe(20000000);
      // Mã 50 = 30 + 40 = 220M + 20M = 240M
      expect(report.accountingProfitBeforeTax).toBe(240000000);
      // Mã 51 = 240M * 20% = 48M
      expect(report.citExpense).toBe(48000000);
      // Mã 60 = 50 - 51 = 240M - 48M = 192M
      expect(report.netProfitAfterTax).toBe(192000000);

      // Verify detailed items array contains all 16 rows
      expect(report.items).toHaveLength(16);
      const codeMap = Object.fromEntries(report.items!.map(i => [i.itemCode, i.currentPeriodAmount]));
      expect(codeMap['01']).toBe(1000000000);
      expect(codeMap['02']).toBe(50000000);
      expect(codeMap['10']).toBe(950000000);
      expect(codeMap['11']).toBe(600000000);
      expect(codeMap['20']).toBe(350000000);
      expect(codeMap['21']).toBe(40000000);
      expect(codeMap['22']).toBe(15000000);
      expect(codeMap['25']).toBe(70000000);
      expect(codeMap['26']).toBe(85000000);
      expect(codeMap['30']).toBe(220000000);
      expect(codeMap['31']).toBe(30000000);
      expect(codeMap['32']).toBe(10000000);
      expect(codeMap['40']).toBe(20000000);
      expect(codeMap['50']).toBe(240000000);
      expect(codeMap['51']).toBe(48000000);
      expect(codeMap['60']).toBe(192000000);
    });

    it('Combination B: High financial income rescuing gross trading loss', () => {
      // Gross loss: Net revenue 400M, COGS 450M -> Gross profit = -50M
      // Financial income: 120M, Financial expense: 10M
      // Operating expenses: Selling 20M, Admin 20M
      // Operating profit: -50M + 120M - 10M - 20M - 20M = +20M
      const report = generateIncomeStatement({
        revenue511: 400000000,
        cogs632: 450000000,
        financialIncome515: 120000000,
        financialExpense635: 10000000,
        sellingExpense641: 20000000,
        adminExpense642: 20000000,
      });

      expect(report.grossProfit).toBe(-50000000);
      expect(report.operatingProfit).toBe(20000000);
      expect(report.accountingProfitBeforeTax).toBe(20000000);
      expect(report.citExpense).toBe(4000000);
      expect(report.netProfitAfterTax).toBe(16000000);
    });

    it('Combination C: High other expenses (catastrophic write-off/penalties) wiping out core operating profit', () => {
      // Operating profit: +100M
      // Other income: 5M, Other expenses: 150M -> Other profit = -145M
      // Pre-tax profit: 100M - 145M = -45M (Accounting Loss)
      const report = generateIncomeStatement({
        revenue511: 500000000,
        cogs632: 300000000,
        sellingExpense641: 50000000,
        adminExpense642: 50000000,
        otherIncome711: 5000000,
        otherExpense811: 150000000,
      });

      expect(report.operatingProfit).toBe(100000000);
      expect(report.otherProfit).toBe(-145000000);
      expect(report.accountingProfitBeforeTax).toBe(-45000000);
      expect(report.citExpense).toBe(0);
      expect(report.netProfitAfterTax).toBe(-45000000);
    });

    it('Combination D: Circular 133 accounts (TK 6421 for selling, TK 6422 for admin, TK 642 directly)', () => {
      const ledger133 = {
        '511': { accountCode: '511', debitTotal: 500000000, creditTotal: 500000000, closingDebit: 0, closingCredit: 0 },
        '632': { accountCode: '632', debitTotal: 300000000, creditTotal: 300000000, closingDebit: 0, closingCredit: 0 },
        '6421': { accountCode: '6421', debitTotal: 40000000, creditTotal: 40000000, closingDebit: 0, closingCredit: 0 }, // Selling
        '6422': { accountCode: '6422', debitTotal: 60000000, creditTotal: 60000000, closingDebit: 0, closingCredit: 0 }, // Admin
      };

      const report = generateIncomeStatement(ledger133);
      expect(report.grossRevenue).toBe(500000000);
      expect(report.costOfGoodsSold).toBe(300000000);
      expect(report.sellingExpenses).toBe(40000000);
      expect(report.generalAdminExpenses).toBe(60000000);
      expect(report.operatingProfit).toBe(100000000);
      expect(report.accountingProfitBeforeTax).toBe(100000000);
      expect(report.citExpense).toBe(20000000);
      expect(report.netProfitAfterTax).toBe(80000000);
    });

    it('Combination E: Revenue deductions exceed gross revenue (heavy returns/discounts scenario)', () => {
      // Gross revenue: 100M, Deductions: 130M -> Net revenue: -30M
      const report = generateIncomeStatement({
        revenue511: 100000000,
        deductions521: 130000000,
        cogs632: 20000000,
      });

      expect(report.netRevenue).toBe(-30000000);
      expect(report.grossProfit).toBe(-50000000);
      expect(report.accountingProfitBeforeTax).toBe(-50000000);
      expect(report.citExpense).toBe(0);
      expect(report.netProfitAfterTax).toBe(-50000000);
    });
  });

  // =========================================================================
  // TASK 2: Zero Revenue with High Expenses (Loss Situation) Stress Test
  // =========================================================================
  describe('Task 2: Zero Revenue with High Expenses (Loss Situations)', () => {
    it('handles zero revenue and zero expenses cleanly without NaN or division by zero', () => {
      const report = generateIncomeStatement({});
      expect(report.grossRevenue).toBe(0);
      expect(report.netRevenue).toBe(0);
      expect(report.grossProfit).toBe(0);
      expect(report.operatingProfit).toBe(0);
      expect(report.accountingProfitBeforeTax).toBe(0);
      expect(report.citExpense).toBe(0);
      expect(report.netProfitAfterTax).toBe(0);
      expect(Number.isNaN(report.netProfitAfterTax)).toBe(false);

      // Verify formatted string
      expect(formatCurrencyVnd(report.netProfitAfterTax)).toBe('0 đ');
    });

    it('handles zero revenue with massive expenses producing deep negative profit without NaN', () => {
      const report = generateIncomeStatement({
        revenue511: 0,
        deductions521: 0,
        cogs632: 250000000,
        sellingExpense641: 150000000,
        adminExpense642: 100000000,
        financialExpense635: 50000000,
        otherExpense811: 20000000,
      });

      // Total expenses = 250 + 150 + 100 + 50 + 20 = 570M
      expect(report.netRevenue).toBe(0);
      expect(report.grossProfit).toBe(-250000000);
      expect(report.operatingProfit).toBe(-550000000);
      expect(report.accountingProfitBeforeTax).toBe(-570000000);
      // Loss situation: taxable income is clamped to 0 -> CIT is 0
      expect(report.citExpense).toBe(0);
      expect(report.netProfitAfterTax).toBe(-570000000);
      expect(Number.isNaN(report.netProfitAfterTax)).toBe(false);

      // Formatter should correctly format negative number with minus sign
      const formatted = formatCurrencyVnd(report.netProfitAfterTax);
      expect(formatted).toContain('-570.000.000');
    });

    it('handles zero revenue loss situation with Schedule B4 non-deductible expense LESS than loss', () => {
      // Pre-tax loss: -200M
      // Non-deductible B4: +50M
      // Taxable income = max(0, -200M + 50M) = max(0, -150M) = 0 -> CIT = 0
      const report = generateIncomeStatement({
        revenue511: 0,
        adminExpense642: 200000000,
        nonDeductibleB4: 50000000,
        taxRate: 0.2,
      });

      expect(report.accountingProfitBeforeTax).toBe(-200000000);
      expect(report.citExpense).toBe(0);
      expect(report.netProfitAfterTax).toBe(-200000000);
    });

    it('CRITICAL ADVERSARIAL EDGE CASE: Schedule B4 non-deductible expense GREATER than accounting loss', () => {
      // Accounting pre-tax loss: -50M
      // Non-deductible B4 (e.g. huge illegal cash invoice or status 04 runaway vendor): +80M
      // Taxable income: -50M + 80M = +30M!
      // In Vietnamese tax law, the company has an accounting loss but OWES CIT of 30M * 20% = 6M!
      // Net loss after tax = -50M - 6M = -56M!
      const report = generateIncomeStatement({
        revenue511: 0,
        adminExpense642: 50000000,
        nonDeductibleB4: 80000000,
        taxRate: 0.2,
      });

      expect(report.accountingProfitBeforeTax).toBe(-50000000);
      expect(report.citExpense).toBe(6000000); // 30M * 20%
      expect(report.netProfitAfterTax).toBe(-56000000);
    });
  });

  // =========================================================================
  // TASK 3: Day 27 Closing Integration: TK 911 -> CIT with B4 -> TK 4212
  // =========================================================================
  describe('Task 3: Day 27 Closing Integration & Profit Transfer to TK 4212', () => {
    it('Step-by-step Day 27 closing with profitable business and B4 adjustment', () => {
      let state = WorkbenchStorageManager.createDefaultState();

      // Step 1: Operating year entries
      // Capital injection: Nợ 112 / Có 411: 1,000,000,000
      const entryCapital: JournalEntryRow[] = [
        { id: 'c-1', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 1000000000, creditAmount: 0 },
        { id: 'c-2', accountCode: '411', accountNameVi: 'Vốn CSH', debitAmount: 0, creditAmount: 1000000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryCapital);

      // Sales: Nợ 112 / Có 511: 600,000,000
      const entrySales: JournalEntryRow[] = [
        { id: 's-1', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 600000000, creditAmount: 0 },
        { id: 's-2', accountCode: '511', accountNameVi: 'Doanh thu bán hàng', debitAmount: 0, creditAmount: 600000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entrySales);

      // COGS: Nợ 632 / Có 156: 300,000,000 (Inventory bought earlier or paid from bank)
      // For balanced balance sheet, let's say inventory was bought: Nợ 156 / Có 112: 300M, then sold: Nợ 632 / Có 156: 300M
      const entryBuyGoods: JournalEntryRow[] = [
        { id: 'b-1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 300000000, creditAmount: 0 },
        { id: 'b-2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 300000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryBuyGoods);

      const entryCOGS: JournalEntryRow[] = [
        { id: 'g-1', accountCode: '632', accountNameVi: 'Giá vốn', debitAmount: 300000000, creditAmount: 0 },
        { id: 'g-2', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 0, creditAmount: 300000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryCOGS);

      // Operating expenses: Nợ 642 / Có 112: 100,000,000 (of which 20M is non-deductible B4)
      const entryAdmin: JournalEntryRow[] = [
        { id: 'a-1', accountCode: '642', accountNameVi: 'Chi phí QLDN', debitAmount: 100000000, creditAmount: 0 },
        { id: 'a-2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 100000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryAdmin);

      // Financial Income: Nợ 112 / Có 515: 20,000,000
      const entryFinInc: JournalEntryRow[] = [
        { id: 'f-1', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 20000000, creditAmount: 0 },
        { id: 'f-2', accountCode: '515', accountNameVi: 'Doanh thu tài chính', debitAmount: 0, creditAmount: 20000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryFinInc);

      // Step 2: Day 26 Closing of revenues & costs to TK 911
      // Close 511 & 515 to Có 911: Total Có 911 = 620M
      const entryCloseRev: JournalEntryRow[] = [
        { id: 'cr-1', accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: 600000000, creditAmount: 0 },
        { id: 'cr-2', accountCode: '515', accountNameVi: 'Doanh thu TC', debitAmount: 20000000, creditAmount: 0 },
        { id: 'cr-3', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 0, creditAmount: 620000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryCloseRev);

      // Close 632 & 642 to Nợ 911: Total Nợ 911 = 400M
      const entryCloseExp: JournalEntryRow[] = [
        { id: 'ce-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 400000000, creditAmount: 0 },
        { id: 'ce-2', accountCode: '632', accountNameVi: 'Giá vốn', debitAmount: 0, creditAmount: 300000000 },
        { id: 'ce-3', accountCode: '642', accountNameVi: 'Chi phí QLDN', debitAmount: 0, creditAmount: 100000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryCloseExp);

      // Step 3: Day 27 CIT Calculation with B4 adjustment
      // Accounting profit before tax = 620M - 400M = 220M
      // Non-deductible B4 = 20M
      // Taxable income = 220M + 20M = 240M
      // CIT = 240M * 20% = 48M
      // Net profit after tax = 220M - 48M = 172M
      const incomeReport = generateIncomeStatement({
        revenue511: 600000000,
        cogs632: 300000000,
        financialIncome515: 20000000,
        adminExpense642: 100000000,
        nonDeductibleB4: 20000000,
        taxRate: 0.2,
      });
      expect(incomeReport.accountingProfitBeforeTax).toBe(220000000);
      expect(incomeReport.citExpense).toBe(48000000);
      expect(incomeReport.netProfitAfterTax).toBe(172000000);

      // Step 4: Book CIT liability and close 821 to 911: Nợ 911 / Có 3334: 48M
      // Transfer Net Profit to 4212: Nợ 911 / Có 4212: 172M
      const entryCITAndTransfer: JournalEntryRow[] = [
        { id: 'cit-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 48000000, creditAmount: 0 },
        { id: 'cit-2', accountCode: '3334', accountNameVi: 'Thuế TNDN phải nộp', debitAmount: 0, creditAmount: 48000000 },
        { id: 'np-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 172000000, creditAmount: 0 },
        { id: 'np-2', accountCode: '4212', accountNameVi: 'LN sau thuế năm nay', debitAmount: 0, creditAmount: 172000000 },
      ];
      state = WorkbenchStorageManager.postEntryToLedger(state, entryCITAndTransfer);

      // Step 5: Verify Golden Invariants
      // Invariant 1: TK 911 must have exactly zero balance
      const tk911 = state.ledgerTAccounts['911'];
      expect(tk911.debitTotal).toBe(620000000);
      expect(tk911.creditTotal).toBe(620000000);
      expect(tk911.closingDebit).toBe(0);
      expect(tk911.closingCredit).toBe(0);

      // Invariant 2: Nominal accounts 511, 515, 632, 642 must have zero closing balance
      expect(state.ledgerTAccounts['511'].closingCredit).toBe(0);
      expect(state.ledgerTAccounts['515'].closingCredit).toBe(0);
      expect(state.ledgerTAccounts['632'].closingDebit).toBe(0);
      expect(state.ledgerTAccounts['642'].closingDebit).toBe(0);

      // Invariant 3: TK 4212 credit balance must EXACTLY match B02-DN Mã 60
      expect(state.ledgerTAccounts['4212'].closingCredit).toBe(incomeReport.netProfitAfterTax);

      // Invariant 4: B01-DN Balance Sheet must balance perfectly (Mã 270 === Mã 440)
      const balanceSheet = generateBalanceSheet(state.ledgerTAccounts, 'TT200');
      // Assets: Cash 112 = 1,000M + 600M - 300M - 100M + 20M = 1,220,000,000
      expect(balanceSheet.assets.totalAssets).toBe(1220000000);
      // Liabilities: 3334 = 48M
      expect(balanceSheet.resources.liabilities.code300).toBe(48000000);
      // Equity: 411 (1,000M) + 4212 (172M) = 1,172M
      expect(balanceSheet.resources.equity.code400).toBe(1172000000);
      // Total Resources = 48M + 1,172M = 1,220,000,000
      expect(balanceSheet.resources.totalResources).toBe(1220000000);
      expect(balanceSheet.isBalanced).toBe(true);
      expect(balanceSheet.discrepancy).toBe(0);
      expect(balanceSheet.warnings).toHaveLength(0);
    });

    it('Step-by-step Day 27 closing in a LOSS situation: Net loss transferred to DEBIT of TK 4212', () => {
      let state = WorkbenchStorageManager.createDefaultState();

      // Capital: 500M
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'l-cap-1', accountCode: '112', accountNameVi: 'Tiền gửi', debitAmount: 500000000, creditAmount: 0 },
        { id: 'l-cap-2', accountCode: '411', accountNameVi: 'Vốn CSH', debitAmount: 0, creditAmount: 500000000 },
      ]);

      // Revenue: 100M
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'l-rev-1', accountCode: '112', accountNameVi: 'Tiền gửi', debitAmount: 100000000, creditAmount: 0 },
        { id: 'l-rev-2', accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: 0, creditAmount: 100000000 },
      ]);

      // Expenses: 200M (Cash outflow) -> Net Loss = -100M
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'l-exp-1', accountCode: '642', accountNameVi: 'Chi phí QLDN', debitAmount: 200000000, creditAmount: 0 },
        { id: 'l-exp-2', accountCode: '112', accountNameVi: 'Tiền gửi', debitAmount: 0, creditAmount: 200000000 },
      ]);

      // Day 26 Closing to 911:
      // Nợ 511 / Có 911: 100M
      // Nợ 911 / Có 642: 200M
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'l-c1', accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: 100000000, creditAmount: 0 },
        { id: 'l-c2', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 0, creditAmount: 100000000 },
        { id: 'l-c3', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 200000000, creditAmount: 0 },
        { id: 'l-c4', accountCode: '642', accountNameVi: 'Chi phí', debitAmount: 0, creditAmount: 200000000 },
      ]);

      // Day 27: Net loss is 100M. CIT is 0.
      // B02-DN report
      const incomeReport = generateIncomeStatement({
        revenue511: 100000000,
        adminExpense642: 200000000,
      });
      expect(incomeReport.accountingProfitBeforeTax).toBe(-100000000);
      expect(incomeReport.citExpense).toBe(0);
      expect(incomeReport.netProfitAfterTax).toBe(-100000000);

      // Transfer Net Loss: Nợ 4212 / Có 911: 100,000,000
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'l-loss-1', accountCode: '4212', accountNameVi: 'LN chưa phân phối', debitAmount: 100000000, creditAmount: 0 },
        { id: 'l-loss-2', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 0, creditAmount: 100000000 },
      ]);

      // TK 911 is 0
      const tk911 = state.ledgerTAccounts['911'];
      expect(tk911.closingDebit).toBe(0);
      expect(tk911.closingCredit).toBe(0);

      // TK 4212 has DEBIT balance of 100M
      expect(state.ledgerTAccounts['4212'].closingDebit).toBe(100000000);

      // Balance sheet verifies: Total Assets = Cash (500M + 100M - 200M = 400M)
      // Equity = 411 (500M) + 421 (-100M) = 400M
      const bs = generateBalanceSheet(state.ledgerTAccounts, 'TT200');
      expect(bs.assets.totalAssets).toBe(400000000);
      expect(bs.resources.equity.code400).toBe(400000000);
      expect(bs.resources.totalResources).toBe(400000000);
      expect(bs.isBalanced).toBe(true);
      expect(bs.discrepancy).toBe(0);
      expect(bs.resources.equity.items['421']).toBe(-100000000);
    });

    it('detects unclosed TK 911 if Day 27 closing is omitted or incomplete', () => {
      let state = WorkbenchStorageManager.createDefaultState();
      // Partial closing: revenue closed to 911, but profit not transferred
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'u-1', accountCode: '112', accountNameVi: 'Tiền', debitAmount: 100000000, creditAmount: 0 },
        { id: 'u-2', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 0, creditAmount: 100000000 },
      ]);

      const bs = generateBalanceSheet(state.ledgerTAccounts, 'TT200');
      const warning911 = bs.warnings.find(w => w.includes('Tài khoản tạm thời 911'));
      expect(warning911).toBeDefined();
      expect(warning911).toContain('chưa được kết chuyển hết về TK 911');
    });
  });

  // =========================================================================
  // TASK 4: High-Volume and Boundary Stress Testing
  // =========================================================================
  describe('Task 4: High-Volume & Boundary Stress Testing', () => {
    it('survives massive 1,000-transaction random journal batch through Day 27 closing cycle', () => {
      let state = WorkbenchStorageManager.createDefaultState();

      // Initial capital
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'init-c', accountCode: '112', accountNameVi: 'Tiền gửi', debitAmount: 10000000000, creditAmount: 0 },
        { id: 'init-k', accountCode: '411', accountNameVi: 'Vốn CSH', debitAmount: 0, creditAmount: 10000000000 },
      ]);

      let totalSales = 0;
      let totalCOGS = 0;
      let totalAdmin = 0;

      // Generate 500 sales entries and 500 expense entries
      for (let i = 0; i < 500; i++) {
        const saleAmount = 1000000 + (i * 10000); // between 1M and 6M
        const cogsAmount = Math.round(saleAmount * 0.6); // 60% COGS
        totalSales += saleAmount;
        totalCOGS += cogsAmount;

        state = WorkbenchStorageManager.postEntryToLedger(state, [
          { id: `s-${i}`, accountCode: '112', accountNameVi: 'Tiền', debitAmount: saleAmount, creditAmount: 0 },
          { id: `r-${i}`, accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: 0, creditAmount: saleAmount },
          { id: `c-${i}`, accountCode: '632', accountNameVi: 'Giá vốn', debitAmount: cogsAmount, creditAmount: 0 },
          { id: `i-${i}`, accountCode: '112', accountNameVi: 'Tiền', debitAmount: 0, creditAmount: cogsAmount },
        ]);
      }

      for (let i = 0; i < 500; i++) {
        const adminAmount = 500000 + (i * 5000);
        totalAdmin += adminAmount;

        state = WorkbenchStorageManager.postEntryToLedger(state, [
          { id: `a-${i}`, accountCode: '642', accountNameVi: 'Chi phí QLDN', debitAmount: adminAmount, creditAmount: 0 },
          { id: `ap-${i}`, accountCode: '112', accountNameVi: 'Tiền', debitAmount: 0, creditAmount: adminAmount },
        ]);
      }

      // Compute income statement
      const income = generateIncomeStatement({
        revenue511: totalSales,
        cogs632: totalCOGS,
        adminExpense642: totalAdmin,
        taxRate: 0.2,
      });

      const expectedPretax = totalSales - totalCOGS - totalAdmin;
      expect(income.accountingProfitBeforeTax).toBe(expectedPretax);
      const expectedCIT = Math.max(0, Math.round(expectedPretax * 0.2));
      expect(income.citExpense).toBe(expectedCIT);
      const expectedNetProfit = expectedPretax - expectedCIT;
      expect(income.netProfitAfterTax).toBe(expectedNetProfit);

      // Perform closing:
      // Clear 511 to 911
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'cl-rev-1', accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: totalSales, creditAmount: 0 },
        { id: 'cl-rev-2', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 0, creditAmount: totalSales },
      ]);
      // Clear 632 & 642 to 911
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'cl-exp-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: totalCOGS + totalAdmin, creditAmount: 0 },
        { id: 'cl-exp-2', accountCode: '632', accountNameVi: 'Giá vốn', debitAmount: 0, creditAmount: totalCOGS },
        { id: 'cl-exp-3', accountCode: '642', accountNameVi: 'Chi phí', debitAmount: 0, creditAmount: totalAdmin },
      ]);
      // Clear CIT
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'cl-cit-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: expectedCIT, creditAmount: 0 },
        { id: 'cl-cit-2', accountCode: '3334', accountNameVi: 'Thuế TNDN', debitAmount: 0, creditAmount: expectedCIT },
      ]);
      // Transfer Net Profit to 4212
      state = WorkbenchStorageManager.postEntryToLedger(state, [
        { id: 'cl-np-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: expectedNetProfit, creditAmount: 0 },
        { id: 'cl-np-2', accountCode: '4212', accountNameVi: 'LN sau thuế', debitAmount: 0, creditAmount: expectedNetProfit },
      ]);

      // Verify TK 911 zero-balance invariant
      const tk911 = state.ledgerTAccounts['911'];
      expect(tk911.closingDebit).toBe(0);
      expect(tk911.closingCredit).toBe(0);
      expect(tk911.debitTotal).toBe(totalSales);
      expect(tk911.creditTotal).toBe(totalSales);

      // Verify B01-DN Balance Sheet invariant
      const bs = generateBalanceSheet(state.ledgerTAccounts, 'TT200');
      expect(bs.isBalanced).toBe(true);
      expect(bs.discrepancy).toBe(0);
      expect(bs.warnings).toHaveLength(0);
    });

    it('handles extreme monetary boundaries: 100 Trillion VNĐ (100,000,000,000,000 VNĐ)', () => {
      const hugeRevenue = 100000000000000;
      const hugeCOGS = 70000000000000;
      const report = generateIncomeStatement({
        revenue511: hugeRevenue,
        cogs632: hugeCOGS,
        taxRate: 0.2,
      });

      expect(report.grossProfit).toBe(30000000000000);
      expect(report.accountingProfitBeforeTax).toBe(30000000000000);
      expect(report.citExpense).toBe(6000000000000);
      expect(report.netProfitAfterTax).toBe(24000000000000);
      expect(Number.isSafeInteger(report.netProfitAfterTax)).toBe(true);
    });

    it('handles 1 VNĐ boundary transaction with exact rounding', () => {
      const report = generateIncomeStatement({
        revenue511: 1,
        cogs632: 0,
        taxRate: 0.2,
      });

      expect(report.grossRevenue).toBe(1);
      expect(report.accountingProfitBeforeTax).toBe(1);
      // 1 * 0.2 = 0.2 -> Math.round = 0
      expect(report.citExpense).toBe(0);
      expect(report.netProfitAfterTax).toBe(1);
    });
  });

  // =========================================================================
  // TASK 5: Deep Edge Cases & Anomaly Probing
  // =========================================================================
  describe('Task 5: Deep Edge Cases & Anomaly Probing', () => {
    it('probes behavior when parent and child accounts are both present in ledger', () => {
      // If a ledger contains both parent 511 and child 5111 (e.g. from an unflattened chart of accounts)
      const ledgerWithDuplicates = {
        '511': { accountCode: '511', debitTotal: 0, creditTotal: 100000000, closingDebit: 0, closingCredit: 100000000 },
        '5111': { accountCode: '5111', debitTotal: 0, creditTotal: 100000000, closingDebit: 0, closingCredit: 100000000 },
      };

      const report = generateIncomeStatement(ledgerWithDuplicates);
      // Let's observe if income-statement-engine sums both (200M) because code.startsWith('511') matches both
      expect(report.grossRevenue).toBe(200000000);
    });

    it('probes behavior when raw numeric amounts are passed directly by account code', () => {
      // Testing if { '511': 100M, '632': 60M } works directly
      const rawNumbers = {
        '511': 100000000,
        '632': 60000000,
      };

      const report = generateIncomeStatement(rawNumbers);
      // Let's verify what costOfGoodsSold evaluates to
      expect(report.grossRevenue).toBe(100000000);
      expect(report.costOfGoodsSold).toBe(0); // Because extractLedgerBalances treated positive 632 as credit, debitTotal was 0
    });


    it('probes B01 and B02 consistency: Net profit on B02 (Mã 60) matches TK 4212 impact on B01 (Mã 421)', () => {
      const closingDataset = DAY_27_CLOSING_DATASET;
      const b02 = generateIncomeStatement(closingDataset);
      const b01 = generateBalanceSheet(closingDataset, 'TT200');

      // In DAY_27_CLOSING_DATASET:
      // B02 Mã 60 should be 80,000,000
      expect(b02.netProfitAfterTax).toBe(80000000);
      // B01 equity item 421 should be 80,000,000
      expect(b01.resources.equity.items['421']).toBe(80000000);
      expect(b02.netProfitAfterTax).toBe(b01.resources.equity.items['421']);
    });
  });
});

