/**
 * E2E CONTRACTS & REFERENCE DOMAIN ENGINES
 * Authoritative specifications derived from:
 * - D:/myproject/.agents/orchestrator_vietnam_accounting_2/PROJECT.md
 * - D:/myproject/.agents/orchestrator_vietnam_accounting_2/TEST_INFRA.md
 * - D:/myproject/.agents/spec_miner_survey_3/spec_report.md
 * - Circular 200/2014/TT-BTC, Circular 133/2016/TT-BTC, Circular 219/2013/TT-BTC, Circular 96/2015/TT-BTC
 */

import { AccountingRegime } from '@/types/coa';
import { JournalEntryRow } from '@/types/workbench';

// ============================================================================
// 1. Socratic Hint Ladder Interfaces & Reference Engine (F2)
// ============================================================================

export interface SocraticHint {
  level: 1 | 2 | 3;
  title: string;
  content: string;
  suggestedAccountGroups?: string[]; // Level 1
  reflectiveQuestions?: string[];     // Level 2
  twinCase?: {                        // Level 3
    scenario: string;
    sampleJournal: Array<{
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
    }>;
    explanation: string;
  };
}

export interface SocraticScenario {
  id: string;
  titleVi: string;
  regime: AccountingRegime;
  targetAccountCodes: string[];
  hints: {
    level1: SocraticHint;
    level2: SocraticHint;
    level3: SocraticHint;
  };
}

export class SocraticEngine {
  private static scenarios: Map<string, SocraticScenario> = new Map();

  static registerScenario(scenario: SocraticScenario) {
    this.scenarios.set(scenario.id, scenario);
  }

  static getHint(scenarioId: string, level: number, currentUnlockedLevel: number = 1): SocraticHint | null {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return null;

    // Enforce graduated stepping: Cannot access level > currentUnlockedLevel
    if (level < 1 || level > 3 || level > currentUnlockedLevel) {
      return null;
    }

    if (level === 1) return scenario.hints.level1;
    if (level === 2) return scenario.hints.level2;
    if (level === 3) return scenario.hints.level3;
    return null;
  }

  static advanceLevel(currentLevel: number): number {
    return Math.min(3, Math.max(1, currentLevel + 1));
  }

  static validateTwinCase(twinCase: NonNullable<SocraticHint['twinCase']>): { isValid: boolean; error?: string } {
    if (!twinCase.sampleJournal || twinCase.sampleJournal.length < 2) {
      return { isValid: false, error: 'Twin case journal must have at least 2 rows' };
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const row of twinCase.sampleJournal) {
      if (row.debit < 0 || row.credit < 0) {
        return { isValid: false, error: 'Journal amounts must not be negative' };
      }
      totalDebit += row.debit;
      totalCredit += row.credit;
    }

    const delta = Math.abs(Math.round(totalDebit) - Math.round(totalCredit));
    if (delta !== 0 || totalDebit === 0) {
      return { isValid: false, error: `Twin case journal unbalanced: Debit=${totalDebit}, Credit=${totalCredit}` };
    }

    return { isValid: true };
  }
}

// ============================================================================
// 2. Financial Statements (B01-DN & B02-DN) Interfaces & Reference Engine (F4)
// ============================================================================

export interface BalanceSheetReport {
  asOfDate: string;
  circular: 'TT200' | 'TT133';
  assets: {
    shortTerm: { code100: number; items: Record<string, number> };
    longTerm: { code200: number; items: Record<string, number> };
    totalAssets: number; // Mã số 270 = code100 + code200
  };
  resources: {
    liabilities: { code300: number; items: Record<string, number> };
    equity: { code400: number; items: Record<string, number> };
    totalResources: number; // Mã số 440 = code300 + code400
  };
  isBalanced: boolean; // Mã 270 === Mã 440
  discrepancy: number; // |Mã 270 - Mã 440|
  warnings: string[];
}

