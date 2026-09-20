import { describe, it, expect, beforeEach } from 'vitest';
import { getAccountsByRegime, searchAccounts } from '@/data/coa-service';
import { isProhibitedInCircular133, validateAccountForRegime } from '@/data/prohibited-accounts';
import { StorageService } from '@/services/storage/storage-service';
import { VoucherInspector } from '../helpers/domain-engines';
import { VOUCHER_TEST_CASES } from '../fixtures/voucher-cases';
import {
  SocraticEngine,
  SocraticScenario,
  FinancialStatementsEngine,
  LedgerAccountBalance,
  WorkbenchStorageManager,
  WorkbenchHistory,
} from './e2e-contracts';
import { JournalEntryRow } from '@/types/workbench';

describe('Tier 1: Feature Coverage (Requirement-driven verification of F1-F5)', () => {
  let storageService: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    storageService = new StorageService();
  });

  // =========================================================================
  // F1: COA High-Performance Explorer & Dual Regime Toggle (R1)
  // =========================================================================
  describe('F1: COA High-Performance Explorer & Dual Regime Toggle', () => {
    it('T1.1.1: should load Circular 200 accounts spanning all 9 account classes with >= 70 accounts', () => {
      const accounts200 = getAccountsByRegime('CIRCULAR_200');
      expect(accounts200.length).toBeGreaterThan(70);

      const classesFound = new Set(accounts200.map((a) => a.code[0]));
      for (let c = 1; c <= 9; c++) {
        expect(classesFound.has(c.toString())).toBe(true);
      }
    });

    it('T1.1.2: should toggle to Circular 133 and exclude prohibited accounts (621, 622, 623, 627, 641, 521, 413)', () => {
      const accounts133 = getAccountsByRegime('CIRCULAR_133');
      const codes133 = accounts133.map((a) => a.code);

      expect(codes133).not.toContain('621');
      expect(codes133).not.toContain('622');
      expect(codes133).not.toContain('623');
      expect(codes133).not.toContain('627');
      expect(codes133).not.toContain('641');
      expect(codes133).not.toContain('521');
      expect(codes133).not.toContain('413');
      expect(accounts133.length).toBeGreaterThan(40);
    });

    it('T1.1.3: should perform instant search by account code prefix (e.g. 112, 156, 331)', () => {
      const results112 = searchAccounts('112', 'CIRCULAR_200');
      expect(results112.length).toBeGreaterThan(0);
      expect(results112.some((a) => a.code === '1121')).toBe(true);

      const results156 = searchAccounts('156', 'CIRCULAR_200');
      expect(results156.length).toBeGreaterThan(0);
      expect(results156.some((a) => a.code.startsWith('156'))).toBe(true);
    });

    it('T1.1.4: should perform instant search by Vietnamese name with case insensitivity', () => {
      const lowerSearch = searchAccounts('ngân hàng', 'CIRCULAR_200');
      const upperSearch = searchAccounts('NGÂN HÀNG', 'CIRCULAR_200');

      expect(lowerSearch.length).toBeGreaterThan(0);
      expect(upperSearch.length).toBeGreaterThan(0);
      expect(lowerSearch.length).toBe(upperSearch.length);
      // Both should find TK 112 (Tiền gửi ngân hàng)
      expect(lowerSearch.some((a) => a.code.startsWith('112'))).toBe(true);
      expect(upperSearch.some((a) => a.code.startsWith('112'))).toBe(true);
    });

    it('T1.1.5: should filter accounts by category tabs (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)', () => {
      const assets = searchAccounts('', 'CIRCULAR_200', 'ASSET');
      const liabilities = searchAccounts('', 'CIRCULAR_200', 'LIABILITY');
      const equity = searchAccounts('', 'CIRCULAR_200', 'EQUITY');

      expect(assets.length).toBeGreaterThan(20);
      expect(assets.every((a) => a.category === 'ASSET')).toBe(true);

      expect(liabilities.length).toBeGreaterThan(10);
      expect(liabilities.every((a) => a.category === 'LIABILITY')).toBe(true);

      expect(equity.length).toBeGreaterThan(5);
      expect(equity.every((a) => a.category === 'EQUITY')).toBe(true);
    });
  });

  // =========================================================================
  // F2: Socratic Hint Ladder (3 Levels: Group, Nature, Twin Example) (R2)
  // =========================================================================
  describe('F2: 3-Tier Graduated Socratic Hint Ladder in Journalizer', () => {
    const sampleScenario: SocraticScenario = {
      id: 'scen-payroll-tt133',
      titleVi: 'Tính tiền lương công nhân sản xuất trực tiếp trong doanh nghiệp SME',
      regime: 'CIRCULAR_133',
      targetAccountCodes: ['154', '334'],
      hints: {
        level1: {
          level: 1,
          title: 'Nấc 1: Định vị nhóm tài khoản',
          content: 'Nghiệp vụ này liên quan đến chi phí sản xuất kinh doanh dở dang và nghĩa vụ phải trả cho người lao động.',
          suggestedAccountGroups: ['Nhóm 15 (Hàng tồn kho & chi phí sản xuất)', 'Nhóm 33 (Nợ phải trả)'],
        },
        level2: {
          level: 2,
          title: 'Nấc 2: Phân tích bản chất biến động',
          content: 'Khi trích lương công nhân sản xuất, Chi phí sản xuất tăng lên và Khoản phải trả người lao động tăng lên.',
          reflectiveQuestions: [
            'Doanh nghiệp SME theo Thông tư 133 tập hợp chi phí nhân công vào tài khoản nào thay vì TK 622?',
            'Nợ phải trả người lao động phát sinh tăng được ghi vào bên Nợ hay bên Có của TK 334?',
          ],
        },
        level3: {
          level: 3,
          title: 'Nấc 3: Nghiệp vụ song sinh (Twin Analogous Case)',
          content: 'Ví dụ tương tự: Công ty B tính tiền lương nhân viên trực tiếp gia công là 25.000.000 đ.',
          twinCase: {
            scenario: 'Công ty B tính tiền lương bộ phận gia công tháng 1/2026',
            sampleJournal: [
              { accountCode: '154', accountName: 'Chi phí SXKD dở dang (chi tiết Nhân công)', debit: 25000000, credit: 0 },
              { accountCode: '334', accountName: 'Phải trả người lao động', debit: 0, credit: 25000000 },
            ],
            explanation: 'Theo TT 133, tập hợp chi phí nhân công trực tiếp vào Nợ TK 154, đối ứng Có TK 334.',
          },
        },
      },
    };

    beforeEach(() => {
      SocraticEngine.registerScenario(sampleScenario);
    });

    it('T1.2.1: Level 1 Positioning hint suggests account groups without naming specific child accounts', () => {
      const hint1 = SocraticEngine.getHint('scen-payroll-tt133', 1, 1);
      expect(hint1).toBeDefined();
      expect(hint1?.level).toBe(1);
      expect(hint1?.suggestedAccountGroups).toBeDefined();
      expect(hint1?.suggestedAccountGroups?.length).toBeGreaterThan(0);
      // Level 1 must not expose twin case solution
      expect(hint1?.twinCase).toBeUndefined();
    });

    it('T1.2.2: Level 2 Nature question guides learner on asset/liability/equity movements without giving journal entry', () => {
      const hint2 = SocraticEngine.getHint('scen-payroll-tt133', 2, 2);
      expect(hint2).toBeDefined();
      expect(hint2?.level).toBe(2);
      expect(hint2?.reflectiveQuestions).toBeDefined();
      expect(hint2?.reflectiveQuestions?.length).toBeGreaterThanOrEqual(2);
      expect(hint2?.twinCase).toBeUndefined();
    });

    it('T1.2.3: Level 3 Twin Case provides an isomorphic business example with balanced journal entries', () => {
      const hint3 = SocraticEngine.getHint('scen-payroll-tt133', 3, 3);
      expect(hint3).toBeDefined();
      expect(hint3?.level).toBe(3);
      expect(hint3?.twinCase).toBeDefined();

      const validation = SocraticEngine.validateTwinCase(hint3!.twinCase!);
      expect(validation.isValid).toBe(true);
      expect(hint3!.twinCase!.sampleJournal.length).toBeGreaterThanOrEqual(2);
    });

    it('T1.2.4: Socratic ladder structure conforms strictly to PROJECT.md interface contract', () => {
      const hint = sampleScenario.hints.level3;
      expect(hint).toHaveProperty('level', 3);
      expect(hint).toHaveProperty('title');
      expect(hint).toHaveProperty('content');
      expect(hint).toHaveProperty('twinCase');
      expect(hint.twinCase).toHaveProperty('scenario');
      expect(hint.twinCase).toHaveProperty('sampleJournal');
      expect(hint.twinCase).toHaveProperty('explanation');
    });

    it('T1.2.5: Anti-spoil progression: Prevents jumping directly to Level 3 when unlocked level is Level 1', () => {
      const prematureHint3 = SocraticEngine.getHint('scen-payroll-tt133', 3, 1);
      expect(prematureHint3).toBeNull();

      const validHint1 = SocraticEngine.getHint('scen-payroll-tt133', 1, 1);
      expect(validHint1).not.toBeNull();

      // Advancing to level 2 allows access to level 2
      const level2 = SocraticEngine.advanceLevel(1);
      expect(level2).toBe(2);
      expect(SocraticEngine.getHint('scen-payroll-tt133', 2, level2)).not.toBeNull();
      expect(SocraticEngine.getHint('scen-payroll-tt133', 3, level2)).toBeNull();
    });
  });

  // =========================================================================
  // F3: Offline-First PWA & IndexedDB State Persistence (R3)
  // =========================================================================
  describe('F3: Offline-First PWA & IndexedDB State Persistence', () => {
    it('T1.3.1: IndexedDB persistent state stores postedEntries, ledgerTAccounts, and voucherCompletedCases', async () => {
      const initialHistory = WorkbenchStorageManager.createDefaultState();
      const sampleEntry: JournalEntryRow[] = [
        { id: '1', accountCode: '111', accountNameVi: 'Tiền mặt', debitAmount: 10000000, creditAmount: 0 },
        { id: '2', accountCode: '112', accountNameVi: 'Tiền gửi ngân hàng', debitAmount: 0, creditAmount: 10000000 },
      ];

      const updatedHistory = WorkbenchStorageManager.postEntryToLedger(initialHistory, sampleEntry);
      expect(updatedHistory.postedEntries.length).toBe(2);
      expect(updatedHistory.ledgerTAccounts['111'].closingDebit).toBe(10000000);
      expect(updatedHistory.ledgerTAccounts['112'].closingCredit).toBe(10000000);

      await storageService.setItem(WorkbenchStorageManager.STORAGE_KEY, updatedHistory);
      const retrieved = await storageService.getItem<WorkbenchHistory>(WorkbenchStorageManager.STORAGE_KEY);
      expect(retrieved).toEqual(updatedHistory);
    });

    it('T1.3.2: StorageService fallback: seamlessly writes and reads between IndexedDB and LocalStorage', async () => {
      await storageService.setItem('test_persistence_key', { status: 'offline_verified' });
      const val = await storageService.getItem<{ status: string }>('test_persistence_key');
      expect(val).toEqual({ status: 'offline_verified' });

      await storageService.removeItem('test_persistence_key');
      const removed = await storageService.getItem('test_persistence_key');
      expect(removed).toBeNull();
    });

    it('T1.3.3: 1-Click backup export generates valid JSON payload containing application state', async () => {
      await storageService.setTheme('dark');
      await storageService.setPreferredRegime('CIRCULAR_133');
      await storageService.saveLearnerProgress({
        currentDay: 4,
        unlockedDays: [1, 2, 3, 4],
        completedDays: [1, 2, 3],
        milestoneScores: { 3: 85 },
        streakDays: 3,
        lastActiveDate: '2026-09-20',
      });

      const backupStr = await storageService.exportBackup();
      const parsed = JSON.parse(backupStr);

      expect(parsed.app).toBe('vietnam-accounting-learning-web');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.theme).toBe('dark');
      expect(parsed.regime).toBe('CIRCULAR_133');
      expect(parsed.progress.unlockedDays).toEqual([1, 2, 3, 4]);
    });

    it('T1.3.4: 1-Click backup import restores workbench history and learner progress completely', async () => {
      const backupPayload = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        app: 'vietnam-accounting-learning-web',
        theme: 'light',
        regime: 'CIRCULAR_200',
        progress: {
          unlockedDays: [1, 2, 3, 4, 5, 6],
          completedDays: [1, 2, 3],
          milestoneScores: { 3: 90 },
        },
        customData: {
          indexedDb: {
            workbench_state: {
              postedEntries: [],
              ledgerTAccounts: {},
              voucherCompletedCases: ['case-01'],
            },
          },
        },
      });

      const imported = await storageService.importBackup(backupPayload);
      expect(imported).toBe(true);

      const progress = await storageService.getLearnerProgress();
      expect(progress?.unlockedDays).toEqual([1, 2, 3, 4, 5, 6]);

      const theme = await storageService.getTheme();
      expect(theme).toBe('light');
    });

    it('T1.3.5: Offline simulation: operations succeed when navigator.onLine is false', async () => {
      // Simulate navigator offline
      const originalOnLine = navigator.onLine;
      try {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        expect(navigator.onLine).toBe(false);

        // Writing and reading from storage must work completely offline without network
        await storageService.setItem('offline_entry', { offlineSaved: true, timestamp: Date.now() });
        const res = await storageService.getItem<{ offlineSaved: boolean }>('offline_entry');
        expect(res?.offlineSaved).toBe(true);
      } finally {
        Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
      }
    });
  });

  // =========================================================================
  // F4: Dynamic Financial Statements (B01-DN & B02-DN) (R4)
  // =========================================================================
  describe('F4: Dynamic Financial Statements (B01-DN & B02-DN)', () => {
    it('T1.4.1: B01-DN Balance Sheet aggregates ledger accounts into short-term (Code 100) and long-term (Code 200) assets', () => {
      const balances: Record<string, LedgerAccountBalance> = {
        '111': { accountCode: '111', accountNameVi: 'Tiền mặt', debitTotal: 100000000, creditTotal: 0, closingDebit: 100000000, closingCredit: 0 },
        '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 200000000, creditTotal: 0, closingDebit: 200000000, closingCredit: 0 },
        '156': { accountCode: '156', accountNameVi: 'Hàng hóa', debitTotal: 150000000, creditTotal: 0, closingDebit: 150000000, closingCredit: 0 },
        '211': { accountCode: '211', accountNameVi: 'TSCĐ hữu hình', debitTotal: 500000000, creditTotal: 0, closingDebit: 500000000, closingCredit: 0 },
        '214': { accountCode: '214', accountNameVi: 'Hao mòn TSCĐ', debitTotal: 0, creditTotal: 50000000, closingDebit: 0, closingCredit: 50000000 },
        '331': { accountCode: '331', accountNameVi: 'Phải trả người bán', debitTotal: 0, creditTotal: 100000000, closingDebit: 0, closingCredit: 100000000 },
        '411': { accountCode: '411', accountNameVi: 'Vốn đầu tư CSH', debitTotal: 0, creditTotal: 800000000, closingDebit: 0, closingCredit: 800000000 },
      };

      const report = FinancialStatementsEngine.generateBalanceSheet(balances, 'TT200');
      // Short term: 100M (111) + 200M (112) + 150M (156) = 450M
      expect(report.assets.shortTerm.code100).toBe(450000000);
      // Long term: 500M (211) - 50M (214) = 450M
      expect(report.assets.longTerm.code200).toBe(450000000);
      // Total Assets: 900M
      expect(report.assets.totalAssets).toBe(900000000);
    });

    it('T1.4.2: B01-DN enforces the accounting invariant Mã 270 === Mã 300 + Mã 400', () => {
      const balances: Record<string, LedgerAccountBalance> = {
        '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 500000000, creditTotal: 0, closingDebit: 500000000, closingCredit: 0 },
        '331': { accountCode: '331', accountNameVi: 'Phải trả người bán', debitTotal: 0, creditTotal: 200000000, closingDebit: 0, closingCredit: 200000000 },
        '411': { accountCode: '411', accountNameVi: 'Vốn đầu tư CSH', debitTotal: 0, creditTotal: 300000000, closingDebit: 0, closingCredit: 300000000 },
      };

      const report = FinancialStatementsEngine.generateBalanceSheet(balances, 'TT200');
      expect(report.assets.totalAssets).toBe(500000000); // Mã 270
      expect(report.resources.liabilities.code300).toBe(200000000); // Mã 300
      expect(report.resources.equity.code400).toBe(300000000); // Mã 400
      expect(report.resources.totalResources).toBe(500000000); // Mã 440
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
      expect(report.warnings.length).toBe(0);
    });

    it('T1.4.3: B01-DN detects balance mismatch (Delta > 0), flags isBalanced = false, and raises explicit warnings', () => {
      const unbalanced: Record<string, LedgerAccountBalance> = {
        '112': { accountCode: '112', accountNameVi: 'Tiền gửi NH', debitTotal: 500000000, creditTotal: 0, closingDebit: 500000000, closingCredit: 0 },
        '411': { accountCode: '411', accountNameVi: 'Vốn đầu tư CSH', debitTotal: 0, creditTotal: 480000000, closingDebit: 0, closingCredit: 480000000 },
      };

      const report = FinancialStatementsEngine.generateBalanceSheet(unbalanced, 'TT200');
      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(20000000);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('CẢNH BÁO MẤT CÂN ĐỐI');
    });

    it('T1.4.4: B02-DN Income Statement computes 12-item multi-step cascade: Net Revenue = Gross - Deductions', () => {
      const income = FinancialStatementsEngine.generateIncomeStatement({
        revenue511: 100000000,
        deductions521: 10000000,
        cogs632: 50000000,
        financialIncome515: 5000000,
        financialExpense635: 2000000,
        sellingExpense641: 8000000,
        adminExpense642: 15000000,
      });

      expect(income.grossRevenue).toBe(100000000); // Mã 01
      expect(income.revenueDeductions).toBe(10000000); // Mã 02
      expect(income.netRevenue).toBe(90000000); // Mã 10 = 01 - 02
      expect(income.costOfGoodsSold).toBe(50000000); // Mã 11
      expect(income.grossProfit).toBe(40000000); // Mã 20 = 10 - 11
    });

    it('T1.4.5: B02-DN completes Operating Profit (30), Pretax Profit (50), CIT Expense (51), and Net Profit After Tax (60)', () => {
      const income = FinancialStatementsEngine.generateIncomeStatement({
        revenue511: 100000000,
        cogs632: 60000000,
        financialIncome515: 4000000,
        financialExpense635: 1000000,
        sellingExpense641: 5000000,
        adminExpense642: 8000000,
        otherIncome711: 2000000,
        otherExpense811: 1000000,
      });

      // Operating profit: 40M gross + (4M - 1M) - (5M + 8M) = 40M + 3M - 13M = 30M
      expect(income.operatingProfit).toBe(30000000); // Mã 30
      // Other profit: 2M - 1M = 1M
      expect(income.otherProfit).toBe(1000000); // Mã 40
      // Pretax profit: 30M + 1M = 31M
      expect(income.accountingProfitBeforeTax).toBe(31000000); // Mã 50
      // CIT at 20%: 31M * 0.20 = 6.2M
      expect(income.citExpense).toBe(6200000); // Mã 51
      // Net profit after tax: 31M - 6.2M = 24.8M
      expect(income.netProfitAfterTax).toBe(24800000); // Mã 60
    });
  });

  // =========================================================================
  // F5: Accounting Compliance & Tax Fraud Guardrails (R5)
  // =========================================================================
  describe('F5: Accounting Compliance & Tax Fraud Guardrails', () => {
    it('T1.5.1: Prohibited accounts in TT133 detected and substitute recommendations provided', () => {
      expect(isProhibitedInCircular133('621')).toBe(true);
      expect(isProhibitedInCircular133('641')).toBe(true);
      expect(isProhibitedInCircular133('521')).toBe(true);
      expect(isProhibitedInCircular133('111')).toBe(false);

      const val621 = validateAccountForRegime('621', 'CIRCULAR_133');
      expect(val621.isValid).toBe(false);
      expect(val621.isProhibited).toBe(true);
      expect(val621.substituteCode).toBe('154');

      const val641 = validateAccountForRegime('641', 'CIRCULAR_133');
      expect(val641.substituteCode).toBe('6421');
    });

    it('T1.5.2: Sub-account inheritance of prohibition (e.g. 6411, 6272, 5211 rejected in TT133)', () => {
      expect(isProhibitedInCircular133('6411')).toBe(true);
      expect(isProhibitedInCircular133('6272')).toBe(true);
      expect(isProhibitedInCircular133('5211')).toBe(true);
      expect(isProhibitedInCircular133('6218')).toBe(true);

      const val6411 = validateAccountForRegime('6411', 'CIRCULAR_133');
      expect(val6411.isValid).toBe(false);
      expect(val6411.isProhibited).toBe(true);
    });

    it('T1.5.3: Non-cash invoice rule: Invoice >= 20,000,000 VND paid in cash disallows VAT and CIT deductions', () => {
      const voucher20mCash = VOUCHER_TEST_CASES.find((v) => v.id === 'case-03-boundary-invalid-cash-20m')!;
      expect(voucher20mCash).toBeDefined();

      const audit = VoucherInspector.auditVoucher(voucher20mCash);
      expect(audit.isValid).toBe(false);
      expect(audit.vatDeductible).toBe(false);
      expect(audit.citDeductible).toBe(false);
      expect(audit.issues.some((i) => i.includes('20.000.000'))).toBe(true);
    });

    it('T1.5.4: Non-cash invoice rule: Invoice >= 20,000,000 VND paid via bank transfer is approved with deductions intact', () => {
      const voucher55mBank = VOUCHER_TEST_CASES.find((v) => v.id === 'case-04-valid-bank-55m')!;
      expect(voucher55mBank).toBeDefined();

      const audit = VoucherInspector.auditVoucher(voucher55mBank);
      expect(audit.isValid).toBe(true);
      expect(audit.vatDeductible).toBe(true);
      expect(audit.citDeductible).toBe(true);
      expect(audit.issues).toHaveLength(0);
    });

    it('T1.5.5: Supplier Tax Code (MST) status 03/04 detection flags suspended / runaway sellers with legal risk alert', () => {
      const status03Case = VOUCHER_TEST_CASES.find((v) => v.id === 'case-05-vendor-status-03-suspended')!;
      const audit03 = VoucherInspector.auditVoucher(status03Case);
      expect(audit03.isValid).toBe(false);
      expect(audit03.vatDeductible).toBe(false);
      expect(audit03.citDeductible).toBe(false);
      expect(audit03.issues.some((i) => i.includes('Status 03') || i.includes('Tạm ngừng'))).toBe(true);

      const status04Case = VOUCHER_TEST_CASES.find((v) => v.id === 'case-06-vendor-status-04-runaway')!;
      const audit04 = VoucherInspector.auditVoucher(status04Case);
      expect(audit04.isValid).toBe(false);
      expect(audit04.vatDeductible).toBe(false);
      expect(audit04.citDeductible).toBe(false);
      expect(audit04.issues.some((i) => i.includes('Status 04') || i.includes('không hoạt động tại địa chỉ đăng ký'))).toBe(true);
    });
  });
});
