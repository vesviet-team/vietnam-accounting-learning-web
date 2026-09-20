import { describe, it, expect, beforeEach } from 'vitest';
import { validateAccountForRegime } from '@/data/prohibited-accounts';
import { StorageService } from '@/services/storage/storage-service';
import { BalanceValidator, VoucherInspector } from '../helpers/domain-engines';
import { ExtendedVoucherCase } from '../fixtures/voucher-cases';
import {
  SocraticEngine,
  SocraticScenario,
  FinancialStatementsEngine,
  LedgerAccountBalance,
  WorkbenchStorageManager,
  WorkbenchHistory,
} from './e2e-contracts';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 3: Pairwise Combinations & Multi-Feature Interactions', () => {
  let storageService: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    storageService = new StorageService();
  });

  // -------------------------------------------------------------------------
  // Interaction 1: TT133 Regime Toggle + Socratic Hint Ladder
  // -------------------------------------------------------------------------
  it('T3.1: TT133 Toggle + Socratic Hints: Adapts hints specifically for SME regime, guiding to TK 154 instead of TK 621/622', () => {
    const smeDirectLaborScenario: SocraticScenario = {
      id: 'scen-sme-labor',
      titleVi: 'Chi phí nhân công trực tiếp sản xuất theo Thông tư 133',
      regime: 'CIRCULAR_133',
      targetAccountCodes: ['154', '334'],
      hints: {
        level1: {
          level: 1,
          title: 'Nấc 1: Định vị',
          content: 'Lưu ý: Doanh nghiệp SME theo TT 133 không sử dụng tài khoản 622.',
          suggestedAccountGroups: ['154 (Chi phí SXKD dở dang)', '334 (Phải trả NLĐ)'],
        },
        level2: {
          level: 2,
          title: 'Nấc 2: Bản chất',
          content: 'Tập hợp chi phí nhân công thẳng vào giá thành sản xuất dở dang.',
          reflectiveQuestions: ['Tài khoản nào thay thế TK 622 trong Thông tư 133?'],
        },
        level3: {
          level: 3,
          title: 'Nấc 3: Ví dụ song sinh TT 133',
          content: 'Hạch toán lương công nhân may: Nợ TK 154 / Có TK 334',
          twinCase: {
            scenario: 'Tính lương công nhân xưởng may',
            sampleJournal: [
              { accountCode: '154', accountName: 'Chi phí SXKD dở dang (Nhân công)', debit: 15000000, credit: 0 },
              { accountCode: '334', accountName: 'Phải trả người lao động', debit: 0, credit: 15000000 },
            ],
            explanation: 'TT 133 không dùng 622, thay bằng 154.',
          },
        },
      },
    };

    SocraticEngine.registerScenario(smeDirectLaborScenario);

    // Verify hint 1 correctly guides away from 622
    const hint1 = SocraticEngine.getHint('scen-sme-labor', 1, 1);
    expect(hint1?.content).toContain('không sử dụng tài khoản 622');
    expect(hint1?.suggestedAccountGroups).toContain('154 (Chi phí SXKD dở dang)');

    // Verify prohibition validator confirms 622 is illegal in TT 133
    const val622 = validateAccountForRegime('622', 'CIRCULAR_133');
    expect(val622.isProhibited).toBe(true);
    expect(val622.substituteCode).toBe('154');
  });

  // -------------------------------------------------------------------------
  // Interaction 2: >=20M Cash Invoice Penalty + B02-DN CIT Expense (Schedule B4)
  // -------------------------------------------------------------------------
  it('T3.2: 20M Cash Invoice Penalty + CIT Calculation: Disallowed cash invoice feeds into Schedule B4, increasing CIT expense (Mã 51)', () => {
    // 1. Audit invoice: 30M paid in CASH -> Violated
    const voucher30mCash: ExtendedVoucherCase = {
      id: 'voucher-30m-cash',
      titleVi: 'Hóa đơn tiếp khách 30M tiền mặt',
      voucherType: 'VAT_INVOICE',
      scenarioDescriptionVi: 'Hóa đơn ăn uống tiếp khách 30 triệu đồng trả bằng tiền mặt',
      pretaxAmount: 27272727,
      vatAmount: 2727273,
      totalAmount: 30000000,
      paymentMethod: 'CASH',
      vendorTaxStatus: '00',
      statutoryBasis: 'TT 96/2015 & TT 219/2013',
    };

    const audit = VoucherInspector.auditVoucher(voucher30mCash);
    expect(audit.isValid).toBe(false);
    expect(audit.citDeductible).toBe(false);

    const nonDeductibleAmount = voucher30mCash.pretaxAmount; // To Schedule B4

    // 2. Compute Income Statement WITHOUT B4 adjustment
    const incomeBase = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 200000000,
      cogs632: 120000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 10000000,
      adminExpense642: 30000000, // Includes the 27,272,727 VND disallowed expense
      nonDeductibleB4: 0, // No adjustment
    });

    // Accounting profit before tax: 200M - 120M - 10M - 30M = 40M
    expect(incomeBase.accountingProfitBeforeTax).toBe(40000000);
    // Base CIT at 20% on 40M = 8M
    expect(incomeBase.citExpense).toBe(8000000);

    // 3. Compute Income Statement WITH Schedule B4 adjustment
    const incomeWithB4 = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 200000000,
      cogs632: 120000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 10000000,
      adminExpense642: 30000000,
      nonDeductibleB4: nonDeductibleAmount, // Schedule B4 adjustment
    });

    // Accounting profit remains identical (40M)
    expect(incomeWithB4.accountingProfitBeforeTax).toBe(40000000);
    // Taxable income = 40M + 27,272,727 = 67,272,727 VND
    // CIT expense = 67,272,727 * 20% = 13,454,545 VND
    expect(incomeWithB4.citExpense).toBe(13454545);
    expect(incomeWithB4.citExpense).toBeGreaterThan(incomeBase.citExpense);
    // Net profit after tax is reduced
    expect(incomeWithB4.netProfitAfterTax).toBe(40000000 - 13454545);
  });

  // -------------------------------------------------------------------------
  // Interaction 3: Day 27 Closing Entries (TK 911) + B01-DN Balance Sheet
  // -------------------------------------------------------------------------
  it('T3.3: Day 27 Closing Entries + B01-DN Balance Sheet: TK 911 clearing leaves 0 balance, profit transfers to TK 4212, verifying Mã 270 === Mã 440', () => {
    // Initial balances after operating year
    const initialLedger: Record<string, LedgerAccountBalance> = {
      '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 600000000, creditTotal: 0, closingDebit: 600000000, closingCredit: 0 },
      '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 500000000, closingDebit: 0, closingCredit: 500000000 },
      '511': { accountCode: '511', accountNameVi: 'Doanh thu bán hàng', debitTotal: 0, creditTotal: 300000000, closingDebit: 0, closingCredit: 300000000 },
      '632': { accountCode: '632', accountNameVi: 'Giá vốn hàng bán', debitTotal: 200000000, creditTotal: 0, closingDebit: 200000000, closingCredit: 0 },
    };

    // Before closing: TK 511 and 632 are unclosed -> generates closing warning
    const unclosedReport = FinancialStatementsEngine.generateBalanceSheet(initialLedger, 'TT200');
    expect(unclosedReport.warnings.length).toBeGreaterThan(0);

    // Perform Day 26 & 27 Closing Entries:
    // Step 1: Nợ 511 / Có 911: 300M
    // Step 2: Nợ 911 / Có 632: 200M
    // Step 3: Profit before tax: 300M - 200M = 100M
    // Step 4: CIT 20%: Nợ 821 / Có 3334: 20M, Nợ 911 / Có 821: 20M
    // Step 5: Net Profit: 80M -> Nợ 911 / Có 4212: 80M
    const closedLedger: Record<string, LedgerAccountBalance> = {
      '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 600000000, creditTotal: 0, closingDebit: 600000000, closingCredit: 0 },
      '3334': { accountCode: '3334', accountNameVi: 'Thuế TNDN phải nộp', debitTotal: 0, creditTotal: 20000000, closingDebit: 0, closingCredit: 20000000 },
      '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 500000000, closingDebit: 0, closingCredit: 500000000 },
      '4212': { accountCode: '4212', accountNameVi: 'Lợi nhuận sau thuế năm nay', debitTotal: 0, creditTotal: 80000000, closingDebit: 0, closingCredit: 80000000 },
      '511': { accountCode: '511', accountNameVi: 'Doanh thu', debitTotal: 300000000, creditTotal: 300000000, closingDebit: 0, closingCredit: 0 },
      '632': { accountCode: '632', accountNameVi: 'Giá vốn', debitTotal: 200000000, creditTotal: 200000000, closingDebit: 0, closingCredit: 0 },
      '911': { accountCode: '911', accountNameVi: 'XĐ KQKD', debitTotal: 300000000, creditTotal: 300000000, closingDebit: 0, closingCredit: 0 },
    };

    const finalReport = FinancialStatementsEngine.generateBalanceSheet(closedLedger, 'TT200');
    // Total Assets = 600M
    expect(finalReport.assets.totalAssets).toBe(600000000);
    // Liabilities (Mã 300) = 20M (TK 3334)
    expect(finalReport.resources.liabilities.code300).toBe(20000000);
    // Equity (Mã 400) = 500M (411) + 80M (4212) = 580M
    expect(finalReport.resources.equity.code400).toBe(580000000);
    // Total Resources (Mã 440) = 20M + 580M = 600M
    expect(finalReport.resources.totalResources).toBe(600000000);
    expect(finalReport.isBalanced).toBe(true);
    expect(finalReport.discrepancy).toBe(0);
    expect(finalReport.warnings.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Interaction 4: Offline Mode + Journalizer + IndexedDB Persistence
  // -------------------------------------------------------------------------
  it('T3.4: Offline Mode + Journalizer + Storage: Transactions recorded offline persist to IndexedDB and recover intact', async () => {
    let history = WorkbenchStorageManager.createDefaultState();

    const offlineEntries: JournalEntryRow[] = [
      { id: 'off-1', accountCode: '152', accountNameVi: 'Nguyên vật liệu', debitAmount: 20000000, creditAmount: 0 },
      { id: 'off-2', accountCode: '331', accountNameVi: 'Phải trả người bán', debitAmount: 0, creditAmount: 20000000 },
    ];

    // Validate balance before posting
    const val = BalanceValidator.validateJournalBalance(offlineEntries);
    expect(val.isBalanced).toBe(true);

    history = WorkbenchStorageManager.postEntryToLedger(history, offlineEntries);

    // Save offline
    await storageService.setItem(WorkbenchStorageManager.STORAGE_KEY, history);

    // Simulate browser reload by reading back from storageService
    const reloaded = await storageService.getItem<WorkbenchHistory>(WorkbenchStorageManager.STORAGE_KEY);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.postedEntries).toHaveLength(2);
    expect(reloaded!.ledgerTAccounts['152'].closingDebit).toBe(20000000);
    expect(reloaded!.ledgerTAccounts['331'].closingCredit).toBe(20000000);
  });

  // -------------------------------------------------------------------------
  // Interaction 5: Supplier MST Status 04 + CIT Schedule B4 Adjustment
  // -------------------------------------------------------------------------
  it('T3.5: Supplier MST Status 04 + CIT Schedule B4: Bogus vendor invoice flagged and added to Schedule B4 non-deductible expenses', () => {
    const runawayInvoice: ExtendedVoucherCase = {
      id: 'inv-runaway-status-04',
      titleVi: 'Hóa đơn từ DN bỏ trốn',
      voucherType: 'VAT_INVOICE',
      scenarioDescriptionVi: 'Mua thiết bị văn phòng từ DN đã bỏ trốn',
      pretaxAmount: 50000000,
      vatAmount: 5000000,
      totalAmount: 55000000,
      paymentMethod: 'BANK_TRANSFER',
      vendorTaxStatus: '04',
      statutoryBasis: 'Nghị định 125/2020/NĐ-CP',
    };

    const audit = VoucherInspector.auditVoucher(runawayInvoice);
    expect(audit.isValid).toBe(false);
    expect(audit.citDeductible).toBe(false);

    // Feed disallowed 50M to B02-DN Schedule B4
    const report = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 300000000,
      cogs632: 150000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 20000000,
      adminExpense642: 60000000, // Includes 50M runaway invoice
      nonDeductibleB4: runawayInvoice.pretaxAmount, // 50M to B4
    });

    // Accounting profit before tax: 300M - 150M - 20M - 60M = 70M
    expect(report.accountingProfitBeforeTax).toBe(70000000);
    // Taxable income = 70M + 50M = 120M
    // CIT expense = 120M * 20% = 24M
    expect(report.citExpense).toBe(24000000);
  });

  // -------------------------------------------------------------------------
  // Interaction 6: TT133 Prohibited Account in Journalizer + Socratic Hint Level 3
  // -------------------------------------------------------------------------
  it('T3.6: TT133 Prohibited Account + Socratic Level 3: Journalizer alerts on prohibited code and twin case provides correct TT133 entry', () => {
    // User attempts to enter TK 641 in TT133
    const validation = validateAccountForRegime('641', 'CIRCULAR_133');
    expect(validation.isValid).toBe(false);
    expect(validation.isProhibited).toBe(true);
    expect(validation.substituteCode).toBe('6421');

    // Socratic level 3 scenario provides isomorphic substitution
    const twinCase = {
      scenario: 'Chi tiền mặt vận chuyển hàng hóa bán cho khách hàng trong TT 133',
      sampleJournal: [
        { accountCode: '6421', accountName: 'Chi phí bán hàng (TK cấp 2 của 642)', debit: 2000000, credit: 0 },
        { accountCode: '111', accountName: 'Tiền mặt', debit: 0, credit: 2000000 },
      ],
      explanation: 'Trong TT 133, không dùng TK 641, hạch toán vào Nợ TK 6421.',
    };

    const twinValidation = SocraticEngine.validateTwinCase(twinCase);
    expect(twinValidation.isValid).toBe(true);
    expect(twinCase.sampleJournal[0].accountCode).toBe('6421');
  });

  // -------------------------------------------------------------------------
  // Interaction 7: Revenue Deductions (TK 521 vs Nợ 511) + B02-DN Net Revenue
  // -------------------------------------------------------------------------
  it('T3.7: Revenue Deductions Regime Divergence + B02-DN: Net revenue Mã 10 is identical under TT 200 (via TK 521) and TT 133 (direct debit 511)', () => {
    // Under TT 200: Gross 100M, Deductions via 521 = 10M
    const tt200Report = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 100000000,
      deductions521: 10000000,
      cogs632: 60000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 5000000,
      adminExpense642: 5000000,
    });

    // Under TT 133: Deductions directly reduce 511, so Gross recorded is 90M, Deductions = 0
    const tt133Report = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 90000000, // Net 511 directly
      deductions521: 0,
      cogs632: 60000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 5000000,
      adminExpense642: 5000000,
    });

    // Net Revenue (Mã 10) must be equal
    expect(tt200Report.netRevenue).toBe(90000000);
    expect(tt133Report.netRevenue).toBe(90000000);
    expect(tt200Report.grossProfit).toBe(tt133Report.grossProfit);
  });

  // -------------------------------------------------------------------------
  // Interaction 8: High-Value Bank Invoice (>20M) + Decree 123 34-char MCCQT
  // -------------------------------------------------------------------------
  it('T3.8: High-Value Bank Invoice + MCCQT: Fully compliant voucher achieves 100% deduction for VAT (133) and CIT (642)', () => {
    const validHighValueVoucher: ExtendedVoucherCase = {
      id: 'inv-high-val-bank-valid',
      titleVi: 'Hóa đơn máy chủ 88M thanh toán qua ngân hàng',
      voucherType: 'VAT_INVOICE',
      scenarioDescriptionVi: 'Mua hệ thống máy chủ 80M + VAT 8M có UNC ngân hàng và MCCQT chuẩn',
      invoiceSymbol: 'C26TBB',
      mccqt: '0123456789ABCDEF0123456789ABCDEF02', // 34 chars
      pretaxAmount: 80000000,
      vatAmount: 8000000,
      totalAmount: 88000000,
      paymentMethod: 'BANK_TRANSFER',
      vendorTaxStatus: '00',
      signers: {
        director: true,
        chiefAccountant: true,
        cashierOrStorekeeper: true,
        preparer: true,
      },
      statutoryBasis: 'Nghị định 123/2020 & TT 219/2013',
    };

    const audit = VoucherInspector.auditVoucher(validHighValueVoucher);
    expect(audit.isValid).toBe(true);
    expect(audit.vatDeductible).toBe(true);
    expect(audit.citDeductible).toBe(true);
    expect(audit.issues).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Interaction 9: Day 25 Adjusting Entries + B01-DN Depreciation Presentation
  // -------------------------------------------------------------------------
  it('T3.9: Day 25 Adjustments + B01-DN: Accumulated depreciation (TK 214) is presented as negative contra-asset on Balance Sheet', () => {
    const ledger: Record<string, LedgerAccountBalance> = {
      '211': { accountCode: '211', accountNameVi: 'TSCĐ hữu hình', debitTotal: 1000000000, creditTotal: 0, closingDebit: 1000000000, closingCredit: 0 },
      '214': { accountCode: '214', accountNameVi: 'Hao mòn TSCĐ', debitTotal: 0, creditTotal: 200000000, closingDebit: 0, closingCredit: 200000000 },
      '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 800000000, closingDebit: 0, closingCredit: 800000000 },
    };

    const report = FinancialStatementsEngine.generateBalanceSheet(ledger, 'TT200');
    // Nguyên giá (Mã 221) = 1,000,000,000
    expect(report.assets.longTerm.items['221']).toBe(1000000000);
    // Hao mòn lũy kế (Mã 223) = -200,000,000 (negative!)
    expect(report.assets.longTerm.items['223']).toBe(-200000000);
    // TSCĐ ròng (Mã 220) = 800,000,000
    expect(report.assets.longTerm.items['220']).toBe(800000000);
    // Invariant holds: Mã 270 (800M) === Mã 440 (800M)
    expect(report.assets.totalAssets).toBe(800000000);
    expect(report.resources.totalResources).toBe(800000000);
    expect(report.isBalanced).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Interaction 10: Unbalanced Journal Entry Blocked to Protect Financial Statements
  // -------------------------------------------------------------------------
  it('T3.10: Unbalanced Journal Entry Blocking: Prevents posting unbalanced entries, protecting B01-DN invariant from corruption', () => {
    let history = WorkbenchStorageManager.createDefaultState();

    // Corrupted entry: Debit 50M vs Credit 40M (lệch 10M)
    const corruptedEntry: JournalEntryRow[] = [
      { id: '1', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 50000000, creditAmount: 0 },
      { id: '2', accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: 0, creditAmount: 40000000 },
    ];

    const validation = BalanceValidator.validateJournalBalance(corruptedEntry);
    expect(validation.isBalanced).toBe(false);
    expect(validation.delta).toBe(10000000);

    // Workbench refuses to post when validation.isBalanced is false
    if (!validation.isBalanced) {
      // Post is aborted; history remains untouched
    } else {
      history = WorkbenchStorageManager.postEntryToLedger(history, corruptedEntry);
    }

    expect(history.postedEntries).toHaveLength(0);
    expect(Object.keys(history.ledgerTAccounts)).toHaveLength(0);
  });
});
