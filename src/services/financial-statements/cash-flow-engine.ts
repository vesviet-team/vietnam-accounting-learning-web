/**
 * Cash Flow Statement Engine (Mẫu số B03-DN)
 * Indirect Method (Phương pháp gián tiếp) under VAS 24, Circular 200/2014/TT-BTC,
 * Circular 133/2016/TT-BTC & Circular 99/2025/TT-BTC.
 *
 * Mathematical Invariant:
 * Mã 50 (Lưu chuyển tiền thuần trong kỳ) = Mã 20 (HĐKD) + Mã 30 (HĐĐT) + Mã 40 (HĐTC)
 * Mã 70 (Tiền và tương đương tiền cuối kỳ) = Mã 50 + Mã 60 (Đầu kỳ) + Mã 61 (Ảnh hưởng tỷ giá)
 * Cross-statement Invariant: Mã 70 (B03-DN) ≡ Mã 110 (B01-DN)
 */

import { extractLedgerBalances, generateBalanceSheet } from './balance-sheet-engine';
import { generateIncomeStatement } from './income-statement-engine';

export interface CashFlowLineItem {
  itemCode: string;
  itemNameVi: string;
  section: 'OPERATING' | 'INVESTING' | 'FINANCING' | 'SUMMARY';
  formulaDescriptionVi: string;
  currentPeriodAmount: number;
  isSubtotal?: boolean;
}

export interface CashFlowReport {
  period: string;
  method: 'INDIRECT';
  operatingCashFlow: number; // Mã 20
  investingCashFlow: number; // Mã 30
  financingCashFlow: number; // Mã 40
  netCashFlowInPeriod: number; // Mã 50 = 20 + 30 + 40
  openingCashAndEquivalents: number; // Mã 60
  fxEffectOnCash: number; // Mã 61
  closingCashAndEquivalents: number; // Mã 70 = 50 + 60 + 61
  b01CashAndEquivalentsCode110: number; // Mã 110 trên B01-DN
  isReconciledWithB01: boolean; // Mã 70 === Mã 110
  reconciliationDiscrepancy: number; // |Mã 70 - Mã 110|
  items: CashFlowLineItem[];
}