export interface IncomeStatementReport {
  period: string;
  grossRevenue: number;         // Mã 01
  revenueDeductions: number;    // Mã 02
  netRevenue: number;           // Mã 10 = 01 - 02
  costOfGoodsSold: number;      // Mã 11
  grossProfit: number;          // Mã 20 = 10 - 11
  financialIncome: number;      // Mã 21
  financialExpenses: number;    // Mã 22
  sellingExpenses: number;      // Mã 25
  generalAdminExpenses: number; // Mã 26
  operatingProfit: number;      // Mã 30 = 20 + 21 - 22 - 25 - 26
  otherIncome: number;          // Mã 31
  otherExpenses: number;        // Mã 32
  otherProfit: number;          // Mã 40 = 31 - 32
  accountingProfitBeforeTax: number; // Mã 50 = 30 + 40
  citExpense: number;           // Mã 51
  netProfitAfterTax: number;    // Mã 60 = 50 - 51
}

export interface LedgerAccountBalance {
  accountCode: string;
  accountNameVi: string;
  debitTotal: number;
  creditTotal: number;
  closingDebit: number;
  closingCredit: number;
}

export class FinancialStatementsEngine {
  /**
   * Generates B01-DN Balance Sheet from ledger account balances.
   * Enforces mathematical invariant: Mã 270 = Mã 300 + Mã 400.
   */
  static generateBalanceSheet(
    balances: Record<string, LedgerAccountBalance>,
    circular: 'TT200' | 'TT133' = 'TT200',
    asOfDate: string = '2026-12-31'
  ): BalanceSheetReport {
    const shortTermItems: Record<string, number> = {};
    const longTermItems: Record<string, number> = {};
    const liabilitiesItems: Record<string, number> = {};
    const equityItems: Record<string, number> = {};
    const warnings: string[] = [];

    // Short-Term Assets (Mã 100)
    // 110 Tiền: 111, 112, (113)
    const cash = (balances['111']?.closingDebit || 0) + (balances['112']?.closingDebit || 0) + (balances['113']?.closingDebit || 0);
    shortTermItems['110'] = cash;

    // 130 Phải thu ngắn hạn: 131, 138 - 2293 (dự phòng ghi âm)
    const receivables = (balances['131']?.closingDebit || 0) + (balances['138']?.closingDebit || 0);
    const allowanceReceivables = balances['2293']?.closingCredit || 0;
    shortTermItems['130'] = receivables - allowanceReceivables;

    // 140 Hàng tồn kho: 151..157 - 2294
    const inventory =
      (balances['151']?.closingDebit || 0) +
      (balances['152']?.closingDebit || 0) +
      (balances['153']?.closingDebit || 0) +
      (balances['154']?.closingDebit || 0) +
      (balances['155']?.closingDebit || 0) +
      (balances['156']?.closingDebit || 0) +
      (balances['157']?.closingDebit || 0);
    const allowanceInventory = balances['2294']?.closingCredit || 0;
    shortTermItems['140'] = inventory - allowanceInventory;

    // 150 Tài sản ngắn hạn khác: 133 (thuế GTGT được khấu trừ), 242 (ngắn hạn)
    const otherCurrentAssets = (balances['133']?.closingDebit || 0) + (balances['1331']?.closingDebit || 0);
    shortTermItems['150'] = otherCurrentAssets;

    const code100 = cash + (receivables - allowanceReceivables) + (inventory - allowanceInventory) + otherCurrentAssets;

    // Long-Term Assets (Mã 200)
    // 220 TSCĐ: 211, 212, 213 (nguyên giá) - 214 (hao mòn lũy kế ghi âm)
    const fixedAssetsCost = (balances['211']?.closingDebit || 0) + (balances['212']?.closingDebit || 0) + (balances['213']?.closingDebit || 0);
    const depreciation = balances['214']?.closingCredit || 0;
    longTermItems['221'] = fixedAssetsCost;
    longTermItems['223'] = -depreciation; // negative contra-asset
    longTermItems['220'] = fixedAssetsCost - depreciation;

    // 240 XDCB dở dang: 241
    const construction = balances['241']?.closingDebit || 0;
    longTermItems['240'] = construction;

    // 260 Tài sản dài hạn khác: 242 (dài hạn), 243
    const otherLongTerm = (balances['242']?.closingDebit || 0) + (balances['243']?.closingDebit || 0);
    longTermItems['260'] = otherLongTerm;

    const code200 = fixedAssetsCost - depreciation + construction + otherLongTerm;
    const totalAssets = code100 + code200; // Mã 270

    // Liabilities (Mã 300)
    // 310 Nợ ngắn hạn: 331, 333 (3331, 3334), 334, 335, 338, 341 (ngắn hạn)
    const payableSuppliers = balances['331']?.closingCredit || 0;
    const taxPayables = (balances['333']?.closingCredit || 0) + (balances['3331']?.closingCredit || 0) + (balances['3334']?.closingCredit || 0);
    const salaryPayables = balances['334']?.closingCredit || 0;
    const accruedExpenses = balances['335']?.closingCredit || 0;
    const otherPayables = (balances['338']?.closingCredit || 0) + (balances['341']?.closingCredit || 0);
    const code310 = payableSuppliers + taxPayables + salaryPayables + accruedExpenses + otherPayables;
    liabilitiesItems['310'] = code310;
    const code300 = code310; // Total liabilities

    // Equity (Mã 400)
    // 411 Vốn đầu tư của chủ sở hữu
    const charterCapital = balances['411']?.closingCredit || 0;
    equityItems['411'] = charterCapital;

    // 421 Lợi nhuận sau thuế chưa phân phối (4211 + 4212). If debit balance, it's negative!
    const profit4211 = (balances['4211']?.closingCredit || 0) - (balances['4211']?.closingDebit || 0);
    const profit4212 = (balances['4212']?.closingCredit || 0) - (balances['4212']?.closingDebit || 0);
    const undistributedProfit = profit4211 + profit4212;
    equityItems['421'] = undistributedProfit;

    const code400 = charterCapital + undistributedProfit;
    const totalResources = code300 + code400; // Mã 440

    // Check invariant: Mã 270 === Mã 440
    const discrepancy = Math.abs(Math.round(totalAssets) - Math.round(totalResources));
    const isBalanced = discrepancy === 0;

    if (!isBalanced) {
      warnings.push(
        `CẢNH BÁO MẤT CÂN ĐỐI BẢNG CÂN ĐỐI KẾ TOÁN: Tổng Tài sản (Mã 270: ${totalAssets.toLocaleString('vi-VN')} đ) lệch ${discrepancy.toLocaleString('vi-VN')} đ so với Tổng Nguồn vốn (Mã 440: ${totalResources.toLocaleString('vi-VN')} đ).`
      );
    }

    // Check if temporary accounts 5..9 still have closing balances
    for (const code of Object.keys(balances)) {
      if (/^[56789]/.test(code)) {
        const bal = balances[code];
        if (bal.closingDebit !== 0 || bal.closingCredit !== 0) {
          warnings.push(`Cảnh báo khóa sổ: Tài khoản tạm thời ${code} chưa được kết chuyển hết về TK 911 (số dư khác 0).`);
        }
      }
    }

    return {
      asOfDate,
      circular,
      assets: {
        shortTerm: { code100, items: shortTermItems },
        longTerm: { code200, items: longTermItems },
        totalAssets,
      },
      resources: {
        liabilities: { code300, items: liabilitiesItems },
        equity: { code400, items: equityItems },
        totalResources,
      },
      isBalanced,
      discrepancy,
      warnings,
    };
  }

