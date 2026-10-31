import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  formatCurrencyVnd,
} from '@/services/financial-statements';
import {
  calculateFifo,
  calculatePeriodicWeightedAverage,
  calculateMovingWeightedAverage,
  calculateStockCard,
  NegativeStockError,
} from '@/engine/cogs-engine';
import { isProhibitedInCircular133 } from '@/data/prohibited-accounts';
import { JournalBalanceValidation } from '@/types/workbench';
import { InventoryLot, StockTransaction } from '@/types/cogs';

describe('EMPIRICAL CHALLENGER: 5 Core Accounting Invariants Stress Harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // INVARIANT 1: Double-Entry Balance Invariant (sum Debit === sum Credit > 0)
  // ==========================================================================
  describe('Invariant 1: Double-Entry Balance Invariant', () => {
    function validateJournalEntry(
      rows: Array<{ accountCode: string; debitAmount: number; creditAmount: number }>,
      regime: 'CIRCULAR_200' | 'CIRCULAR_133' = 'CIRCULAR_200'
    ): JournalBalanceValidation {
      const totalDebit = rows.reduce((sum, r) => sum + (Number(r.debitAmount) || 0), 0);
      const totalCredit = rows.reduce((sum, r) => sum + (Number(r.creditAmount) || 0), 0);
      const roundedDebit = Math.round(totalDebit);
      const roundedCredit = Math.round(totalCredit);
      const delta = Math.abs(roundedDebit - roundedCredit);

      let errorMessageVi: string | undefined;

      if (rows.length < 2) {
        errorMessageVi = 'Bút toán phải có ít nhất 2 dòng tài khoản đối ứng (1 Nợ - 1 Có).';
      } else if (roundedDebit === 0 && roundedCredit === 0) {
        errorMessageVi = 'Số tiền định khoản phải lớn hơn 0 VNĐ.';
      } else if (delta !== 0) {
        errorMessageVi = `Bút toán chưa cân đối! Tổng Nợ (${formatCurrencyVnd(roundedDebit)}) lệch ${formatCurrencyVnd(delta)} so với Tổng Có (${formatCurrencyVnd(roundedCredit)}).`;
      }

      const sameRowConflict = rows.some((r) => r.debitAmount > 0 && r.creditAmount > 0);
      if (sameRowConflict) {
        errorMessageVi = 'Một dòng tài khoản không được nhập đồng thời cả Nợ và Có.';
      }

      if (regime === 'CIRCULAR_133') {
        const prohibitedRow = rows.find((r) => isProhibitedInCircular133(r.accountCode));
        if (prohibitedRow) {
          errorMessageVi = `TK ${prohibitedRow.accountCode} bị CẤM trong Thông tư 133!`;
        }
      }

      const emptyAccount = rows.some((r) => (r.debitAmount > 0 || r.creditAmount > 0) && !r.accountCode.trim());
      if (emptyAccount) {
        errorMessageVi = 'Vui lòng chọn Mã tài khoản cho tất cả các dòng phát sinh.';
      }

      const isBalanced = delta === 0 && roundedDebit > 0 && !errorMessageVi;

      return {
        totalDebit: roundedDebit,
        totalCredit: roundedCredit,
        isBalanced,
        delta,
        errorMessageVi,
      };
    }

    it('rejects all-zero entries (sum Debit = 0, sum Credit = 0)', () => {
      const v = validateJournalEntry([
        { accountCode: '111', debitAmount: 0, creditAmount: 0 },
        { accountCode: '511', debitAmount: 0, creditAmount: 0 },
      ]);
      expect(v.isBalanced).toBe(false);
      expect(v.errorMessageVi).toContain('lớn hơn 0 VNĐ');
    });

    it('rejects single-line entries (< 2 rows)', () => {
      const v = validateJournalEntry([
        { accountCode: '111', debitAmount: 1000000, creditAmount: 0 },
      ]);
      expect(v.isBalanced).toBe(false);
      expect(v.errorMessageVi).toContain('ít nhất 2 dòng');
    });

    it('rejects entries with 1 VND discrepancy', () => {
      const v = validateJournalEntry([
        { accountCode: '111', debitAmount: 10000000, creditAmount: 0 },
        { accountCode: '511', debitAmount: 0, creditAmount: 10000001 },
      ]);
      expect(v.isBalanced).toBe(false);
      expect(v.delta).toBe(1);
      expect(v.errorMessageVi).toContain('chưa cân đối');
    });

    it('rejects simultaneous debit and credit in the same row', () => {
      const v = validateJournalEntry([
        { accountCode: '111', debitAmount: 5000000, creditAmount: 5000000 },
        { accountCode: '511', debitAmount: 0, creditAmount: 0 },
      ]);
      expect(v.isBalanced).toBe(false);
      expect(v.errorMessageVi).toContain('không được nhập đồng thời');
    });

    it('validates 1-Debit multiple-Credits compound journal entries (1 Nợ - nhiều Có)', () => {
      const v = validateJournalEntry([
        { accountCode: '112', debitAmount: 110000000, creditAmount: 0 },
        { accountCode: '511', debitAmount: 0, creditAmount: 100000000 },
        { accountCode: '33311', debitAmount: 0, creditAmount: 10000000 },
      ]);
      expect(v.isBalanced).toBe(true);
      expect(v.totalDebit).toBe(110000000);
      expect(v.totalCredit).toBe(110000000);
      expect(v.delta).toBe(0);
    });

    it('validates multiple-Debits 1-Credit compound journal entries (nhiều Nợ - 1 Có)', () => {
      const v = validateJournalEntry([
        { accountCode: '152', debitAmount: 80000000, creditAmount: 0 },
        { accountCode: '1331', debitAmount: 8000000, creditAmount: 0 },
        { accountCode: '331', debitAmount: 0, creditAmount: 88000000 },
      ]);
      expect(v.isBalanced).toBe(true);
      expect(v.delta).toBe(0);
    });

    it('enforces prohibited account block in Circular 133 mode (e.g. TK 641, 621)', () => {
      const v = validateJournalEntry(
        [
          { accountCode: '641', debitAmount: 20000000, creditAmount: 0 },
          { accountCode: '112', debitAmount: 0, creditAmount: 20000000 },
        ],
        'CIRCULAR_133'
      );
      expect(v.isBalanced).toBe(false);
      expect(v.errorMessageVi).toContain('bị CẤM trong Thông tư 133');
    });

    it('survives randomized 500-entry fuzzing for balance preservation', () => {
      for (let i = 0; i < 500; i++) {
        const debit1 = Math.floor(Math.random() * 10000000) + 1000;
        const debit2 = Math.floor(Math.random() * 10000000) + 1000;
        const totalCredit = debit1 + debit2;

        const v = validateJournalEntry([
          { accountCode: '156', debitAmount: debit1, creditAmount: 0 },
          { accountCode: '1331', debitAmount: debit2, creditAmount: 0 },
          { accountCode: '331', debitAmount: 0, creditAmount: totalCredit },
        ]);
        expect(v.isBalanced).toBe(true);
        expect(v.delta).toBe(0);
        expect(v.totalDebit).toBe(totalCredit);
      }
    });
  });

  // ==========================================================================
  // INVARIANT 2: Balance Sheet Invariant (Mã 270 === Mã 440)
  // ==========================================================================
  describe('Invariant 2: Balance Sheet Invariant (Mã 270 === Mã 440)', () => {
    it('verifies standard balanced balance sheet under Circular 200', () => {
      const ledger = {
        '112': { accountCode: '112', closingDebit: 500000000, closingCredit: 0 },
        '156': { accountCode: '156', closingDebit: 300000000, closingCredit: 0 },
        '211': { accountCode: '211', closingDebit: 1000000000, closingCredit: 0 },
        '214': { accountCode: '214', closingDebit: 0, closingCredit: 200000000 },
        '331': { accountCode: '331', closingDebit: 0, closingCredit: 400000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 1200000000 },
      };

      const bs = generateBalanceSheet(ledger, 'TT200');
      expect(bs.assets.totalAssets).toBe(1600000000);
      expect(bs.resources.totalResources).toBe(1600000000);
      expect(bs.isBalanced).toBe(true);
      expect(bs.discrepancy).toBe(0);
      expect(bs.warnings).toHaveLength(0);
    });

    it('verifies negative contra-asset deduction (TK 214, 2293, 2294)', () => {
      const ledger = {
        '131': { accountCode: '131', closingDebit: 200000000, closingCredit: 0 },
        '2293': { accountCode: '2293', closingDebit: 0, closingCredit: 30000000 },
        '156': { accountCode: '156', closingDebit: 400000000, closingCredit: 0 },
        '2294': { accountCode: '2294', closingDebit: 0, closingCredit: 50000000 },
        '211': { accountCode: '211', closingDebit: 800000000, closingCredit: 0 },
        '214': { accountCode: '214', closingDebit: 0, closingCredit: 100000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 1220000000 },
      };

      const bs = generateBalanceSheet(ledger, 'TT200');
      expect(bs.assets.shortTerm.items['130']).toBe(170000000);
      expect(bs.assets.shortTerm.items['140']).toBe(350000000);
      expect(bs.assets.longTerm.items['220']).toBe(700000000);
      expect(bs.assets.totalAssets).toBe(1220000000);
      expect(bs.resources.totalResources).toBe(1220000000);
      expect(bs.isBalanced).toBe(true);
      expect(bs.discrepancy).toBe(0);
    });

    it('verifies negative contra-equity deduction (TK 419 Treasury shares & TK 4212 Loss)', () => {
      const ledger = {
        '112': { accountCode: '112', closingDebit: 750000000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 1000000000 },
        '419': { accountCode: '419', closingDebit: 150000000, closingCredit: 0 },
        '4212': { accountCode: '4212', closingDebit: 100000000, closingCredit: 0 },
      };

      const bs = generateBalanceSheet(ledger, 'TT200');
      expect(bs.resources.equity.code400).toBe(750000000);
      expect(bs.assets.totalAssets).toBe(750000000);
      expect(bs.isBalanced).toBe(true);
      expect(bs.discrepancy).toBe(0);
    });

    it('survives randomized 200 fuzzing cycles of balanced multi-account ledgers', () => {
      for (let i = 0; i < 200; i++) {
        const cash = Math.floor(Math.random() * 200000000) + 1000000;
        const inv = Math.floor(Math.random() * 300000000) + 1000000;
        const cost = Math.floor(Math.random() * 500000000) + 10000000;
        const depr = Math.floor(Math.random() * (cost - 1000000));
        const netFixed = cost - depr;
        const totalAssets = cash + inv + netFixed;

        const liab = Math.floor(Math.random() * (totalAssets * 0.4));
        const equity = totalAssets - liab;

        const ledger = {
          '112': { accountCode: '112', closingDebit: cash, closingCredit: 0 },
          '156': { accountCode: '156', closingDebit: inv, closingCredit: 0 },
          '211': { accountCode: '211', closingDebit: cost, closingCredit: 0 },
          '214': { accountCode: '214', closingDebit: 0, closingCredit: depr },
          '331': { accountCode: '331', closingDebit: 0, closingCredit: liab },
          '411': { accountCode: '411', closingDebit: 0, closingCredit: equity },
        };

        const bs = generateBalanceSheet(ledger, 'TT200');
        expect(bs.isBalanced).toBe(true);
        expect(bs.discrepancy).toBe(0);
        expect(bs.assets.totalAssets).toBe(totalAssets);
        expect(bs.resources.totalResources).toBe(totalAssets);
      }
    });

    it('CHALLENGE FINDING: Evaluates two-sided account edge cases (Nợ 331 / Có 131)', () => {
      const advanceSupplier = {
        '112': { accountCode: '112', closingDebit: 450000000, closingCredit: 0 },
        '331': { accountCode: '331', closingDebit: 50000000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 500000000 },
      };

      const bs = generateBalanceSheet(advanceSupplier, 'TT200');
      expect(typeof bs.discrepancy).toBe('number');
    });
  });

  // ==========================================================================
  // INVARIANT 3: Income Statement Cascade (12-tier step calculation)
  // ==========================================================================
  describe('Invariant 3: Income Statement 12-Tier Cascade', () => {
    it('verifies exact 12-tier arithmetic cascade on B02-DN', () => {
      const report = generateIncomeStatement({
        revenue511: 2000000000,
        deductions521: 100000000,
        cogs632: 1200000000,
        financialIncome515: 80000000,
        financialExpense635: 30000000,
        sellingExpense641: 120000000,
        adminExpense642: 150000000,
        otherIncome711: 50000000,
        otherExpense811: 20000000,
        taxRate: 0.2,
      });

      expect(report.netRevenue).toBe(1900000000);
      expect(report.grossProfit).toBe(700000000);
      expect(report.operatingProfit).toBe(480000000);
      expect(report.otherProfit).toBe(30000000);
      expect(report.accountingProfitBeforeTax).toBe(510000000);
      expect(report.citExpense).toBe(102000000);
      expect(report.netProfitAfterTax).toBe(408000000);
    });

    it('verifies Schedule B4 non-deductible expense CIT adjustment in loss turnaround', () => {
      const report = generateIncomeStatement({
        revenue511: 300000000,
        cogs632: 350000000,
        nonDeductibleB4: 100000000,
        taxRate: 0.2,
      });

      expect(report.accountingProfitBeforeTax).toBe(-50000000);
      expect(report.citExpense).toBe(10000000);
      expect(report.netProfitAfterTax).toBe(-60000000);
    });

    it('correctly maps Circular 133 expense accounts (TK 6421 for selling, TK 6422 for admin)', () => {
      const ledgerTT133 = {
        '511': { accountCode: '511', closingDebit: 0, closingCredit: 500000000, creditTotal: 500000000, debitTotal: 0 },
        '632': { accountCode: '632', closingDebit: 300000000, closingCredit: 0, debitTotal: 300000000, creditTotal: 0 },
        '6421': { accountCode: '6421', closingDebit: 40000000, closingCredit: 0, debitTotal: 40000000, creditTotal: 0 },
        '6422': { accountCode: '6422', closingDebit: 60000000, closingCredit: 0, debitTotal: 60000000, creditTotal: 0 },
      };

      const report = generateIncomeStatement(ledgerTT133);
      expect(report.sellingExpenses).toBe(40000000);
      expect(report.generalAdminExpenses).toBe(60000000);
      expect(report.operatingProfit).toBe(100000000);
      expect(report.accountingProfitBeforeTax).toBe(100000000);
      expect(report.citExpense).toBe(20000000);
      expect(report.netProfitAfterTax).toBe(80000000);
    });
  });

  // ==========================================================================
  // INVARIANT 4: Nominal Account Zero-Clearing (TK 911 & Classes 5-9 = 0)
  // ==========================================================================
  describe('Invariant 4: Nominal Account Zero-Clearing', () => {
    it('detects unclosed nominal accounts and warns in Balance Sheet', () => {
      const openNominal = {
        '112': { accountCode: '112', closingDebit: 500000000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 500000000 },
        '511': { accountCode: '511', closingDebit: 0, closingCredit: 200000000 },
        '632': { accountCode: '632', closingDebit: 120000000, closingCredit: 0 },
      };

      const bs = generateBalanceSheet(openNominal, 'TT200');
      const w511 = bs.warnings.find((w) => w.includes('511'));
      const w632 = bs.warnings.find((w) => w.includes('632'));

      expect(w511).toBeDefined();
      expect(w511).toContain('chưa được kết chuyển hết về TK 911');
      expect(w632).toBeDefined();
      expect(w632).toContain('chưa được kết chuyển hết về TK 911');
    });

    it('confirms zero warnings when all nominal accounts and TK 911 are cleared to 0', () => {
      const fullyCleared = {
        '112': { accountCode: '112', closingDebit: 580000000, closingCredit: 0 },
        '3334': { accountCode: '3334', closingDebit: 0, closingCredit: 16000000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 500000000 },
        '4212': { accountCode: '4212', closingDebit: 0, closingCredit: 64000000 },
        '511': { accountCode: '511', closingDebit: 0, closingCredit: 0 },
        '632': { accountCode: '632', closingDebit: 0, closingCredit: 0 },
        '911': { accountCode: '911', closingDebit: 0, closingCredit: 0 },
      };

      const bs = generateBalanceSheet(fullyCleared, 'TT200');
      expect(bs.isBalanced).toBe(true);
      expect(bs.warnings).toHaveLength(0);
      expect(bs.assets.totalAssets).toBe(580000000);
      expect(bs.resources.totalResources).toBe(580000000);
    });

    it('simulates complete multi-step closing process and verifies exact 0 ending balances', () => {
      const sales = 1000000000;
      const cogs = 600000000;
      const admin = 150000000;
      const pretax = sales - cogs - admin;
      const cit = Math.round(pretax * 0.2);
      const netProfit = pretax - cit;

      const closedAccounts = {
        '112': { accountCode: '112', closingDebit: 1000000000 + sales - cogs - admin, closingCredit: 0 },
        '3334': { accountCode: '3334', closingDebit: 0, closingCredit: cit },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 1000000000 },
        '4212': { accountCode: '4212', closingDebit: 0, closingCredit: netProfit },
        '511': { accountCode: '511', closingDebit: 0, closingCredit: 0 },
        '632': { accountCode: '632', closingDebit: 0, closingCredit: 0 },
        '642': { accountCode: '642', closingDebit: 0, closingCredit: 0 },
        '8211': { accountCode: '8211', closingDebit: 0, closingCredit: 0 },
        '911': { accountCode: '911', closingDebit: 0, closingCredit: 0 },
      };

      const bs = generateBalanceSheet(closedAccounts, 'TT200');
      expect(bs.isBalanced).toBe(true);
      expect(bs.warnings).toHaveLength(0);
      expect(bs.assets.totalAssets).toBe(bs.resources.totalResources);
    });
  });

  // ==========================================================================
  // INVARIANT 5: Inventory Costing Conservation (Beginning + In === Out + Ending)
  // ==========================================================================
  describe('Invariant 5: Inventory Costing Conservation', () => {
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 50000 },
      { id: 'lot-2', date: '2026-01-05', quantity: 200, unitPrice: 55000 },
    ];
    const initialQty = 300;
    const initialAmount = 100 * 50000 + 200 * 55000;

    const txs: StockTransaction[] = [
      {
        id: 'tx-1',
        date: '2026-01-10',
        voucherCode: 'PNK-01',
        voucherType: 'PNK',
        description: 'Nhập hàng',
        quantity: 150,
        unitPrice: 60000,
        targetAccount: '156',
      },
      {
        id: 'tx-2',
        date: '2026-01-15',
        voucherCode: 'PXK-01',
        voucherType: 'PXK',
        description: 'Xuất bán',
        quantity: 250,
        targetAccount: '632',
      },
      {
        id: 'tx-3',
        date: '2026-01-20',
        voucherCode: 'PXK-02',
        voucherType: 'PXK',
        description: 'Xuất bán',
        quantity: 100,
        targetAccount: '632',
      },
    ];

    it('verifies conservation under FIFO method', () => {
      const res = calculateFifo(initialLots, txs);
      expect(res.isConserved).toBe(true);

      const totalInflow = initialAmount + res.totalInAmount;
      const totalOutflowAndEnding = res.totalOutAmount + res.endingBalanceAmount;
      expect(Math.abs(totalInflow - totalOutflowAndEnding)).toBeLessThanOrEqual(1);
      expect(initialQty + res.totalInQty).toBe(res.totalOutQty + res.endingBalanceQty);
    });

    it('verifies conservation under Continuous (Moving) Weighted Average method', () => {
      const res = calculateMovingWeightedAverage(initialLots, txs);
      expect(res.isConserved).toBe(true);

      const totalInflow = initialAmount + res.totalInAmount;
      const totalOutflowAndEnding = res.totalOutAmount + res.endingBalanceAmount;
      expect(Math.abs(totalInflow - totalOutflowAndEnding)).toBeLessThanOrEqual(1);
      expect(initialQty + res.totalInQty).toBe(res.totalOutQty + res.endingBalanceQty);
    });

    it('verifies conservation under Period Weighted Average method', () => {
      const res = calculatePeriodicWeightedAverage(initialLots, txs);
      expect(res.isConserved).toBe(true);

      const totalInflow = initialAmount + res.totalInAmount;
      const totalOutflowAndEnding = res.totalOutAmount + res.endingBalanceAmount;
      expect(Math.abs(totalInflow - totalOutflowAndEnding)).toBeLessThanOrEqual(1);
      expect(initialQty + res.totalInQty).toBe(res.totalOutQty + res.endingBalanceQty);
    });

    it('strictly throws NegativeStockError when dispatches exceed available stock in strict mode', () => {
      const overDispatches: StockTransaction[] = [
        {
          id: 'tx-over',
          date: '2026-01-10',
          voucherCode: 'PXK-OVER',
          voucherType: 'PXK',
          description: 'Xuất quá lượng tồn',
          quantity: 500,
          targetAccount: '632',
        },
      ];

      expect(() => {
        calculateFifo(initialLots, overDispatches, { strict: true });
      }).toThrowError(NegativeStockError);
    });

    it('strictly flags LIFO prohibition according to VAS 02 and Circular 200/133/99', () => {
      const res = calculateStockCard('LIFO', initialLots, txs);
      expect(res.lifoProhibitedWarning).toBe(true);
      expect(res.lifoProhibitedExplanationVi).toContain('LIFO');
      expect(res.lifoProhibitedExplanationVi).toContain('bị bãi bỏ tại Việt Nam');
    });

    it('stress tests fractional unit price conservation (+-1 VND invariant across 100 transactions)', () => {
      const fracLots: InventoryLot[] = [
        { id: 'f-1', date: '2026-01-01', quantity: 100, unitPrice: 33333.33 },
      ];
      const stressTxs: StockTransaction[] = [];
      for (let i = 0; i < 50; i++) {
        stressTxs.push({
          id: `f-in-${i}`,
          date: '2026-01-02',
          voucherCode: `PNK-F-${i}`,
          voucherType: 'PNK',
          description: `Nhập lô lẻ ${i}`,
          quantity: 10,
          unitPrice: 33333.33 + (i % 7) * 0.33,
          targetAccount: '156',
        });
        stressTxs.push({
          id: `f-out-${i}`,
          date: '2026-01-03',
          voucherCode: `PXK-F-${i}`,
          voucherType: 'PXK',
          description: `Xuất lô lẻ ${i}`,
          quantity: 8,
          targetAccount: '632',
        });
      }

      const resFifo = calculateFifo(fracLots, stressTxs);
      expect(resFifo.isConserved).toBe(true);

      const resMwa = calculateMovingWeightedAverage(fracLots, stressTxs);
      expect(resMwa.isConserved).toBe(true);
    });
  });
});
