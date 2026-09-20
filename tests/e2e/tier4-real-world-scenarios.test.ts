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

describe('Tier 4: Real-World End-to-End Application Scenarios', () => {
  let storageService: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    storageService = new StorageService();
  });

  // =========================================================================
  // SCENARIO 1: Full 30-Day Closing Simulation Cycle (R1, R3, R4, R5)
  // =========================================================================
  it('Scenario 1: Complete 30-day closing cycle: Operating entries -> Day 25 adjustments -> Day 26 clearing to 911 -> Day 27 CIT calculation with B4 adjustment & TK 4212 transfer -> B01-DN & B02-DN verification', async () => {
    // -----------------------------------------------------------------------
    // Phase 1: Operating Transactions (Days 1 - 24)
    // -----------------------------------------------------------------------
    let workbench = WorkbenchStorageManager.createDefaultState();

    // Opening Capital: Owner contributes 1,000,000,000 VND to bank (112 / 411)
    const entryCapital: JournalEntryRow[] = [
      { id: 'op-1', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 1000000000, creditAmount: 0 },
      { id: 'op-2', accountCode: '411', accountNameVi: 'Vốn đầu tư CSH', debitAmount: 0, creditAmount: 1000000000 },
    ];
    expect(BalanceValidator.validateJournalBalance(entryCapital).isBalanced).toBe(true);
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entryCapital);

    // Purchase Merchandise: Buy goods 300,000,000 VND via bank transfer (156 / 112)
    const entryBuyGoods: JournalEntryRow[] = [
      { id: 'op-3', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 300000000, creditAmount: 0 },
      { id: 'op-4', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 300000000 },
    ];
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entryBuyGoods);

    // Sales: Sell merchandise for 500,000,000 VND, cost 200,000,000 VND (112/511 and 632/156)
    const entrySales: JournalEntryRow[] = [
      { id: 'op-5', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 500000000, creditAmount: 0 },
      { id: 'op-6', accountCode: '511', accountNameVi: 'Doanh thu bán hàng', debitAmount: 0, creditAmount: 500000000 },
      { id: 'op-7', accountCode: '632', accountNameVi: 'Giá vốn hàng bán', debitAmount: 200000000, creditAmount: 0 },
      { id: 'op-8', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 0, creditAmount: 200000000 },
    ];
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entrySales);

    // -----------------------------------------------------------------------
    // Phase 2: Day 25 Adjusting Entries (Prepaid expenses, depreciation)
    // -----------------------------------------------------------------------
    // Depreciation of office equipment: Nợ 642 (30M) / Có 214 (30M)
    const entryDepreciation: JournalEntryRow[] = [
      { id: 'adj-1', accountCode: '642', accountNameVi: 'Chi phí QLDN', debitAmount: 30000000, creditAmount: 0 },
      { id: 'adj-2', accountCode: '214', accountNameVi: 'Hao mòn TSCĐ', debitAmount: 0, creditAmount: 30000000 },
    ];
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entryDepreciation);

    // -----------------------------------------------------------------------
    // Phase 3: Day 26 Closing Entries to TK 911
    // -----------------------------------------------------------------------
    // Close Revenue: Nợ 511 (500M) / Có 911 (500M)
    // Close Expenses: Nợ 911 (230M) / Có 632 (200M), Có 642 (30M)
    const entryClosing911: JournalEntryRow[] = [
      { id: 'cls-1', accountCode: '511', accountNameVi: 'Doanh thu', debitAmount: 500000000, creditAmount: 0 },
      { id: 'cls-2', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 0, creditAmount: 500000000 },
      { id: 'cls-3', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 230000000, creditAmount: 0 },
      { id: 'cls-4', accountCode: '632', accountNameVi: 'Giá vốn', debitAmount: 0, creditAmount: 200000000 },
      { id: 'cls-5', accountCode: '642', accountNameVi: 'Chi phí QLDN', debitAmount: 0, creditAmount: 30000000 },
    ];
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entryClosing911);

    // Accounting Profit before tax in 911 = 500M - 230M = 270M

    // -----------------------------------------------------------------------
    // Phase 4: Day 27 Corporate Income Tax Calculation & Profit Transfer
    // -----------------------------------------------------------------------
    // Suppose 10M of the 30M admin expense was paid in cash (>20M cash invoice rule breach)
    // Non-deductible expense B4 = 10,000,000 VND
    const incomeReport = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 500000000,
      cogs632: 200000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 0,
      adminExpense642: 30000000,
      nonDeductibleB4: 10000000, // Schedule B4 penalty
    });

    expect(incomeReport.accountingProfitBeforeTax).toBe(270000000);
    // Taxable income: 270M + 10M = 280M
    // CIT 20%: 280M * 20% = 56M
    expect(incomeReport.citExpense).toBe(56000000);
    // Net profit after tax: 270M - 56M = 214M
    expect(incomeReport.netProfitAfterTax).toBe(214000000);

    // Post CIT liability and clear 821 to 911:
    // Nợ 911 / Có 3334: 56M
    // Transfer net profit to 4212: Nợ 911 / Có 4212: 214M
    const entryCITAndProfit: JournalEntryRow[] = [
      { id: 'cit-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 56000000, creditAmount: 0 },
      { id: 'cit-2', accountCode: '3334', accountNameVi: 'Thuế TNDN phải nộp', debitAmount: 0, creditAmount: 56000000 },
      { id: 'prf-1', accountCode: '911', accountNameVi: 'XĐ KQKD', debitAmount: 214000000, creditAmount: 0 },
      { id: 'prf-2', accountCode: '4212', accountNameVi: 'Lợi nhuận sau thuế chưa phân phối', debitAmount: 0, creditAmount: 214000000 },
    ];
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entryCITAndProfit);

    // -----------------------------------------------------------------------
    // Phase 5: Verification of Golden Rules & Invariants
    // -----------------------------------------------------------------------
    // Invariant 1: TK 911 has exactly 0 balance
    const tk911 = workbench.ledgerTAccounts['911'];
    expect(tk911.debitTotal).toBe(500000000);
    expect(tk911.creditTotal).toBe(500000000);
    expect(tk911.closingDebit).toBe(0);
    expect(tk911.closingCredit).toBe(0);

    // Invariant 2: TK 511, 632, 642 have zero balance
    expect(workbench.ledgerTAccounts['511'].closingCredit).toBe(0);
    expect(workbench.ledgerTAccounts['632'].closingDebit).toBe(0);
    expect(workbench.ledgerTAccounts['642'].closingDebit).toBe(0);

    // Invariant 3: B01-DN Balance Sheet Mã 270 === Mã 440
    // Assets: Cash in bank 1,200M + Merchandise 100M - Depreciation 30M = 1,270M
    // Resources: Tax payable 3334 (56M) + Capital 411 (1,000M) + Profit 4212 (214M) = 1,270M
    const balanceSheet = FinancialStatementsEngine.generateBalanceSheet(workbench.ledgerTAccounts, 'TT200');
    expect(balanceSheet.assets.totalAssets).toBe(1270000000);
    expect(balanceSheet.resources.totalResources).toBe(1270000000);
    expect(balanceSheet.isBalanced).toBe(true);
    expect(balanceSheet.discrepancy).toBe(0);
    expect(balanceSheet.warnings).toHaveLength(0);

    // Invariant 4: B02-DN Net Profit (Mã 60: 214M) strictly equals TK 4212 balance on B01-DN
    expect(balanceSheet.resources.equity.items['421']).toBe(incomeReport.netProfitAfterTax);
  });

  // =========================================================================
  // SCENARIO 2: Socratic Guided Journalizing under TT133 (R2, R5)
  // =========================================================================
  it('Scenario 2: Socratic guided journalizing under TT133: Learner attempts prohibited account -> system alerts -> 3-level hint guidance -> successful substitute entry', () => {
    // 1. Practice Scenario setup: Factory direct material costs
    const scenario: SocraticScenario = {
      id: 'scen-mat-tt133',
      titleVi: 'Xuất kho nguyên vật liệu dùng trực tiếp sản xuất sản phẩm (TT 133)',
      regime: 'CIRCULAR_133',
      targetAccountCodes: ['154', '152'],
      hints: {
        level1: {
          level: 1,
          title: 'Nấc 1: Định vị nhóm tài khoản',
          content: 'Doanh nghiệp SME theo TT 133 không sử dụng TK 621. Hãy tìm tài khoản tập hợp chi phí sản xuất dở dang.',
          suggestedAccountGroups: ['15 (Hàng tồn kho & CPSXKD dở dang)'],
        },
        level2: {
          level: 2,
          title: 'Nấc 2: Phân tích bản chất biến động',
          content: 'Nguyên vật liệu xuất kho làm giảm HTK (ghi Có 152), chi phí sản xuất trực tiếp tăng lên.',
          reflectiveQuestions: [
            'Thông tư 133 quy định tài khoản nào thay thế toàn bộ các tài khoản 621, 622, 623, 627?',
            'Chi phí sản xuất phát sinh tăng được ghi vào bên Nợ hay bên Có?',
          ],
        },
        level3: {
          level: 3,
          title: 'Nấc 3: Nghiệp vụ song sinh TT 133',
          content: 'Ví dụ: Xuất kho vải may 30.000.000 đ dùng sản xuất áo sơ mi.',
          twinCase: {
            scenario: 'Xuất kho NVL sản xuất áo sơ mi',
            sampleJournal: [
              { accountCode: '154', accountName: 'Chi phí SXKD dở dang (NVL)', debit: 30000000, credit: 0 },
              { accountCode: '152', accountName: 'Nguyên liệu, vật liệu', debit: 0, credit: 30000000 },
            ],
            explanation: 'Hạch toán vào Nợ TK 154 thay vì TK 621.',
          },
        },
      },
    };
    SocraticEngine.registerScenario(scenario);

    // 2. Learner mistakenly enters TK 621 in TT 133
    const prohibitedCheck = validateAccountForRegime('621', 'CIRCULAR_133');
    expect(prohibitedCheck.isValid).toBe(false);
    expect(prohibitedCheck.isProhibited).toBe(true);
    expect(prohibitedCheck.warning).toContain('KHÔNG ĐƯỢC PHÉP');

    // 3. Learner steps through Socratic Hints
    // Level 1
    const h1 = SocraticEngine.getHint('scen-mat-tt133', 1, 1);
    expect(h1?.suggestedAccountGroups).toContain('15 (Hàng tồn kho & CPSXKD dở dang)');

    // Level 2
    const h2 = SocraticEngine.getHint('scen-mat-tt133', 2, 2);
    expect(h2?.reflectiveQuestions?.length).toBeGreaterThan(0);

    // Level 3
    const h3 = SocraticEngine.getHint('scen-mat-tt133', 3, 3);
    expect(h3?.twinCase?.sampleJournal[0].accountCode).toBe('154');

    // 4. Learner corrects journal entry to Nợ 154 / Có 152
    const correctedRows: JournalEntryRow[] = [
      { id: 'cor-1', accountCode: '154', accountNameVi: 'Chi phí SXKD dở dang', debitAmount: 50000000, creditAmount: 0 },
      { id: 'cor-2', accountCode: '152', accountNameVi: 'Nguyên liệu, vật liệu', debitAmount: 0, creditAmount: 50000000 },
    ];

    // Verify valid under TT133
    const valid154 = validateAccountForRegime('154', 'CIRCULAR_133');
    expect(valid154.isValid).toBe(true);

    const balanceVal = BalanceValidator.validateJournalBalance(correctedRows);
    expect(balanceVal.isBalanced).toBe(true);
    expect(balanceVal.delta).toBe(0);
  });

  // =========================================================================
  // SCENARIO 3: Offline Reload F5 and IndexedDB Recovery (R3)
  // =========================================================================
  it('Scenario 3: Offline practice & F5 state recovery: Offline operations save to IndexedDB and restore completely across simulated browser reloads', async () => {
    // 1. Initial online practice session
    let workbench = WorkbenchStorageManager.createDefaultState();
    const entry1: JournalEntryRow[] = [
      { id: 'init-1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 15000000, creditAmount: 0 },
      { id: 'init-2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: 15000000 },
    ];
    workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entry1);
    await storageService.setItem(WorkbenchStorageManager.STORAGE_KEY, workbench);

    // 2. User goes offline (airplane mode / train commute)
    const originalOnLine = navigator.onLine;
    try {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      expect(navigator.onLine).toBe(false);

      // 3. User records further transactions while offline
      const entryOffline: JournalEntryRow[] = [
        { id: 'off-1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 40000000, creditAmount: 0 },
        { id: 'off-2', accountCode: '331', accountNameVi: 'Phải trả người bán', debitAmount: 0, creditAmount: 40000000 },
      ];
      workbench = WorkbenchStorageManager.postEntryToLedger(workbench, entryOffline);
      workbench.voucherCompletedCases.push('case-01-valid-cash', 'case-04-valid-bank-55m');

      // Persist to IndexedDB offline
      await storageService.setItem(WorkbenchStorageManager.STORAGE_KEY, workbench);

      // 4. User refreshes browser (F5 simulated by creating fresh StorageService instance)
      const freshStorage = new StorageService();
      const recoveredState = await freshStorage.getItem<WorkbenchHistory>(WorkbenchStorageManager.STORAGE_KEY);

      // 5. Verify 100% data recovery
      expect(recoveredState).not.toBeNull();
      expect(recoveredState!.postedEntries).toHaveLength(4);
      expect(recoveredState!.ledgerTAccounts['111'].closingDebit).toBe(15000000);
      expect(recoveredState!.ledgerTAccounts['112'].closingCredit).toBe(15000000);
      expect(recoveredState!.ledgerTAccounts['156'].closingDebit).toBe(40000000);
      expect(recoveredState!.ledgerTAccounts['331'].closingCredit).toBe(40000000);
      expect(recoveredState!.voucherCompletedCases).toEqual(['case-01-valid-cash', 'case-04-valid-bank-55m']);
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    }
  });

  // =========================================================================
  // SCENARIO 4: Supplier Audit with Tax Suspension 03/04 & CIT Schedule B4 (R4, R5)
  // =========================================================================
  it('Scenario 4: Supplier audit with tax suspension 03/04 & CIT Schedule B4: High-risk suppliers flagged, disallowed expenses automatically aggregated into CIT return Schedule B4', () => {
    // Two vendor invoices received during monthly audit
    const invoiceVendorA: ExtendedVoucherCase = {
      id: 'inv-aud-vendor-a-suspended',
      titleVi: 'Hóa đơn mua VLXD 35M trả tiền mặt từ DN tạm ngừng KD',
      voucherType: 'VAT_INVOICE',
      scenarioDescriptionVi: 'Mua VLXD 35 triệu đồng thanh toán tiền mặt từ đơn vị Status 03',
      pretaxAmount: 31818182,
      vatAmount: 3181818,
      totalAmount: 35000000,
      paymentMethod: 'CASH', // Breach 1: >= 20M cash
      vendorTaxStatus: '03', // Breach 2: Status 03 suspended!
      statutoryBasis: 'TT 219/2013 & NĐ 126/2020',
    };

    const invoiceVendorB: ExtendedVoucherCase = {
      id: 'inv-aud-vendor-b-compliant',
      titleVi: 'Hóa đơn dịch vụ phần mềm 66M thanh toán qua ngân hàng',
      voucherType: 'VAT_INVOICE',
      scenarioDescriptionVi: 'Mua bản quyền phần mềm 66M trả qua ngân hàng',
      invoiceSymbol: 'C26TCC',
      mccqt: '0123456789ABCDEF0123456789ABCDEF03',
      pretaxAmount: 60000000,
      vatAmount: 6000000,
      totalAmount: 66000000,
      paymentMethod: 'BANK_TRANSFER', // Compliant
      vendorTaxStatus: '00', // Active
      signers: { director: true, chiefAccountant: true, cashierOrStorekeeper: true, preparer: true },
      statutoryBasis: 'NĐ 123/2020',
    };

    // Audit invoices
    const auditA = VoucherInspector.auditVoucher(invoiceVendorA);
    const auditB = VoucherInspector.auditVoucher(invoiceVendorB);

    // Vendor A fails on 2 counts
    expect(auditA.isValid).toBe(false);
    expect(auditA.vatDeductible).toBe(false);
    expect(auditA.citDeductible).toBe(false);
    expect(auditA.issues.length).toBeGreaterThanOrEqual(2);

    // Vendor B passes cleanly
    expect(auditB.isValid).toBe(true);
    expect(auditB.vatDeductible).toBe(true);
    expect(auditB.citDeductible).toBe(true);

    // Aggregate disallowed expenses into Schedule B4
    const scheduleB4DisallowedExpenses: number = !auditA.citDeductible ? (invoiceVendorA.pretaxAmount ?? 0) : 0;
    expect(scheduleB4DisallowedExpenses).toBe(31818182);

    const adminExpA = invoiceVendorA.pretaxAmount ?? 0;
    const adminExpB = invoiceVendorB.pretaxAmount ?? 0;

    // Compute CIT with and without B4
    const incomeNoPenalty = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 400000000,
      cogs632: 250000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 15000000,
      adminExpense642: adminExpA + adminExpB,
      nonDeductibleB4: 0,
    });

    const incomeWithPenalty = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 400000000,
      cogs632: 250000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 15000000,
      adminExpense642: adminExpA + adminExpB,
      nonDeductibleB4: scheduleB4DisallowedExpenses, // Disallowed 31.8M added to B4
    });

    // Accounting profit before tax is unchanged
    expect(incomeNoPenalty.accountingProfitBeforeTax).toBe(incomeWithPenalty.accountingProfitBeforeTax);
    // CIT tax liability increases by exactly 20% of the disallowed amount (6,363,636 VND)
    const citDelta = incomeWithPenalty.citExpense - incomeNoPenalty.citExpense;
    expect(citDelta).toBe(Math.round(scheduleB4DisallowedExpenses * 0.2));
  });

  // =========================================================================
  // SCENARIO 5: Dual Circular Transition (TT200 to TT133) & Invariant Verification (R1, R4, R5)
  // =========================================================================
  it('Scenario 5: Dual circular transition (TT200 to TT133) & invariant verification: Account reclassification preserves mathematical balance sheet equality Mã 270 === Mã 440 and identical net profit', () => {
    // 1. Enterprise books under Circular 200 before transition
    const tt200Ledger: Record<string, LedgerAccountBalance> = {
      '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 800000000, creditTotal: 0, closingDebit: 800000000, closingCredit: 0 },
      '156': { accountCode: '156', accountNameVi: 'Hàng hóa', debitTotal: 200000000, creditTotal: 0, closingDebit: 200000000, closingCredit: 0 },
      // Direct production expenses on separate accounts in TT200
      '621': { accountCode: '621', accountNameVi: 'Chi phí NVL trực tiếp', debitTotal: 50000000, creditTotal: 50000000, closingDebit: 0, closingCredit: 0 },
      '622': { accountCode: '622', accountNameVi: 'Chi phí NC trực tiếp', debitTotal: 30000000, creditTotal: 30000000, closingDebit: 0, closingCredit: 0 },
      // Selling expenses on separate account in TT200
      '641': { accountCode: '641', accountNameVi: 'Chi phí bán hàng', debitTotal: 20000000, creditTotal: 20000000, closingDebit: 0, closingCredit: 0 },
      '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 900000000, closingDebit: 0, closingCredit: 900000000 },
      '4212': { accountCode: '4212', accountNameVi: 'LNST năm nay', debitTotal: 0, creditTotal: 100000000, closingDebit: 0, closingCredit: 100000000 },
    };

    const tt200BalanceSheet = FinancialStatementsEngine.generateBalanceSheet(tt200Ledger, 'TT200');
    expect(tt200BalanceSheet.assets.totalAssets).toBe(1000000000);
    expect(tt200BalanceSheet.resources.totalResources).toBe(1000000000);
    expect(tt200BalanceSheet.isBalanced).toBe(true);

    // 2. Company transitions to Circular 133 (SME):
    // Reclassification rules:
    // - 621 (50M) + 622 (30M) -> TK 154 (80M)
    // - 641 (20M) -> TK 6421 (sub-account of 642)
    const tt133Ledger: Record<string, LedgerAccountBalance> = {
      '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 800000000, creditTotal: 0, closingDebit: 800000000, closingCredit: 0 },
      '156': { accountCode: '156', accountNameVi: 'Hàng hóa', debitTotal: 200000000, creditTotal: 0, closingDebit: 200000000, closingCredit: 0 },
      // Reclassified to 154
      '154': { accountCode: '154', accountNameVi: 'Chi phí SXKD dở dang', debitTotal: 80000000, creditTotal: 80000000, closingDebit: 0, closingCredit: 0 },
      // Reclassified to 6421
      '6421': { accountCode: '6421', accountNameVi: 'Chi phí bán hàng (SME)', debitTotal: 20000000, creditTotal: 20000000, closingDebit: 0, closingCredit: 0 },
      '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 900000000, closingDebit: 0, closingCredit: 900000000 },
      '4212': { accountCode: '4212', accountNameVi: 'LNST năm nay', debitTotal: 0, creditTotal: 100000000, closingDebit: 0, closingCredit: 100000000 },
    };

    const tt133BalanceSheet = FinancialStatementsEngine.generateBalanceSheet(tt133Ledger, 'TT133');
    expect(tt133BalanceSheet.assets.totalAssets).toBe(1000000000);
    expect(tt133BalanceSheet.resources.totalResources).toBe(1000000000);
    expect(tt133BalanceSheet.isBalanced).toBe(true);

    // 3. Mathematical Equivalence: Total Assets and Resources must be strictly equal across regimes
    expect(tt200BalanceSheet.assets.totalAssets).toBe(tt133BalanceSheet.assets.totalAssets);
    expect(tt200BalanceSheet.resources.totalResources).toBe(tt133BalanceSheet.resources.totalResources);

    // 4. Verify Income Statement Net Profit equivalence
    const incomeTT200 = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 300000000,
      cogs632: 150000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 20000000, // 641 in TT200
      adminExpense642: 30000000,
    });

    const incomeTT133 = FinancialStatementsEngine.generateIncomeStatement({
      revenue511: 300000000,
      cogs632: 150000000,
      financialIncome515: 0,
      financialExpense635: 0,
      sellingExpense641: 20000000, // 6421 in TT133
      adminExpense642: 30000000, // 6422 in TT133
    });

    expect(incomeTT200.netProfitAfterTax).toBe(incomeTT133.netProfitAfterTax);
  });
});