  /**
   * Generates B02-DN Income Statement multi-step cascade.
   */
  static generateIncomeStatement(
    revenueExpenseAmounts: {
      revenue511: number;
      deductions521?: number; // TT200 only, in TT133 deductions directly debit 511
      cogs632: number;
      financialIncome515: number;
      financialExpense635: number;
      sellingExpense641: number; // In TT133: 6421
      adminExpense642: number;   // In TT133: 6422
      otherIncome711?: number;
      otherExpense811?: number;
      nonDeductibleB4?: number; // Schedule B4 adjustments (e.g. >=20M cash invoice, status 04 invoice)
      taxRate?: number; // Default 20%
    },
    period: string = 'Năm 2026'
  ): IncomeStatementReport {
    const grossRevenue = revenueExpenseAmounts.revenue511; // Mã 01
    const revenueDeductions = revenueExpenseAmounts.deductions521 || 0; // Mã 02
    const netRevenue = grossRevenue - revenueDeductions; // Mã 10 = 01 - 02
    const costOfGoodsSold = revenueExpenseAmounts.cogs632; // Mã 11
    const grossProfit = netRevenue - costOfGoodsSold; // Mã 20 = 10 - 11

    const financialIncome = revenueExpenseAmounts.financialIncome515; // Mã 21
    const financialExpenses = revenueExpenseAmounts.financialExpense635; // Mã 22
    const sellingExpenses = revenueExpenseAmounts.sellingExpense641; // Mã 25
    const generalAdminExpenses = revenueExpenseAmounts.adminExpense642; // Mã 26

    const operatingProfit = grossProfit + financialIncome - financialExpenses - sellingExpenses - generalAdminExpenses; // Mã 30

    const otherIncome = revenueExpenseAmounts.otherIncome711 || 0; // Mã 31
    const otherExpenses = revenueExpenseAmounts.otherExpense811 || 0; // Mã 32
    const otherProfit = otherIncome - otherExpenses; // Mã 40 = 31 - 32

    const accountingProfitBeforeTax = operatingProfit + otherProfit; // Mã 50 = 30 + 40

    // CIT Calculation with Schedule B4 adjustment
    const b4Adjustment = revenueExpenseAmounts.nonDeductibleB4 || 0;
    const taxableIncome = Math.max(0, accountingProfitBeforeTax + b4Adjustment);
    const taxRate = revenueExpenseAmounts.taxRate ?? 0.2; // 20% standard rate
    const citExpense = Math.round(taxableIncome * taxRate); // Mã 51

    const netProfitAfterTax = accountingProfitBeforeTax - citExpense; // Mã 60 = 50 - 51

    return {
      period,
      grossRevenue,
      revenueDeductions,
      netRevenue,
      costOfGoodsSold,
      grossProfit,
      financialIncome,
      financialExpenses,
      sellingExpenses,
      generalAdminExpenses,
      operatingProfit,
      otherIncome,
      otherExpenses,
      otherProfit,
      accountingProfitBeforeTax,
      citExpense,
      netProfitAfterTax,
    };
  }
}

