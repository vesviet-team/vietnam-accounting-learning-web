import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  generateBalanceSheet,
  formatCurrencyVnd,
  BalanceSheetReport,
} from '@/services/financial-statements';
import { FinancialStatementsView } from '@/components/workbench/FinancialStatementsView';

/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: B01-DN BALANCE SHEET INVARIANT & WARNINGS
 * Milestone 4 Challenge — Mathematical Invariant, Contra-Assets, Edge Cases
 * ============================================================================
 *
 * Attack Vectors:
 * 1. Deliberately Unbalanced Ledgers (No-credit debit, 1 VND deltas, trillion-scale delta).
 * 2. Contra-Asset Depreciation (TK 214 deduction vs addition, sub-accounts, over-depreciation).
 * 3. Extreme Boundary Cases (Empty ledger, null/undefined, all-zero, accumulated loss in TK 4212, contra-equity TK 419).
 * 4. Automated Randomized Fuzzing (100 balanced & 100 unbalanced randomized ledgers).
 * 5. UI Banner Diagnostics (Reactive styling, verbatim Vietnamese warning messages, discrepancy display).
 */

describe('ADVERSARIAL STRESS: B01-DN Balance Sheet Engine & UI Invariants', () => {
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

  // ==========================================================================
  // BATTERY 1: Deliberately Unbalanced Ledger & Discrepancy Diagnostics
  // ==========================================================================
  describe('Battery 1: Deliberately Unbalanced Ledger & Discrepancy Diagnostics', () => {
    it('detects single-sided debit of 100M VND to TK 112 with zero credits', () => {
      const unbalanced = {
        '112': { accountCode: '112', closingDebit: 100_000_000, closingCredit: 0 },
      };

      const report: BalanceSheetReport = generateBalanceSheet(unbalanced, 'TT200');

      expect(report.assets.totalAssets).toBe(100_000_000);
      expect(report.resources.totalResources).toBe(0);
      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(100_000_000);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('CẢNH BÁO MẤT CÂN ĐỐI BẢNG CÂN ĐỐI KẾ TOÁN');
      expect(report.warnings[0]).toContain('100.000.000 đ');
    });

    it('detects minimal 1 VND imbalance delta (Assets > Resources)', () => {
      const unbalanced1Vnd = {
        '112': { accountCode: '112', closingDebit: 100_000_001, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 100_000_000 },
      };

      const report = generateBalanceSheet(unbalanced1Vnd, 'TT200');

      expect(report.assets.totalAssets).toBe(100_000_001);
      expect(report.resources.totalResources).toBe(100_000_000);
      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(1);
      expect(report.warnings[0]).toContain('1 đ');
    });

    it('detects minimal 1 VND imbalance delta (Resources > Assets)', () => {
      const unbalanced1VndReverse = {
        '112': { accountCode: '112', closingDebit: 100_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 100_000_001 },
      };

      const report = generateBalanceSheet(unbalanced1VndReverse, 'TT200');

      expect(report.assets.totalAssets).toBe(100_000_000);
      expect(report.resources.totalResources).toBe(100_000_001);
      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(1);
      expect(report.warnings[0]).toContain('1 đ');
    });

    it('handles astronomical discrepancy (10 Trillion VNĐ delta)', () => {
      const hugeDiscrepancy = {
        '112': { accountCode: '112', closingDebit: 10_000_000_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 1_000_000_000 },
      };

      const report = generateBalanceSheet(hugeDiscrepancy, 'TT200');

      expect(report.isBalanced).toBe(false);
      expect(report.discrepancy).toBe(9_999_000_000_000);
      expect(report.warnings[0]).toContain('9.999.000.000.000 đ');
    });
  });

  // ==========================================================================
  // BATTERY 2: Contra-Asset Depreciation (TK 214) & Valuation Reserves
  // ==========================================================================
  describe('Battery 2: Contra-Asset Depreciation & Valuation Reserves Subtraction', () => {
    it('strictly subtracts TK 214 from Fixed Assets and prevents false addition bug', () => {
      // If TK 214 were erroneously added: Mã 270 = 500M + 150M = 650M != 350M (imbalance)
      // When correctly subtracted: Mã 270 = 500M - 150M = 350M === 350M (balanced!)
      const ledger = {
        '211': { accountCode: '211', closingDebit: 500_000_000, closingCredit: 0 },
        '214': { accountCode: '214', closingDebit: 0, closingCredit: 150_000_000 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 350_000_000 },
      };

      const report = generateBalanceSheet(ledger, 'TT200');

      expect(report.assets.longTerm.items['221']).toBe(500_000_000);
      expect(report.assets.longTerm.items['222']).toBe(-150_000_000);
      expect(report.assets.longTerm.code200).toBe(350_000_000);
      expect(report.assets.totalAssets).toBe(350_000_000);
      expect(report.resources.totalResources).toBe(350_000_000);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
    });

    it('correctly aggregates multiple sub-accounts of TK 214 (2141, 2142, 2143)', () => {
      const ledgerWithSubAccounts = {
        '211': { accountCode: '211', closingDebit: 1_000_000_000, closingCredit: 0 },
        '2141': { accountCode: '2141', closingDebit: 0, closingCredit: 120_000_000 }, // Tangible asset depreciation
        '2142': { accountCode: '2142', closingDebit: 0, closingCredit: 50_000_000 },  // Finance lease depreciation
        '2143': { accountCode: '2143', closingDebit: 0, closingCredit: 30_000_000 },  // Intangible asset amortization
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 800_000_000 },
      };

      const report = generateBalanceSheet(ledgerWithSubAccounts, 'TT200');

      // Total depreciation = 120M + 50M + 30M = 200M
      expect(report.assets.longTerm.items['222']).toBe(-200_000_000);
      expect(report.assets.longTerm.code200).toBe(800_000_000);
      expect(report.assets.totalAssets).toBe(800_000_000);
      expect(report.isBalanced).toBe(true);
    });

    it('handles fully depreciated fixed assets (100% depreciation, net book value = 0)', () => {
      const fullyDepreciated = {
        '211': { accountCode: '211', closingDebit: 250_000_000, closingCredit: 0 },
        '214': { accountCode: '214', closingDebit: 0, closingCredit: 250_000_000 },
        '112': { accountCode: '112', closingDebit: 50_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 50_000_000 },
      };

      const report = generateBalanceSheet(fullyDepreciated, 'TT200');

      expect(report.assets.longTerm.items['220']).toBe(0);
      expect(report.assets.totalAssets).toBe(50_000_000);
      expect(report.resources.totalResources).toBe(50_000_000);
      expect(report.isBalanced).toBe(true);
    });

    it('deducts inventory reserve (TK 2294) and doubtful debt reserve (TK 2293) as contra-assets', () => {
      const ledgerWithReserves = {
        '131': { accountCode: '131', closingDebit: 200_000_000, closingCredit: 0 },
        '2293': { accountCode: '2293', closingDebit: 0, closingCredit: 40_000_000 }, // Provision for doubtful debts
        '156': { accountCode: '156', closingDebit: 300_000_000, closingCredit: 0 },
        '2294': { accountCode: '2294', closingDebit: 0, closingCredit: 60_000_000 }, // Provision for inventory devaluation
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 400_000_000 },
      };

      const report = generateBalanceSheet(ledgerWithReserves, 'TT200');

      // Net receivables: 200M - 40M = 160M
      expect(report.assets.shortTerm.items['130']).toBe(160_000_000);
      // Net inventory: 300M - 60M = 240M
      expect(report.assets.shortTerm.items['140']).toBe(240_000_000);
      // Total assets: 160M + 240M = 400M
      expect(report.assets.totalAssets).toBe(400_000_000);
      expect(report.resources.totalResources).toBe(400_000_000);
      expect(report.isBalanced).toBe(true);
    });
  });

  // ==========================================================================
  // BATTERY 3: Edge Cases: Empty, All-Zero, Null/Undefined, and Negative Values
  // ==========================================================================
  describe('Battery 3: Edge Cases: Empty, All-Zero, Null/Undefined, and Negative Balances', () => {
    it('gracefully processes empty ledger object without crash or NaN', () => {
      const report = generateBalanceSheet({}, 'TT200');

      expect(report.assets.totalAssets).toBe(0);
      expect(report.resources.totalResources).toBe(0);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
      expect(report.warnings).toEqual([]);
    });

    it('handles null and undefined input payloads safely', () => {
      const reportNull = generateBalanceSheet(null as any, 'TT200');
      expect(reportNull.assets.totalAssets).toBe(0);
      expect(reportNull.isBalanced).toBe(true);

      const reportUndefined = generateBalanceSheet(undefined as any, 'TT200');
      expect(reportUndefined.assets.totalAssets).toBe(0);
      expect(reportUndefined.isBalanced).toBe(true);
    });

    it('evaluates all-zero ledger balances without triggering false mismatch warnings', () => {
      const allZeroLedger = {
        '111': { accountCode: '111', closingDebit: 0, closingCredit: 0 },
        '112': { accountCode: '112', closingDebit: 0, closingCredit: 0 },
        '211': { accountCode: '211', closingDebit: 0, closingCredit: 0 },
        '331': { accountCode: '331', closingDebit: 0, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 0 },
      };

      const report = generateBalanceSheet(allZeroLedger, 'TT200');

      expect(report.assets.totalAssets).toBe(0);
      expect(report.resources.totalResources).toBe(0);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
      expect(report.warnings).toEqual([]);
    });

    it('properly reduces equity when accumulated loss (TK 4212 Debit) is present', () => {
      // Charter capital: 500M (credit 411)
      // Accumulated loss: 120M (debit 4212)
      // Net Equity: 500M - 120M = 380M
      // Assets: Cash 380M (debit 112)
      const ledgerWithLoss = {
        '112': { accountCode: '112', closingDebit: 380_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 500_000_000 },
        '4212': { accountCode: '4212', closingDebit: 120_000_000, closingCredit: 0 },
      };

      const report = generateBalanceSheet(ledgerWithLoss, 'TT200');

      expect(report.resources.equity.items['421']).toBe(-120_000_000);
      expect(report.resources.equity.code400).toBe(380_000_000);
      expect(report.resources.totalResources).toBe(380_000_000);
      expect(report.assets.totalAssets).toBe(380_000_000);
      expect(report.isBalanced).toBe(true);
      expect(report.discrepancy).toBe(0);
    });

    it('properly subtracts Treasury Shares (TK 419) from total equity', () => {
      // Charter capital: 600M (credit 411)
      // Treasury shares repurchased: 100M (debit 419)
      // Net Equity: 600M - 100M = 500M
      // Assets: Cash 500M (debit 112)
      const ledgerWithTreasury = {
        '112': { accountCode: '112', closingDebit: 500_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 600_000_000 },
        '419': { accountCode: '419', closingDebit: 100_000_000, closingCredit: 0 },
      };

      const report = generateBalanceSheet(ledgerWithTreasury, 'TT200');

      expect(report.resources.equity.items['419']).toBe(-100_000_000);
      expect(report.resources.equity.code400).toBe(500_000_000);
      expect(report.resources.totalResources).toBe(500_000_000);
      expect(report.assets.totalAssets).toBe(500_000_000);
      expect(report.isBalanced).toBe(true);
    });

    it('flags unclosed temporary accounts (Classes 5-9) with explicit warning messages', () => {
      const openNominalAccounts = {
        '112': { accountCode: '112', closingDebit: 200_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 200_000_000 },
        '511': { accountCode: '511', closingDebit: 0, closingCredit: 50_000_000 }, // Open revenue
        '642': { accountCode: '642', closingDebit: 10_000_000, closingCredit: 0 },  // Open expense
      };

      const report = generateBalanceSheet(openNominalAccounts, 'TT200');

      const warning511 = report.warnings.find((w) => w.includes('511'));
      const warning642 = report.warnings.find((w) => w.includes('642'));

      expect(warning511).toBeDefined();
      expect(warning511).toContain('chưa được kết chuyển hết về TK 911');
      expect(warning642).toBeDefined();
      expect(warning642).toContain('chưa được kết chuyển hết về TK 911');
    });
  });

  // ==========================================================================
  // BATTERY 4: Automated Randomized Fuzzing (100 Balanced & 100 Unbalanced Ledgers)
  // ==========================================================================
  describe('Battery 4: Automated Randomized Fuzzing & Stress Tests', () => {
    it('consistently verifies isBalanced === true for 100 randomized balanced ledgers', () => {
      for (let i = 0; i < 100; i++) {
        const cash = Math.floor(Math.random() * 500_000_000) + 1_000_000;
        const fixedCost = Math.floor(Math.random() * 800_000_000) + 100_000_000;
        const depreciation = Math.floor(Math.random() * (fixedCost - 10_000_000));
        const netFixed = fixedCost - depreciation;
        const totalAssets = cash + netFixed;

        // Split total assets into liabilities and equity
        const liabilities = Math.floor(Math.random() * (totalAssets / 2));
        const equity = totalAssets - liabilities;

        const ledger = {
          '112': { accountCode: '112', closingDebit: cash, closingCredit: 0 },
          '211': { accountCode: '211', closingDebit: fixedCost, closingCredit: 0 },
          '214': { accountCode: '214', closingDebit: 0, closingCredit: depreciation },
          '331': { accountCode: '331', closingDebit: 0, closingCredit: liabilities },
          '411': { accountCode: '411', closingDebit: 0, closingCredit: equity },
        };

        const report = generateBalanceSheet(ledger, 'TT200');
        expect(report.isBalanced).toBe(true);
        expect(report.discrepancy).toBe(0);
        expect(report.assets.totalAssets).toBe(totalAssets);
        expect(report.resources.totalResources).toBe(totalAssets);
      }
    });

    it('consistently detects isBalanced === false for 100 randomized unbalanced ledgers with exact discrepancy', () => {
      for (let i = 0; i < 100; i++) {
        const cash = Math.floor(Math.random() * 300_000_000) + 10_000_000;
        const capital = cash; // Initially balanced
        // Introduce non-zero random delta from 1 to 50,000,000 VND
        const delta = (Math.floor(Math.random() * 50_000_000) + 1) * (Math.random() > 0.5 ? 1 : -1);
        const mutatedCash = cash + delta;

        const ledger = {
          '112': { accountCode: '112', closingDebit: mutatedCash, closingCredit: 0 },
          '411': { accountCode: '411', closingDebit: 0, closingCredit: capital },
        };

        const report = generateBalanceSheet(ledger, 'TT200');
        expect(report.isBalanced).toBe(false);
        expect(report.discrepancy).toBe(Math.abs(delta));
        expect(report.warnings.length).toBeGreaterThan(0);
        expect(report.warnings[0]).toContain(formatCurrencyVnd(Math.abs(delta)));
      }
    });
  });

  // ==========================================================================
  // BATTERY 5: UI Invariant Status & Warning Banner Rendering Stress
  // ==========================================================================
  describe('Battery 5: UI Invariant Status & Warning Banner Rendering', () => {
    it('renders prominent red warning banner when delta is exactly 1 VND', () => {
      const unbalanced1Vnd = {
        '112': { accountCode: '112', closingDebit: 200_000_001, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 200_000_000 },
      };

      render(<FinancialStatementsView initialLedger={unbalanced1Vnd} />);

      const banner = screen.getByTestId('invariant-banner');
      expect(banner.className).toContain('bg-rose-50');

      // Check verbatim message
      expect(
        screen.getByText(/CẢNH BÁO: Bảng Cân đối kế toán bị LỆCH 1 đ!/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Sai lệch kế toán kép Δ =/i)
      ).toBeDefined();
    });

    it('renders prominent red warning banner when ledger has 100M VND delta with no credit', () => {
      const unbalanced100M = {
        '112': { accountCode: '112', closingDebit: 100_000_000, closingCredit: 0 },
      };

      render(<FinancialStatementsView initialLedger={unbalanced100M} />);

      const banner = screen.getByTestId('invariant-banner');
      expect(banner.className).toContain('bg-rose-50');

      expect(
        screen.getByText(/CẢNH BÁO: Bảng Cân đối kế toán bị LỆCH 100\.000\.000 đ!/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Tổng Tài Sản: 100\.000\.000 đ != Nguồn Vốn: 0 đ/i)
      ).toBeDefined();
    });

    it('renders green balanced banner when ledger is balanced', () => {
      const balanced = {
        '112': { accountCode: '112', closingDebit: 300_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 300_000_000 },
      };

      render(<FinancialStatementsView initialLedger={balanced} />);

      const banner = screen.getByTestId('invariant-banner');
      expect(banner.className).toContain('bg-emerald-50');

      expect(
        screen.getByText(/Cân đối kế toán Tuyệt đối: Tổng Tài Sản \(Mã 270\) = Nguồn Vốn \(Mã 440\) = 300\.000\.000 đ/i)
      ).toBeDefined();
    });

    it('displays nominal account warning section in UI when temporary accounts are open', () => {
      const ledgerWithOpenNominal = {
        '112': { accountCode: '112', closingDebit: 100_000_000, closingCredit: 0 },
        '411': { accountCode: '411', closingDebit: 0, closingCredit: 100_000_000 },
        '642': { accountCode: '642', closingDebit: 25_000_000, closingCredit: 0 },
      };

      render(<FinancialStatementsView initialLedger={ledgerWithOpenNominal} />);

      expect(
        screen.getByText(/Cảnh báo khóa sổ tài khoản tạm thời \(Loại 5 - 9\):/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Tài khoản tạm thời 642 chưa được kết chuyển hết về TK 911/i)
      ).toBeDefined();
    });
  });
});
