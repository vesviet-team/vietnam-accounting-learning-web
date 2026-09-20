/**
 * Tax Compliance & Regulatory Guardrails Service
 * Vietnam Accounting Platform (Circular 200 & Circular 133)
 *
 * Implements:
 * 1. Non-Cash Payment Threshold Check (>= 20M VND) under Circular 219/2013/TT-BTC & Circular 96/2015/TT-BTC
 * 2. Vendor Tax Status Evaluation (Status 00 Active vs 03 Suspended vs 04 Runaway) under Decree 123/2020/ND-CP
 * 3. CIT Schedule B4 (Chỉ tiêu B4 - Chi phí không được trừ) calculation & CIT Tax Adjustment Engine
 */

export const NON_CASH_PAYMENT_THRESHOLD = 20_000_000;
export const STANDARD_CIT_RATE = 0.20;

export const STATUTORY_BASIS_NON_CASH =
  'Khoản 1 Điều 6 Thông tư 78/2014/TT-BTC, sửa đổi bởi Điều 4 Thông tư 96/2015/TT-BTC và Khoản 2 Điều 15 Thông tư 219/2013/TT-BTC';

export const STATUTORY_BASIS_VENDOR_RUNAWAY =
  'Khoản 2 Điều 4 Nghị định 123/2020/NĐ-CP';

export const STATUTORY_BASIS_VENDOR_SUSPENDED =
  'Khoản 2 Điều 4 Nghị định 125/2020/NĐ-CP và Điều 4 Nghị định 126/2020/NĐ-CP';

export const STATUTORY_BASIS_VENDOR_ACTIVE =
  'Luật Quản lý thuế số 38/2019/QH14 và Nghị định 123/2020/NĐ-CP';

export interface NonCashCheckResult {
  isViolated: boolean;
  vatCreditable: boolean;
  citDeductible: boolean;
  statutoryBasis: string;
  explanationVi: string;
  totalAmount: number;
  paymentMethod: string;
  threshold: number;
}

export type VendorTaxStatusCode = '00' | '03' | '04';

export interface VendorTaxStatusCheckResult {
  vendorTaxCode: string;
  vendorTaxStatus: VendorTaxStatusCode;
  statusNameVi: string;
  riskLevel: 'NORMAL' | 'MEDIUM' | 'HIGH';
  isFraudRisk: boolean;
  vatCreditable: boolean;
  citDeductible: boolean;
  statutoryBasis: string;
  explanationVi: string;
  recommendationVi: string;
}

export interface ScheduleB4Item {
  id?: string;
  code: string;
  amount: number;
  reasonVi: string;
  statutoryBasis?: string;
}

export interface CitCalculationResult {
  accountingProfitBeforeTax: number;
  totalB4Disallowed: number;
  taxableIncome: number;
  citRate: number;
  citPayable: number;
  items: ScheduleB4Item[];
}

/**
 * Checks if a given payment method string represents cash.
 */
export function isCashPaymentMethod(paymentMethod: string): boolean {
  if (!paymentMethod) return false;
  const clean = paymentMethod.trim().toUpperCase();
  return (
    clean === 'CASH' ||
    clean === 'TIEN_MAT' ||
    clean === 'TM' ||
    clean === '111' ||
    clean.startsWith('111') ||
    clean.includes('TIỀN MẶT') ||
    clean.includes('TIEN MAT')
  );
}

/**
 * Evaluates the mandatory non-cash payment rule for invoices >= 20,000,000 VND.
 *
 * Rules:
 * - If totalAmount >= 20,000,000 VND and payment method is CASH (or TK 111):
 *   - isViolated = true
 *   - vatCreditable = false (Cannot be deducted on TK 133)
 *   - citDeductible = false (Disallowed expense for CIT, must be added to Schedule B4)
 *
 * @param totalAmount Total invoice amount including VAT
 * @param paymentMethod Payment method ('CASH', 'BANK_TRANSFER', '111', etc.)
 */