// ============================================================================
// 3. Persistent Workbench State & PWA Offline Engine (F3)
// ============================================================================

export interface WorkbenchHistory {
  postedEntries: JournalEntryRow[];
  ledgerTAccounts: Record<string, LedgerAccountBalance>;
  voucherCompletedCases: string[];
}

export class WorkbenchStorageManager {
  static readonly STORAGE_KEY = 'workbench_state';

  static createDefaultState(): WorkbenchHistory {
    return {
      postedEntries: [],
      ledgerTAccounts: {},
      voucherCompletedCases: [],
    };
  }

  static postEntryToLedger(
    history: WorkbenchHistory,
    entry: JournalEntryRow[]
  ): WorkbenchHistory {
    const updatedEntries = [...history.postedEntries, ...entry];
    const updatedLedger = { ...history.ledgerTAccounts };

    for (const row of entry) {
      const code = row.accountCode;
      if (!updatedLedger[code]) {
        updatedLedger[code] = {
          accountCode: code,
          accountNameVi: row.accountNameVi,
          debitTotal: 0,
          creditTotal: 0,
          closingDebit: 0,
          closingCredit: 0,
        };
      }

      updatedLedger[code].debitTotal += row.debitAmount;
      updatedLedger[code].creditTotal += row.creditAmount;

      // Update closing balance according to natural balance
      const net = updatedLedger[code].debitTotal - updatedLedger[code].creditTotal;
      if (net >= 0) {
        updatedLedger[code].closingDebit = net;
        updatedLedger[code].closingCredit = 0;
      } else {
        updatedLedger[code].closingDebit = 0;
        updatedLedger[code].closingCredit = Math.abs(net);
      }
    }

    return {
      ...history,
      postedEntries: updatedEntries,
      ledgerTAccounts: updatedLedger,
    };
  }
}
