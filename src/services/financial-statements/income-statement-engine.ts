/**
 * Income Statement Engine (B02-DN / B02-DNN)
 * Computes 12-item multi-step cascade from Net Revenue to Net Profit After Tax.
 *
 * Cascade Steps:
 * Gross Revenue (01) -> Deductions (02) -> Net Revenue (10) -> COGS (11) -> Gross Profit (20) ->
 * Financial Income (21) -> Financial Expense (22) -> Selling Expense (25) -> Admin Expense (26) ->
 * Operating Profit (30) -> Other Income (31) -> Other Expense (32) -> Other Profit (40) ->
 * Pre-tax Profit (50) -> Current CIT (51) -> Net Profit After Tax (60).
 */

import { extractLedgerBalances } from './balance-sheet-engine';
import { ScheduleB4Item, calculateCitScheduleB4 } from '../tax/tax-guardrails';

export type { ScheduleB4Item };
export { calculateCitScheduleB4 };

export interface IncomeStatementItem {
  itemCode: string;
  itemNameVi: string;
  formulaDescriptionVi: string;
  currentPeriodAmount: number;
  previousPeriodAmount?: number;
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
  items?: IncomeStatementItem[];
}

export interface RevenueExpenseAmounts {
  revenue511?: number;
  grossRevenue?: number;
  deductions521?: number;
  revenueDeductions?: number;
  cogs632?: number;
  costOfGoodsSold?: number;
  financialIncome515?: number;
  financialIncome?: number;
  financialExpense635?: number;
  financialExpenses?: number;
  sellingExpense641?: number;
  sellingExpenses?: number;
  adminExpense642?: number;
  generalAdminExpenses?: number;
  otherIncome711?: number;
  otherIncome?: number;
  otherExpense811?: number;
  otherExpenses?: number;
  citExpense?: number;
  nonDeductibleB4?: number;
  disallowedExpenses?: ScheduleB4Item[];
  taxRate?: number;
}

/**
 * Generates B02-DN Income Statement cascade report.
 *
 * @param ledgerAccounts Either direct revenue/expense amount dictionary or ledger account balances map
 * @param period Reporting period string (default: 'Năm 2026')
 */
