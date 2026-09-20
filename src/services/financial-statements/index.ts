/**
 * Financial Statements Service Index
 * Central exports for B01-DN & B02-DN engines, interfaces, and sample datasets.
 */

export * from './balance-sheet-engine';
export * from './income-statement-engine';

/**
 * Standard Day 27 Closing Dataset (from Capstone Milestone 10 Question 10)
 * Demonstrates a completely closed and balanced accounting cycle:
 * Total Assets (Mã 270) = 1,540,000,000 VNĐ
 * Total Resources (Mã 440) = 460,000,000 (Liabilities) + 1,080,000,000 (Equity) = 1,540,000,000 VNĐ
 * All temporary accounts (511, 632, 642, 8211, 911) are fully cleared to 0.
 */
export const DAY_27_CLOSING_DATASET: Record<
  string,
  {
    accountCode: string;
    accountNameVi: string;
    closingDebit: number;
    closingCredit: number;
    debitTotal: number;
    creditTotal: number;
  }
> = {
  '112': {
    accountCode: '112',
    accountNameVi: 'Tiền gửi ngân hàng (VNĐ)',
    closingDebit: 1330000000,
    closingCredit: 0,
    debitTotal: 1385000000,
    creditTotal: 55000000,
  },
  '156': {
    accountCode: '156',
    accountNameVi: 'Hàng hóa',
    closingDebit: 200000000,
    closingCredit: 0,
    debitTotal: 400000000,
    creditTotal: 200000000,
  },
  '1331': {
    accountCode: '1331',
    accountNameVi: 'Thuế GTGT đầu vào được khấu trừ',
    closingDebit: 10000000,
    closingCredit: 0,
    debitTotal: 45000000,
    creditTotal: 35000000,
  },
  '331': {
    accountCode: '331',
    accountNameVi: 'Phải trả cho người bán',
    closingDebit: 0,
    closingCredit: 440000000,
    debitTotal: 0,
    creditTotal: 440000000,
  },
  '3334': {
    accountCode: '3334',
    accountNameVi: 'Thuế thu nhập doanh nghiệp phải nộp',
    closingDebit: 0,
    closingCredit: 20000000,
    debitTotal: 0,
    creditTotal: 20000000,
  },
  '411': {
    accountCode: '411',
    accountNameVi: 'Vốn đầu tư của chủ sở hữu',
    closingDebit: 0,
    closingCredit: 1000000000,
    debitTotal: 0,
    creditTotal: 1000000000,
  },
  '4212': {
    accountCode: '4212',
    accountNameVi: 'Lợi nhuận sau thuế chưa phân phối năm nay',
    closingDebit: 0,
    closingCredit: 80000000,
    debitTotal: 0,
    creditTotal: 80000000,
  },
  // Cleared nominal accounts (turnovers preserved, ending balance 0)
  '511': {
    accountCode: '511',
    accountNameVi: 'Doanh thu bán hàng và CCDV',
    closingDebit: 0,
    closingCredit: 0,
    debitTotal: 350000000,
    creditTotal: 350000000,
  },
  '632': {
    accountCode: '632',
    accountNameVi: 'Giá vốn hàng bán',
    closingDebit: 0,
    closingCredit: 0,
    debitTotal: 200000000,
    creditTotal: 200000000,
  },
  '642': {
    accountCode: '642',
    accountNameVi: 'Chi phí quản lý doanh nghiệp',
    closingDebit: 0,
    closingCredit: 0,
    debitTotal: 50000000,
    creditTotal: 50000000,
  },
  '8211': {
    accountCode: '8211',
    accountNameVi: 'Chi phí thuế TNDN hiện hành',
    closingDebit: 0,
    closingCredit: 0,
    debitTotal: 20000000,
    creditTotal: 20000000,
  },
  '911': {
    accountCode: '911',
    accountNameVi: 'Xác định kết quả kinh doanh',
    closingDebit: 0,
    closingCredit: 0,
    debitTotal: 350000000,
    creditTotal: 350000000,
  },
};