export function evaluateNonCashRule(
  totalAmount: number,
  paymentMethod: string
): NonCashCheckResult {
  const isCash = isCashPaymentMethod(paymentMethod);
  const isViolated = totalAmount >= NON_CASH_PAYMENT_THRESHOLD && isCash;

  if (isViolated) {
    return {
      isViolated: true,
      vatCreditable: false,
      citDeductible: false,
      statutoryBasis: STATUTORY_BASIS_NON_CASH,
      explanationVi:
        'Hóa đơn có tổng thanh toán từ 20.000.000 VNĐ trở lên (đã bao gồm thuế GTGT) thanh toán bằng tiền mặt vi phạm điều kiện thanh toán không dùng tiền mặt. Thuế GTGT đầu vào không được khấu trừ (TK 133) và chi phí không được trừ khi tính thuế TNDN (phải điều chỉnh tăng tại Chỉ tiêu B4 trên Tờ khai QTT TNDN).',
      totalAmount,
      paymentMethod,
      threshold: NON_CASH_PAYMENT_THRESHOLD,
    };
  }

  const explanationVi =
    totalAmount >= NON_CASH_PAYMENT_THRESHOLD
      ? 'Hóa đơn từ 20.000.000 VNĐ trở lên đã thực hiện thanh toán qua ngân hàng (chứng từ không dùng tiền mặt), đáp ứng đầy đủ điều kiện khấu trừ thuế GTGT và tính chi phí hợp lý.'
      : 'Hóa đơn dưới 20.000.000 VNĐ thanh toán bằng tiền mặt hoặc chuyển khoản đều hợp lệ theo quy định của pháp luật thuế.';

  return {
    isViolated: false,
    vatCreditable: true,
    citDeductible: true,
    statutoryBasis: STATUTORY_BASIS_NON_CASH,
    explanationVi,
    totalAmount,
    paymentMethod,
    threshold: NON_CASH_PAYMENT_THRESHOLD,
  };
}

/**
 * Evaluates supplier tax code registration status on GDT portal.
 *
 * Status 00: Active / Đang hoạt động -> Normal compliance.
 * Status 03: Temporarily suspended / Tạm ngừng kinh doanh có thời hạn -> High audit risk, verify invoice date vs suspension period.
 * Status 04: Inactive at registered address / Bỏ trốn -> 100% tax fraud flag, illegal invoice (Khoản 2 Điều 4 Nghị định 123/2020/NĐ-CP), VAT non-creditable, expense non-deductible for CIT (Schedule B4).
 *
 * @param vendorTaxCode Tax code of supplier
 * @param vendorTaxStatus Status code ('00' | '03' | '04')
 */