export function generateIncomeStatement(
  ledgerAccounts: Record<string, any>,
  period: string = 'Năm 2026'
): IncomeStatementReport {
  let grossRevenue = 0;
  let revenueDeductions = 0;
  let costOfGoodsSold = 0;
  let financialIncome = 0;
  let financialExpenses = 0;
  let sellingExpenses = 0;
  let generalAdminExpenses = 0;
  let otherIncome = 0;
  let otherExpenses = 0;
  let explicitCitExpense: number | undefined = undefined;
  let nonDeductibleB4 = 0;
  let taxRate = 0.2;

  // Check if ledgerAccounts is directly an amounts object
  const isDirectAmounts =
    ledgerAccounts &&
    (ledgerAccounts.revenue511 !== undefined ||
      ledgerAccounts.grossRevenue !== undefined ||
      ledgerAccounts.cogs632 !== undefined ||
      ledgerAccounts.costOfGoodsSold !== undefined ||
      ledgerAccounts.sellingExpense641 !== undefined ||
      ledgerAccounts.adminExpense642 !== undefined);

  if (isDirectAmounts) {
    const d = ledgerAccounts as RevenueExpenseAmounts;
    grossRevenue = d.revenue511 ?? d.grossRevenue ?? 0;
    revenueDeductions = d.deductions521 ?? d.revenueDeductions ?? 0;
    costOfGoodsSold = d.cogs632 ?? d.costOfGoodsSold ?? 0;
    financialIncome = d.financialIncome515 ?? d.financialIncome ?? 0;
    financialExpenses = d.financialExpense635 ?? d.financialExpenses ?? 0;
    sellingExpenses = d.sellingExpense641 ?? d.sellingExpenses ?? 0;
    generalAdminExpenses = d.adminExpense642 ?? d.generalAdminExpenses ?? 0;
    otherIncome = d.otherIncome711 ?? d.otherIncome ?? 0;
    otherExpenses = d.otherExpense811 ?? d.otherExpenses ?? 0;
    explicitCitExpense = d.citExpense;
    if (d.nonDeductibleB4 !== undefined) {
      nonDeductibleB4 = d.nonDeductibleB4;
    } else if (d.disallowedExpenses && d.disallowedExpenses.length > 0) {
      nonDeductibleB4 = calculateCitScheduleB4(0, d.disallowedExpenses).totalB4Disallowed;
    } else {
      nonDeductibleB4 = 0;
    }
    taxRate = d.taxRate ?? 0.2;
  } else {
    // Extract turnover and balances from ledger accounts
    const balanceMap = extractLedgerBalances(ledgerAccounts);

    for (const [code, bal] of balanceMap.entries()) {
      if (code.startsWith('511')) {
        grossRevenue += Math.max(bal.creditTotal, bal.closingCredit);
      } else if (code.startsWith('521')) {
        revenueDeductions += Math.max(bal.debitTotal, bal.closingDebit);
      } else if (code.startsWith('632')) {
        costOfGoodsSold += Math.max(bal.debitTotal, bal.closingDebit);
      } else if (code.startsWith('515')) {
        financialIncome += Math.max(bal.creditTotal, bal.closingCredit);
      } else if (code.startsWith('635')) {
        financialExpenses += Math.max(bal.debitTotal, bal.closingDebit);
      } else if (code === '641' || code.startsWith('641') || code === '6421' || code.startsWith('6421')) {
        sellingExpenses += Math.max(bal.debitTotal, bal.closingDebit);
      } else if (code === '642' || code.startsWith('6422') || (code.startsWith('642') && !code.startsWith('6421'))) {
        generalAdminExpenses += Math.max(bal.debitTotal, bal.closingDebit);
      } else if (code.startsWith('711')) {
        otherIncome += Math.max(bal.creditTotal, bal.closingCredit);
      } else if (code.startsWith('811')) {
        otherExpenses += Math.max(bal.debitTotal, bal.closingDebit);
      } else if (code.startsWith('821') || code.startsWith('8211')) {
        const cit = Math.max(bal.debitTotal, bal.closingDebit);
        if (cit > 0) explicitCitExpense = cit;
      }
    }

    if (ledgerAccounts?.nonDeductibleB4 !== undefined) {
      nonDeductibleB4 = Number(ledgerAccounts.nonDeductibleB4) || 0;
    } else if (ledgerAccounts?.disallowedExpenses && Array.isArray(ledgerAccounts.disallowedExpenses)) {
      nonDeductibleB4 = calculateCitScheduleB4(0, ledgerAccounts.disallowedExpenses).totalB4Disallowed;
    }
    if (ledgerAccounts?.taxRate !== undefined) {
      taxRate = Number(ledgerAccounts.taxRate) || 0.2;
    }
  }

  // Multi-step cascade calculations
  const netRevenue = grossRevenue - revenueDeductions; // Mã 10 = 01 - 02
  const grossProfit = netRevenue - costOfGoodsSold; // Mã 20 = 10 - 11
  const operatingProfit =
    grossProfit + financialIncome - financialExpenses - sellingExpenses - generalAdminExpenses; // Mã 30
  const otherProfit = otherIncome - otherExpenses; // Mã 40 = 31 - 32
  const accountingProfitBeforeTax = operatingProfit + otherProfit; // Mã 50 = 30 + 40

  // CIT Calculation
  let citExpense = 0;
  if (explicitCitExpense !== undefined) {
    citExpense = explicitCitExpense;
  } else {
    const taxableIncome = Math.max(0, accountingProfitBeforeTax + nonDeductibleB4);
    citExpense = Math.round(taxableIncome * taxRate);
  }

  const netProfitAfterTax = accountingProfitBeforeTax - citExpense; // Mã 60 = 50 - 51

  // Detailed items for table presentation
  const items: IncomeStatementItem[] = [
    {
      itemCode: '01',
      itemNameVi: '1. Doanh thu bán hàng và cung cấp dịch vụ',
      formulaDescriptionVi: 'Số phát sinh Có TK 511',
      currentPeriodAmount: grossRevenue,
    },
    {
      itemCode: '02',
      itemNameVi: '2. Các khoản giảm trừ doanh thu',
      formulaDescriptionVi: 'Số phát sinh Có TK 521 (TT200) hoặc Nợ TK 511 (TT133)',
      currentPeriodAmount: revenueDeductions,
    },
    {
      itemCode: '10',
      itemNameVi: '3. Doanh thu thuần về bán hàng và CCDV (Mã 10 = 01 - 02)',
      formulaDescriptionVi: 'Mã 01 - Mã 02',
      currentPeriodAmount: netRevenue,
    },
    {
      itemCode: '11',
      itemNameVi: '4. Giá vốn hàng bán',
      formulaDescriptionVi: 'Số phát sinh Nợ TK 632',
      currentPeriodAmount: costOfGoodsSold,
    },
    {
      itemCode: '20',
      itemNameVi: '5. Lợi nhuận gộp về bán hàng và CCDV (Mã 20 = 10 - 11)',
      formulaDescriptionVi: 'Mã 10 - Mã 11',
      currentPeriodAmount: grossProfit,
    },
    {
      itemCode: '21',
      itemNameVi: '6. Doanh thu hoạt động tài chính',
      formulaDescriptionVi: 'Số phát sinh Có TK 515',
      currentPeriodAmount: financialIncome,
    },
    {
      itemCode: '22',
      itemNameVi: '7. Chi phí tài chính',
      formulaDescriptionVi: 'Số phát sinh Nợ TK 635',
      currentPeriodAmount: financialExpenses,
    },
    {
      itemCode: '25',
      itemNameVi: '8. Chi phí bán hàng',
      formulaDescriptionVi: 'Số phát sinh Nợ TK 641 (TT200) hoặc TK 6421 (TT133)',
      currentPeriodAmount: sellingExpenses,
    },
    {
      itemCode: '26',
      itemNameVi: '9. Chi phí quản lý doanh nghiệp',
      formulaDescriptionVi: 'Số phát sinh Nợ TK 642 (TT200) hoặc TK 6422 (TT133)',
      currentPeriodAmount: generalAdminExpenses,
    },
    {
      itemCode: '30',
      itemNameVi: '10. Lợi nhuận thuần từ HĐKD (Mã 30 = 20 + 21 - 22 - 25 - 26)',
      formulaDescriptionVi: 'Mã 20 + (Mã 21 - Mã 22) - (Mã 25 + Mã 26)',
      currentPeriodAmount: operatingProfit,
    },
    {
      itemCode: '31',
      itemNameVi: '11. Thu nhập khác',
      formulaDescriptionVi: 'Số phát sinh Có TK 711',
      currentPeriodAmount: otherIncome,
    },
    {
      itemCode: '32',
      itemNameVi: '12. Chi phí khác',
      formulaDescriptionVi: 'Số phát sinh Nợ TK 811',
      currentPeriodAmount: otherExpenses,
    },
    {
      itemCode: '40',
      itemNameVi: '13. Lợi nhuận khác (Mã 40 = 31 - 32)',
      formulaDescriptionVi: 'Mã 31 - Mã 32',
      currentPeriodAmount: otherProfit,
    },
    {
      itemCode: '50',
      itemNameVi: '14. Tổng lợi nhuận kế toán trước thuế (Mã 50 = 30 + 40)',
      formulaDescriptionVi: 'Mã 30 + Mã 40',
      currentPeriodAmount: accountingProfitBeforeTax,
    },
    {
      itemCode: '51',
      itemNameVi: '15. Chi phí thuế TNDN hiện hành',
      formulaDescriptionVi: 'Thu nhập tính thuế x 20% (TK 8211/821)',
      currentPeriodAmount: citExpense,
    },
    {
      itemCode: '60',
      itemNameVi: '16. Lợi nhuận sau thuế TNDN (Mã 60 = 50 - 51)',
      formulaDescriptionVi: 'Mã 50 - Mã 51',
      currentPeriodAmount: netProfitAfterTax,
    },
  ];

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
    items,
  };
}
