import { describe, it, expect, beforeEach } from 'vitest';
import { searchAccounts, findAccountByCode } from '@/data/coa-service';
import { StorageService } from '@/services/storage/storage-service';
import { BalanceValidator, VoucherInspector } from '../helpers/domain-engines';
import { ExtendedVoucherCase } from '../fixtures/voucher-cases';
import {
  SocraticEngine,
  SocraticScenario,
  FinancialStatementsEngine,
  LedgerAccountBalance,
  WorkbenchStorageManager,
} from './e2e-contracts';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 2: Boundary, Extreme Precision & Corner Cases', () => {
  let storageService: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    storageService = new StorageService();
  });

  // =========================================================================
  // F1 Boundaries: COA Search Extremes, Sanitization & Performance
  // =========================================================================
  describe('F1 Boundaries: COA Search Extremes & Sanitization', () => {
    it('T2.1.1: should return all accounts when search query is empty or whitespace-only', () => {
      const emptyResult = searchAccounts('', 'CIRCULAR_200');
      const spaceResult = searchAccounts('     ', 'CIRCULAR_200');

      expect(emptyResult.length).toBeGreaterThan(70);
      expect(emptyResult.length).toBe(spaceResult.length);
    });

    it('T2.1.2: should safely handle regex metacharacters in search query without throwing syntax error', () => {
      const metachars = ['.*', '(?=.*)', '[[[', '\\d+', '$^', '.*+?^${}()|[]\\'];
      for (const q of metachars) {
        expect(() => searchAccounts(q, 'CIRCULAR_200')).not.toThrow();
      }
    });

    it('T2.1.3: should return empty array without freezing or throwing for extremely long query (1000+ chars)', () => {
      const longQuery = 'A'.repeat(1200);
      const start = performance.now();
      const result = searchAccounts(longQuery, 'CIRCULAR_200');
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(0);
      expect(elapsed).toBeLessThan(50); // Under 50ms performance boundary
    });

    it('T2.1.4: should return undefined or empty for non-existent account codes (999999, XYZ)', () => {
      const missingAccount = findAccountByCode('999999', 'CIRCULAR_200');
      expect(missingAccount).toBeUndefined();

      const searchMissing = searchAccounts('XYZ999', 'CIRCULAR_200');
      expect(searchMissing).toHaveLength(0);
    });

    it('T2.1.5: should trim leading/trailing whitespaces and correctly match account code (  112  )', () => {
      const spaced = searchAccounts('   112   ', 'CIRCULAR_200');
      expect(spaced.length).toBeGreaterThan(0);
      expect(spaced.some((a) => a.code === '112')).toBe(true);
    });
  });

  // =========================================================================
  // F2 Boundaries: Socratic Hint Ladder Level Clamping & Invariants
  // =========================================================================
  describe('F2 Boundaries: Socratic Hint Ladder Clamping & Invariants', () => {
    const testScenario: SocraticScenario = {
      id: 'scen-boundary-depreciation',
      titleVi: 'Trích khấu hao TSCĐ tại bộ phận quản lý doanh nghiệp',
      regime: 'CIRCULAR_200',
      targetAccountCodes: ['642', '214'],
      hints: {
        level1: {
          level: 1,
          title: 'Nấc 1: Định vị',
          content: 'Nghiệp vụ liên quan đến chi phí quản lý và hao mòn TSCĐ.',
          suggestedAccountGroups: ['64 (Chi phí quản lý)', '21 (Tài sản cố định)'],
        },
        level2: {
          level: 2,
          title: 'Nấc 2: Bản chất',
          content: 'Hao mòn lũy kế tăng và chi phí quản lý doanh nghiệp tăng.',
          reflectiveQuestions: ['Tài khoản hao mòn TSCĐ (214) có kết cấu ngược với tài sản thông thường: tăng ghi Nợ hay Có?'],
        },
        level3: {
          level: 3,
          title: 'Nấc 3: Ví dụ song sinh',
          content: 'Trích khấu hao máy vi tính phòng kế toán 5.000.000 đ.',
          twinCase: {
            scenario: 'Trích khấu hao thiết bị văn phòng',
            sampleJournal: [
              { accountCode: '642', accountName: 'Chi phí QLDN', debit: 5000000, credit: 0 },
              { accountCode: '214', accountName: 'Hao mòn TSCĐ', debit: 0, credit: 5000000 },
            ],
            explanation: 'Nợ TK 642 / Có TK 214',
          },
        },
      },
    };

    beforeEach(() => {
      SocraticEngine.registerScenario(testScenario);
    });

    it('T2.2.1: should reject or return null for level 0 or negative level requests', () => {
      expect(SocraticEngine.getHint('scen-boundary-depreciation', 0, 3)).toBeNull();
      expect(SocraticEngine.getHint('scen-boundary-depreciation', -1, 3)).toBeNull();
    });

    it('T2.2.2: should return null for level > 3 requests (e.g. level 4, 100)', () => {
      expect(SocraticEngine.getHint('scen-boundary-depreciation', 4, 3)).toBeNull();
      expect(SocraticEngine.getHint('scen-boundary-depreciation', 100, 3)).toBeNull();
    });

    it('T2.2.3: Twin case validation strictly rejects unbalanced journal entries', () => {
      const unbalancedTwin = {
        scenario: 'Unbalanced attack',
        sampleJournal: [
          { accountCode: '642', accountName: 'Chi phí QLDN', debit: 5000000, credit: 0 },
          { accountCode: '214', accountName: 'Hao mòn TSCĐ', debit: 0, credit: 4999999 }, // 1 VND difference
        ],
        explanation: 'Delta 1 VND',
      };

      const result = SocraticEngine.validateTwinCase(unbalancedTwin);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('unbalanced');
    });

    it('T2.2.4: Twin case validation rejects negative or zero debit/credit amounts', () => {
      const negativeTwin = {
        scenario: 'Negative amount attack',
        sampleJournal: [
          { accountCode: '642', accountName: 'Chi phí QLDN', debit: -5000000, credit: 0 },
          { accountCode: '214', accountName: 'Hao mòn TSCĐ', debit: 0, credit: -5000000 },
        ],
        explanation: 'Negative entries',
      };

      const result = SocraticEngine.validateTwinCase(negativeTwin);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('T2.2.5: Advancing level beyond 3 remains clamped at 3 (idempotent)', () => {
      let level = 1;
      level = SocraticEngine.advanceLevel(level); // 2
      expect(level).toBe(2);
      level = SocraticEngine.advanceLevel(level); // 3
      expect(level).toBe(3);
      level = SocraticEngine.advanceLevel(level); // still 3
      expect(level).toBe(3);
      level = SocraticEngine.advanceLevel(level); // still 3
      expect(level).toBe(3);
    });
  });

  // =========================================================================
  // F3 Boundaries: Storage Malformation, Massive Payloads & Unicode
  // =========================================================================
  describe('F3 Boundaries: Storage Malformation, Massive Payloads & Unicode', () => {
    it('T2.3.1: should safely handle corrupted JSON import without throwing unhandled exceptions', async () => {
      const corruptedJson = '{"app": "vietnam-accounting-learning-web", "version": 1, corrupt...';
      const success = await storageService.importBackup(corruptedJson);
      expect(success).toBe(false);
    });

    it('T2.3.2: should safely handle empty string or null backup import', async () => {
      expect(await storageService.importBackup('')).toBe(false);
      expect(await storageService.importBackup('   ')).toBe(false);
    });

    it('T2.3.3: should persist and retrieve massive workbench history (500+ rows) without truncation', async () => {
      let history = WorkbenchStorageManager.createDefaultState();
      const massiveRows: JournalEntryRow[] = [];

      for (let i = 1; i <= 250; i++) {
        massiveRows.push(
          { id: `d-${i}`, accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 100000, creditAmount: 0 },
          { id: `c-${i}`, accountCode: '511', accountNameVi: 'Doanh thu bán hàng', debitAmount: 0, creditAmount: 100000 }
        );
      }

      history = WorkbenchStorageManager.postEntryToLedger(history, massiveRows);
      expect(history.postedEntries.length).toBe(500);
      expect(history.ledgerTAccounts['111'].debitTotal).toBe(25000000);
      expect(history.ledgerTAccounts['511'].creditTotal).toBe(25000000);

      await storageService.setItem(WorkbenchStorageManager.STORAGE_KEY, history);
      const retrieved = await storageService.getItem<typeof history>(WorkbenchStorageManager.STORAGE_KEY);
      expect(retrieved?.postedEntries.length).toBe(500);
    });

    it('T2.3.4: should overwrite existing workbench history completely without leaking stale data', async () => {
      const stateA = { key: 'stateA', entriesCount: 10 };
      const stateB = { key: 'stateB', entriesCount: 2 };

      await storageService.setItem('history_state', stateA);
      expect((await storageService.getItem<typeof stateA>('history_state'))?.key).toBe('stateA');

      await storageService.setItem('history_state', stateB);
      const retrieved = await storageService.getItem<typeof stateB>('history_state');
      expect(retrieved?.key).toBe('stateB');
      expect(retrieved?.entriesCount).toBe(2);
    });

    it('T2.3.5: should preserve complex Vietnamese Unicode characters and accents with 100% fidelity', async () => {
      const complexUnicode = {
        title: 'Nghiệp vụ: Trích quỹ khen thưởng, phúc lợi và nộp thuế GTGT vãng lai tỉnh ngoài',
        statutoryBasis: 'Nghị định 123/2020/NĐ-CP & Thông tư 80/2021/TT-BTC',
        specialSymbols: '₫, €, £, ¥, ±, ≤, ≥, ≠, ≡, ‰, ★, ⚡',
      };

      await storageService.setItem('unicode_test', complexUnicode);
      const retrieved = await storageService.getItem<typeof complexUnicode>('unicode_test');
      expect(retrieved).toEqual(complexUnicode);
    });
  });

  // =========================================================================
  // F4 Boundaries: Financial Statement Precision & Exact Cent Invariants
  // =========================================================================
  describe('F4 Boundaries: Financial Statement Precision & Invariants', () => {
    it('T2.4.1: Exactly 1 VND imbalance between Assets (270) and Resources (440) triggers warning and isBalanced = false', () => {
      const balances: Record<string, LedgerAccountBalance> = {
        '111': { accountCode: '111', accountNameVi: 'Tiền mặt', debitTotal: 100000001, creditTotal: 0, closingDebit: 100000001, closingCredit: 0 },
        '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 100000000, closingDebit: 0, closingCredit: 100000000 },
      };

      const report = FinancialStatementsEngine.generateBalanceSheet(balances, 'TT200');
      expect(report.assets.totalAssets).toBe(100000001);
      expect(report.resources.totalResources).toBe(100000000);
      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(1);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('1 đ');
    });

    it('T2.4.2: Zero-balance ledger (company before operations) produces 270 === 440 = 0 with isBalanced = true', () => {
      const emptyLedger: Record<string, LedgerAccountBalance> = {};
      const report = FinancialStatementsEngine.generateBalanceSheet(emptyLedger, 'TT200');

      expect(report.assets.totalAssets).toBe(0);
      expect(report.resources.totalResources).toBe(0);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
      expect(report.warnings.length).toBe(0);
    });

    it('T2.4.3: Contra-asset accounts (TK 214 accumulated depreciation, TK 229 allowance) properly subtract as negative items', () => {
      const balances: Record<string, LedgerAccountBalance> = {
        '211': { accountCode: '211', accountNameVi: 'TSCĐ', debitTotal: 100000000, creditTotal: 0, closingDebit: 100000000, closingCredit: 0 },
        '214': { accountCode: '214', accountNameVi: 'Hao mòn TSCĐ', debitTotal: 0, creditTotal: 30000000, closingDebit: 0, closingCredit: 30000000 },
        '131': { accountCode: '131', accountNameVi: 'Phải thu KH', debitTotal: 50000000, creditTotal: 0, closingDebit: 50000000, closingCredit: 0 },
        '2293': { accountCode: '2293', accountNameVi: 'Dự phòng nợ khó đòi', debitTotal: 0, creditTotal: 10000000, closingDebit: 0, closingCredit: 10000000 },
        '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 110000000, closingDebit: 0, closingCredit: 110000000 },
      };

      const report = FinancialStatementsEngine.generateBalanceSheet(balances, 'TT200');
      // Fixed assets net: 100M - 30M = 70M
      expect(report.assets.longTerm.code200).toBe(70000000);
      // Receivables net: 50M - 10M = 40M
      expect(report.assets.shortTerm.code100).toBe(40000000);
      // Total assets: 70M + 40M = 110M === Total resources 110M
      expect(report.assets.totalAssets).toBe(110000000);
      expect(report.resources.totalResources).toBe(110000000);
      expect(report.isBalanced).toBe(true);
    });

    it('T2.4.4: Zero revenue with operating expenses produces negative profit (loss) without NaN or crash', () => {
      const income = FinancialStatementsEngine.generateIncomeStatement({
        revenue511: 0,
        cogs632: 0,
        financialIncome515: 0,
        financialExpense635: 0,
        sellingExpense641: 5000000,
        adminExpense642: 10000000,
      });

      expect(income.grossProfit).toBe(0);
      expect(income.operatingProfit).toBe(-15000000);
      expect(income.accountingProfitBeforeTax).toBe(-15000000);
      // Under loss, taxable income is 0, CIT is 0
      expect(income.citExpense).toBe(0);
      expect(income.netProfitAfterTax).toBe(-15000000);
      expect(Number.isNaN(income.netProfitAfterTax)).toBe(false);
    });

    it('T2.4.5: Unclosed temporary accounts (Type 5-9) with remaining balances trigger closing warnings on Balance Sheet', () => {
      const balancesWithUnclosedType6: Record<string, LedgerAccountBalance> = {
        '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 20000000, creditTotal: 0, closingDebit: 20000000, closingCredit: 0 },
        '642': { accountCode: '642', accountNameVi: 'Chi phí QLDN', debitTotal: 10000000, creditTotal: 0, closingDebit: 10000000, closingCredit: 0 }, // Unclosed!
        '411': { accountCode: '411', accountNameVi: 'Vốn CSH', debitTotal: 0, creditTotal: 20000000, closingDebit: 0, closingCredit: 20000000 },
      };

      const report = FinancialStatementsEngine.generateBalanceSheet(balancesWithUnclosedType6, 'TT200');
      expect(report.warnings.some((w) => w.includes('642') && w.includes('chưa được kết chuyển'))).toBe(true);
    });
  });

  // =========================================================================
  // F5 Boundaries: Compliance, Thresholds 19,999,999 vs 20M & Fraud Alert
  // =========================================================================
  describe('F5 Boundaries: Compliance, Thresholds 19,999,999 vs 20M & Fraud Alert', () => {
    it('T2.5.1: Exactly 20,000,000 VND boundary: 19,999,999 VND cash is allowed vs 20,000,000 VND cash is disallowed', () => {
      const voucher19m999: ExtendedVoucherCase = {
        id: 'case-boundary-19999999',
        titleVi: 'Hóa đơn tiền mặt 19.999.999 đ',
        voucherType: 'VAT_INVOICE',
        scenarioDescriptionVi: 'Mua hàng 19.999.999 đ thanh toán tiền mặt',
        pretaxAmount: 18181817,
        vatAmount: 1818182,
        totalAmount: 19999999,
        paymentMethod: 'CASH',
        vendorTaxStatus: '00',
        statutoryBasis: 'TT 219/2013/TT-BTC',
      };

      const voucher20m: ExtendedVoucherCase = {
        id: 'case-boundary-20000000',
        titleVi: 'Hóa đơn tiền mặt đúng 20.000.000 đ',
        voucherType: 'VAT_INVOICE',
        scenarioDescriptionVi: 'Mua hàng đúng 20.000.000 đ thanh toán tiền mặt',
        pretaxAmount: 18181818,
        vatAmount: 1818182,
        totalAmount: 20000000,
        paymentMethod: 'CASH',
        vendorTaxStatus: '00',
        statutoryBasis: 'TT 219/2013/TT-BTC',
      };

      const audit19m999 = VoucherInspector.auditVoucher(voucher19m999);
      expect(audit19m999.isValid).toBe(true);
      expect(audit19m999.vatDeductible).toBe(true);
      expect(audit19m999.citDeductible).toBe(true);

      const audit20m = VoucherInspector.auditVoucher(voucher20m);
      expect(audit20m.isValid).toBe(false);
      expect(audit20m.vatDeductible).toBe(false);
      expect(audit20m.citDeductible).toBe(false);
      expect(audit20m.issues.some((i) => i.includes('20.000.000'))).toBe(true);
    });

    it('T2.5.2: Journalizer rejects negative debit or credit amounts', () => {
      const negativeRow: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: -5000000, creditAmount: 0 },
        { id: '2', accountCode: '112', accountNameVi: 'Tiền gửi NH', debitAmount: 0, creditAmount: -5000000 },
      ];

      const validation = BalanceValidator.validateJournalBalance(negativeRow);
      expect(validation.isBalanced).toBe(false);
      expect(validation.errorMessageVi).toContain('số âm');
    });

    it('T2.5.3: Journalizer detects unbalanced debit/credit with exact delta warning', () => {
      const unbalancedRows: JournalEntryRow[] = [
        { id: '1', accountCode: '156', accountNameVi: 'Hàng hóa', debitAmount: 10000000, creditAmount: 0 },
        { id: '2', accountCode: '331', accountNameVi: 'Phải trả người bán', debitAmount: 0, creditAmount: 9000000 },
      ];

      const validation = BalanceValidator.validateJournalBalance(unbalancedRows);
      expect(validation.isBalanced).toBe(false);
      expect(validation.delta).toBe(1000000);
      expect(validation.errorMessageVi).toContain('không cân bằng');
      expect(validation.errorMessageVi).toContain('1.000.000');
    });

    it('T2.5.4: Voucher Inspector rejects invoice with arithmetic deviation exceeding tolerance (> 2 VND)', () => {
      const arithmeticErrorVoucher: ExtendedVoucherCase = {
        id: 'case-arithmetic-error',
        titleVi: 'Hóa đơn sai số học',
        voucherType: 'VAT_INVOICE',
        scenarioDescriptionVi: 'Tiền hàng 10M + Thuế 1M nhưng ghi tổng tiền 12M (lệch 1M)',
        pretaxAmount: 10000000,
        vatAmount: 1000000,
        totalAmount: 12000000, // Error: 10M + 1M != 12M
        paymentMethod: 'BANK_TRANSFER',
        vendorTaxStatus: '00',
        statutoryBasis: 'NĐ 123/2020/NĐ-CP',
      };

      const audit = VoucherInspector.auditVoucher(arithmeticErrorVoucher);
      expect(audit.isValid).toBe(false);
      expect(audit.issues.some((i) => i.includes('Sai lệch số học'))).toBe(true);
    });

    it('T2.5.5: Supplier MST Status 04 (runaway) with valid MCCQT still strictly disallowed (fraud prevention override)', () => {
      const fraudVoucher: ExtendedVoucherCase = {
        id: 'case-runaway-with-mccqt',
        titleVi: 'Hóa đơn của DN bỏ trốn có mã CQT giả lập',
        voucherType: 'VAT_INVOICE',
        scenarioDescriptionVi: 'Doanh nghiệp đã bị cơ quan thuế thông báo không hoạt động tại địa chỉ đăng ký',
        invoiceSymbol: 'C26TAA',
        mccqt: '0023456789ABCDEF0123456789ABCDEF01', // Exactly 34 hex chars
        pretaxAmount: 30000000,
        vatAmount: 3000000,
        totalAmount: 33000000,
        paymentMethod: 'BANK_TRANSFER',
        vendorTaxStatus: '04', // Runaway!
        statutoryBasis: 'NĐ 125/2020/NĐ-CP',
      };

      const audit = VoucherInspector.auditVoucher(fraudVoucher);
      expect(audit.isValid).toBe(false);
      expect(audit.vatDeductible).toBe(false);
      expect(audit.citDeductible).toBe(false);
      expect(audit.issues.some((i) => i.includes('Status 04') || i.includes('không hoạt động tại địa chỉ đăng ký'))).toBe(true);
    });
  });
});