export function evaluateVendorTaxStatus(
  vendorTaxCode: string,
  vendorTaxStatus: VendorTaxStatusCode
): VendorTaxStatusCheckResult {
  switch (vendorTaxStatus) {
    case '00':
      return {
        vendorTaxCode,
        vendorTaxStatus,
        statusNameVi: 'NNT Đang hoạt động (đã được cấp MST)',
        riskLevel: 'NORMAL',
        isFraudRisk: false,
        vatCreditable: true,
        citDeductible: true,
        statutoryBasis: STATUTORY_BASIS_VENDOR_ACTIVE,
        explanationVi:
          'Người nộp thuế đang hoạt động bình thường theo dữ liệu đăng ký với cơ quan thuế.',
        recommendationVi:
          'Hóa đơn đủ điều kiện khấu trừ thuế GTGT và tính chi phí được trừ khi xác định thuế TNDN (nếu các tiêu thức khác hợp lệ).',
      };

    case '03':
      return {
        vendorTaxCode,
        vendorTaxStatus,
        statusNameVi: 'NNT Tạm ngừng kinh doanh có thời hạn',
        riskLevel: 'MEDIUM',
        isFraudRisk: false,
        vatCreditable: false,
        citDeductible: false,
        statutoryBasis: STATUTORY_BASIS_VENDOR_SUSPENDED,
        explanationVi:
          'Người nộp thuế đang trong thời gian tạm ngừng kinh doanh có thời hạn. Doanh nghiệp không được xuất hóa đơn GTGT trong thời gian tạm ngừng hoạt động.',
        recommendationVi:
          'Cảnh báo rủi ro thanh tra thuế cao. Bắt buộc đối chiếu ngày phát hành hóa đơn với khoảng thời gian tạm ngừng kinh doanh đã đăng ký với cơ quan thuế. Nếu hóa đơn phát sinh trong giai đoạn tạm ngừng thì đây là hành vi sử dụng không hợp pháp hóa đơn.',
      };

    case '04':
    default:
      return {
        vendorTaxCode,
        vendorTaxStatus: '04',
        statusNameVi: 'NNT Không hoạt động tại địa chỉ đã đăng ký (Bỏ trốn)',
        riskLevel: 'HIGH',
        isFraudRisk: true,
        vatCreditable: false,
        citDeductible: false,
        statutoryBasis: STATUTORY_BASIS_VENDOR_RUNAWAY,
        explanationVi:
          'Cơ quan thuế đã ban hành thông báo người nộp thuế không hoạt động tại địa chỉ đã đăng ký (doanh nghiệp bỏ trốn). Hóa đơn bị coi là sử dụng không hợp pháp hóa đơn theo Khoản 2 Điều 4 Nghị định 123/2020/NĐ-CP, 100% rủi ro gian lận thuế.',
        recommendationVi:
          'Tuyệt đối KHÔNG khấu trừ thuế GTGT đầu vào (TK 133) và loại toàn bộ khỏi chi phí được trừ khi xác định thuế TNDN (phải đưa vào Mục B4 trên Tờ khai QTT TNDN). Lập biên bản giải trình và chuẩn bị hồ sơ chứng minh nghiệp vụ kinh tế có thật theo yêu cầu của cơ quan thuế.',
      };
  }
}

/**
 * Calculates Corporate Income Tax adjustments and Schedule B4 (Chỉ tiêu B4 - Các khoản chi không được trừ).
 *
 * Formula:
 * - totalB4Disallowed = Sum of non-deductible expense items
 * - taxableIncome = accountingProfitBeforeTax + totalB4Disallowed
 * - citPayable = max(0, round(taxableIncome * 20%))
 *
 * @param accountingProfitBeforeTax Pre-tax accounting profit (Mã số 50 trên B02-DN)
 * @param disallowedExpenses List of disallowed expense items (Schedule B4)
 */
export function calculateCitScheduleB4(
  accountingProfitBeforeTax: number,
  disallowedExpenses: ScheduleB4Item[] = []
): CitCalculationResult {
  const totalB4Disallowed = (disallowedExpenses || []).reduce(
    (sum, item) => sum + (Math.max(0, Number(item.amount)) || 0),
    0
  );

  const taxableIncome = accountingProfitBeforeTax + totalB4Disallowed;
  const citPayable = Math.max(0, Math.round(taxableIncome * STANDARD_CIT_RATE));

  return {
    accountingProfitBeforeTax,
    totalB4Disallowed,
    taxableIncome,
    citRate: STANDARD_CIT_RATE,
    citPayable,
    items: disallowedExpenses || [],
  };
}

/**
 * Helper to calculate CIT adjustments from simple list of non-deductible items.
 */
export function calculateCitAdjustments(
  disallowedExpenses: Array<{ amount: number; reasonVi: string; code: string }>,
  accountingProfitBeforeTax: number = 0
): CitCalculationResult {
  const items: ScheduleB4Item[] = (disallowedExpenses || []).map((d) => ({
    code: d.code,
    amount: d.amount,
    reasonVi: d.reasonVi,
    statutoryBasis: 'Khoản 2 Điều 6 Thông tư 78/2014/TT-BTC & Thông tư 96/2015/TT-BTC',
  }));

  return calculateCitScheduleB4(accountingProfitBeforeTax, items);
}