export function generateCashFlowStatement(
  ledgerOrInput: Record<string, any> = {},
  period: string = 'Năm 2026'
): CashFlowReport {
  const balances = extractLedgerBalances(ledgerOrInput);
  // Always reconcile against the TT200 variant of B01-DN: TT99 inherits the TT200
  // account chart (identical math incl. TK 113 in Mã 110), and TT133 is not used here.
  // Changing this would break the Mã 70 ≡ Mã 110 reconciliation for no behavioral gain.
  const b01 = generateBalanceSheet(ledgerOrInput, 'TT200');
  const b02 = generateIncomeStatement(ledgerOrInput, period);

  const getClosingNet = (prefix: string, side: 'DEBIT' | 'CREDIT'): number => {
    let total = 0;
    for (const [code, acc] of balances.entries()) {
      if (code === prefix || code.startsWith(prefix)) {
        total += side === 'DEBIT' ? acc.closingDebit - acc.closingCredit : acc.closingCredit - acc.closingDebit;
      }
    }
    return total;
  };

  const getTurnover = (prefix: string, side: 'DEBIT' | 'CREDIT'): number => {
    let total = 0;
    for (const [code, acc] of balances.entries()) {
      if (code === prefix || code.startsWith(prefix)) {
        total += side === 'DEBIT' ? acc.debitTotal : acc.creditTotal;
      }
    }
    return total;
  };

  // I. Operating Activities (Indirect Method)
  const code01 = b02.accountingProfitBeforeTax; // Lợi nhuận trước thuế (Mã 50 B02-DN)
  const code02 = Math.max(0, getClosingNet('214', 'CREDIT')); // Khấu hao TSCĐ (TK 214)
  const code03 = Math.max(0, getClosingNet('229', 'CREDIT')) + Math.max(0, getClosingNet('352', 'CREDIT')); // Các khoản dự phòng
  const code04 = 0; // Lãi/lỗ chênh lệch tỷ giá chưa thực hiện
  const code05 = -Math.max(0, b02.financialIncome); // Lãi từ hoạt động đầu tư
  const code06 = Math.max(0, b02.financialExpenses); // Chi phí lãi vay
  const code08 = code01 + code02 + code03 + code04 + code05 + code06; // LN KD trước thay đổi VLĐ

  // Working capital changes (Increase in operating assets = cash outflow (-); Increase in operating liabilities = cash inflow (+))
  const receivablesIncrease =
    Math.max(0, getClosingNet('131', 'DEBIT')) +
    Math.max(0, getClosingNet('133', 'DEBIT')) +
    Math.max(0, getClosingNet('138', 'DEBIT'));
  const code09 = -receivablesIncrease; // Tăng, giảm các khoản phải thu

  const inventoryIncrease =
    Math.max(0, getClosingNet('152', 'DEBIT')) +
    Math.max(0, getClosingNet('153', 'DEBIT')) +
    Math.max(0, getClosingNet('154', 'DEBIT')) +
    Math.max(0, getClosingNet('155', 'DEBIT')) +
    Math.max(0, getClosingNet('156', 'DEBIT')) +
    Math.max(0, getClosingNet('157', 'DEBIT'));
  const code10 = -inventoryIncrease; // Tăng, giảm hàng tồn kho

  const payablesIncrease =
    Math.max(0, getClosingNet('331', 'CREDIT')) +
    Math.max(0, getClosingNet('333', 'CREDIT') - Math.max(0, getClosingNet('3334', 'CREDIT'))) +
    Math.max(0, getClosingNet('334', 'CREDIT')) +
    Math.max(0, getClosingNet('335', 'CREDIT')) +
    Math.max(0, getClosingNet('338', 'CREDIT'));
  const code11 = payablesIncrease; // Tăng, giảm các khoản phải trả (không kể lãi vay, thuế TNDN)

  const prepaidIncrease = Math.max(0, getClosingNet('242', 'DEBIT'));
  const code12 = -prepaidIncrease; // Tăng, giảm chi phí trả trước

  const code14 = -Math.max(0, code06); // Tiền lãi vay đã trả
  // CIT actually paid = CIT expense (TK 8211) minus unpaid CIT ending liability (TK 3334)
  const citLiabilityEnding = Math.max(0, getClosingNet('3334', 'CREDIT'));
  const citPaid = Math.max(0, b02.citExpense - citLiabilityEnding);
  const code15 = -citPaid; // Thuế TNDN đã nộp

  const code20 = code08 + code09 + code10 + code11 + code12 + code14 + code15;

  // II. Investing Activities
  const capexAdditions =
    Math.max(0, getClosingNet('211', 'DEBIT')) +
    Math.max(0, getClosingNet('213', 'DEBIT')) +
    Math.max(0, getClosingNet('241', 'DEBIT'));
  const code21 = -capexAdditions; // Tiền chi mua sắm, xây dựng TSCĐ
  const code22 = 0; // Tiền thu từ thanh lý, nhượng bán TSCĐ
  const code27 = Math.max(0, b02.financialIncome); // Tiền thu lãi cho vay, cổ tức
  const code30 = code21 + code22 + code27;

  // III. Financing Activities
  const equityContributed = Math.max(0, getClosingNet('411', 'CREDIT'));
  const code31 = equityContributed; // Tiền thu từ phát hành cổ phiếu, nhận vốn góp của CSH
  const borrowingsProceeds = Math.max(0, getTurnover('341', 'CREDIT'));
  const borrowingsRepaid = -Math.max(0, getTurnover('341', 'DEBIT'));
  const code33 = borrowingsProceeds; // Tiền thu từ đi vay
  const code34 = borrowingsRepaid; // Tiền trả nợ gốc vay
  const code36 = 0; // Cổ tức, lợi nhuận đã trả cho CSH
  const code40 = code31 + code33 + code34 + code36;

  // Summary & Reconciliation with B01-DN Code 110
  const code50 = code20 + code30 + code40;
  const code60 = Number(ledgerOrInput.__openingCash ?? 0);
  const code61 = Number(ledgerOrInput.__fxEffectOnCash ?? 0);
  const code70 = code50 + code60 + code61;

  const b01Code110 = b01.assets.shortTerm.items['110'] || 0;
  const reconciliationDiscrepancy = Math.abs(code70 - b01Code110);
  const isReconciledWithB01 = reconciliationDiscrepancy === 0;

  const items: CashFlowLineItem[] = [
    {
      itemCode: '01',
      itemNameVi: '1. Lợi nhuận trước thuế',
      section: 'OPERATING',
      formulaDescriptionVi: 'Lấy từ Mã số 50 trên Báo cáo KQHĐKD (B02-DN)',
      currentPeriodAmount: code01,
    },
    {
      itemCode: '02',
      itemNameVi: '2. Điều chỉnh cho Khấu hao TSCĐ và BĐSĐT',
      section: 'OPERATING',
      formulaDescriptionVi: 'Chi phí phi tiền tệ: Phát sinh Có TK 214 (+)',
      currentPeriodAmount: code02,
    },
    {
      itemCode: '03',
      itemNameVi: '3. Các khoản dự phòng',
      section: 'OPERATING',
      formulaDescriptionVi: 'Hoàn nhập / Trích lập dự phòng TK 229, TK 352',
      currentPeriodAmount: code03,
    },
    {
      itemCode: '05',
      itemNameVi: '4. Lãi, lỗ từ hoạt động đầu tư',
      section: 'OPERATING',
      formulaDescriptionVi: 'Loại trừ doanh thu tài chính đầu tư (TK 515)',
      currentPeriodAmount: code05,
    },
    {
      itemCode: '06',
      itemNameVi: '5. Chi phí lãi vay',
      section: 'OPERATING',
      formulaDescriptionVi: 'Cộng ngược chi phí lãi vay TK 635 (+)',
      currentPeriodAmount: code06,
    },
    {
      itemCode: '08',
      itemNameVi: 'Lợi nhuận từ HĐKD trước thay đổi vốn lưu động (Mã 08)',
      section: 'OPERATING',
      formulaDescriptionVi: 'Mã 08 = 01 + 02 + 03 + 04 + 05 + 06',
      currentPeriodAmount: code08,
      isSubtotal: true,
    },
    {
      itemCode: '09',
      itemNameVi: '6. Tăng, giảm các khoản phải thu',
      section: 'OPERATING',
      formulaDescriptionVi: 'Chênh lệch số dư TK 131, TK 133, TK 138 (Tăng ghi âm)',
      currentPeriodAmount: code09,
    },
    {
      itemCode: '10',
      itemNameVi: '7. Tăng, giảm hàng tồn kho',
      section: 'OPERATING',
      formulaDescriptionVi: 'Chênh lệch số dư TK 152, 153, 154, 155, 156 (Tăng ghi âm)',
      currentPeriodAmount: code10,
    },
    {
      itemCode: '11',
      itemNameVi: '8. Tăng, giảm các khoản phải trả (không kể lãi vay, thuế TNDN)',
      section: 'OPERATING',
      formulaDescriptionVi: 'Chênh lệch số dư TK 331, 334, 338 (Tăng ghi dương)',
      currentPeriodAmount: code11,
    },
    {
      itemCode: '12',
      itemNameVi: '9. Tăng, giảm chi phí trả trước',
      section: 'OPERATING',
      formulaDescriptionVi: 'Chênh lệch số dư TK 242 (Tăng ghi âm)',
      currentPeriodAmount: code12,
    },
    {
      itemCode: '15',
      itemNameVi: '10. Thuế thu nhập doanh nghiệp đã nộp',
      section: 'OPERATING',
      formulaDescriptionVi: 'Phát sinh Nợ TK 3334 (Chi tiền nộp thuế TNDN)',
      currentPeriodAmount: code15,
    },
    {
      itemCode: '20',
      itemNameVi: 'I. Lưu chuyển tiền thuần từ hoạt động kinh doanh (Mã 20)',
      section: 'OPERATING',
      formulaDescriptionVi: 'Mã 20 = 08 + 09 + 10 + 11 + 12 + 14 + 15',
      currentPeriodAmount: code20,
      isSubtotal: true,
    },
    {
      itemCode: '21',
      itemNameVi: '1. Tiền chi để mua sắm, xây dựng TSCĐ và tài sản dài hạn khác',
      section: 'INVESTING',
      formulaDescriptionVi: 'Đối ứng giảm tiền mua sắm TK 211, 213, 241',
      currentPeriodAmount: code21,
    },
    {
      itemCode: '27',
      itemNameVi: '2. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia',
      section: 'INVESTING',
      formulaDescriptionVi: 'Tiền thu thực tế từ hoạt động đầu tư tài chính (TK 515)',
      currentPeriodAmount: code27,
    },
    {
      itemCode: '30',
      itemNameVi: 'II. Lưu chuyển tiền thuần từ hoạt động đầu tư (Mã 30)',
      section: 'INVESTING',
      formulaDescriptionVi: 'Mã 30 = 21 + 22 + 27',
      currentPeriodAmount: code30,
      isSubtotal: true,
    },
    {
      itemCode: '31',
      itemNameVi: '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu',
      section: 'FINANCING',
      formulaDescriptionVi: 'Phát sinh Có TK 411 đối ứng thu tiền (TK 111/112)',
      currentPeriodAmount: code31,
    },
    {
      itemCode: '33',
      itemNameVi: '2. Tiền thu từ đi vay ngắn hạn, dài hạn',
      section: 'FINANCING',
      formulaDescriptionVi: 'Phát sinh Có TK 341',
      currentPeriodAmount: code33,
    },
    {
      itemCode: '34',
      itemNameVi: '3. Tiền trả nợ gốc vay',
      section: 'FINANCING',
      formulaDescriptionVi: 'Phát sinh Nợ TK 341',
      currentPeriodAmount: code34,
    },
    {
      itemCode: '40',
      itemNameVi: 'III. Lưu chuyển tiền thuần từ hoạt động tài chính (Mã 40)',
      section: 'FINANCING',
      formulaDescriptionVi: 'Mã 40 = 31 + 33 + 34 + 36',
      currentPeriodAmount: code40,
      isSubtotal: true,
    },
    {
      itemCode: '50',
      itemNameVi: 'Lưu chuyển tiền thuần trong kỳ (Mã 50 = 20 + 30 + 40)',
      section: 'SUMMARY',
      formulaDescriptionVi: 'Tổng hợp dòng tiền ròng 3 hoạt động',
      currentPeriodAmount: code50,
      isSubtotal: true,
    },
    {
      itemCode: '60',
      itemNameVi: 'Tiền và tương đương tiền đầu kỳ (Mã 60)',
      section: 'SUMMARY',
      formulaDescriptionVi: 'Số dư đầu kỳ TK 111, TK 112, TK 113, TK 1281 (<=3 tháng)',
      currentPeriodAmount: code60,
    },
    {
      itemCode: '70',
      itemNameVi: 'Tiền và tương đương tiền cuối kỳ (Mã 70 = 50 + 60 + 61)',
      section: 'SUMMARY',
      formulaDescriptionVi: 'Bất biến đối chiếu: Mã 70 (B03-DN) ≡ Mã 110 (B01-DN)',
      currentPeriodAmount: code70,
      isSubtotal: true,
    },
  ];

  return {
    period,
    method: 'INDIRECT',
    operatingCashFlow: code20,
    investingCashFlow: code30,
    financingCashFlow: code40,
    netCashFlowInPeriod: code50,
    openingCashAndEquivalents: code60,
    fxEffectOnCash: code61,
    closingCashAndEquivalents: code70,
    b01CashAndEquivalentsCode110: b01Code110,
    isReconciledWithB01,
    reconciliationDiscrepancy,
    items,
  };
}
