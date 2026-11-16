/**
 * Tax Compliance & Regulatory Guardrails Service
 * Vietnam Accounting Platform (Circular 200 & Circular 133)
 *
 * Implements:
 * 1. Non-Cash Payment Threshold Check (>= 20M VND) under Circular 69/2025/TT-BTC (replaces 219/2013) & Circular 20/2026/TT-BTC (replaces 78/2014, 96/2015)
 * 2. Vendor Tax Status Evaluation (Status 00 Active vs 03 Suspended vs 04 Runaway) under Decree 254/2026/ND-CP
 * 3. CIT Schedule B4 (Chỉ tiêu B4 - Chi phí không được trừ) calculation & CIT Tax Adjustment Engine
 * 4. FCT (Thuế nhà thầu) under Circular 89/2026/TT-BTC (effective 01/07/2026, replaces TT 103/2014/TT-BTC)
 * 5. PIT family deduction (giảm trừ gia cảnh 15.5M/6.2M) from tax year 2026 under Resolution 110/2025/UBTVQH15
 * 6. SME 30% CIT/PIT reduction for tax years 2026-2027 under Decree 398/2026/ND-CP (revenue <= 10B VND)
 * 7. VAT 2% reduction window (8% rate until 31/12/2026, back to 10% from 01/01/2027) under Decree 174/2025/ND-CP
 */

export const NON_CASH_PAYMENT_THRESHOLD = 20_000_000;
export const NON_CASH_THRESHOLD_VAT_LAW_2024 = 5_000_000;
export const STANDARD_CIT_RATE = 0.20;

export const STATUTORY_BASIS_NON_CASH =
  'Khoản 1 Điều 15 Thông tư 69/2025/TT-BTC (hiệu lực 01/07/2025, thay thế Thông tư 219/2013/TT-BTC) và Điều 4 Thông tư 20/2026/TT-BTC (hiệu lực 12/03/2026, thay thế Thông tư 78/2014/TT-BTC, Thông tư 96/2015/TT-BTC) quy định hóa đơn từ 20 triệu đồng trở lên (đã bao gồm thuế GTGT) bắt buộc phải có chứng từ thanh toán không dùng tiền mặt để được khấu trừ thuế GTGT và tính chi phí hợp lý khi xác định thuế TNDN.';

export const STATUTORY_BASIS_VAT_LAW_2024 =
  'Điểm b Khoản 2 Điều 14 Luật Thuế giá trị gia tăng số 48/2024/QH15 (hiệu lực từ 01/07/2025) và Nghị định hướng dẫn thi hành';

// TT 89/2026/TT-BTC thay thế TT 103/2014/TT-BTC từ 01/07/2026. Bảng tỷ lệ % tính trên DOANH THU giữ nguyên
// (phân phối 1%/1%, dịch vụ 5%/5%, xây dựng có NM 3%/2%, sản xuất-vận tải 3%/2%, tiền lãi 5%/5%).
// Tờ khai mới: 01/NTNN (kê khai), 02/NTNN (quyết toán).
export const STATUTORY_BASIS_FCT_89_2026 =
  'Điều 12 và Điều 13 Thông tư 89/2026/TT-BTC (hiệu lực 01/07/2026, thay thế Thông tư 103/2014/TT-BTC) hướng dẫn thực hiện nghĩa vụ thuế áp dụng đối với tổ chức, cá nhân nước ngoài kinh doanh tại Việt Nam (Thuế nhà thầu - FCT). Tỷ lệ % tính trên doanh thu giữ nguyên; tờ khai mới 01/NTNN và tờ quyết toán 02/NTNN';

/** @deprecated Dùng STATUTORY_BASIS_FCT_89_2026 - TT 103/2014/TT-BTC đã bị thay thế từ 01/07/2026 */
export const STATUTORY_BASIS_FCT_103 = STATUTORY_BASIS_FCT_89_2026;

export const STATUTORY_BASIS_VENDOR_RUNAWAY =
  'Nghị định 254/2026/NĐ-CP hướng dẫn Luật Quản lý thuế số 108/2025/QH15 về hóa đơn điện tử, chứng từ điện tử';

export const STATUTORY_BASIS_VENDOR_SUSPENDED =
  'Nghị định 254/2026/NĐ-CP hướng dẫn Luật Quản lý thuế số 108/2025/QH15 về hóa đơn điện tử, chứng từ điện tử';

export const STATUTORY_BASIS_VENDOR_ACTIVE =
  'Luật Quản lý thuế số 108/2025/QH15 và Nghị định 254/2026/NĐ-CP';

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
 * Status 04: Inactive at registered address / Bỏ trốn -> 100% tax fraud flag, illegal invoice (Nghị định 254/2026/NĐ-CP), VAT non-creditable, expense non-deductible for CIT (Schedule B4).
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
          'Cơ quan thuế đã ban hành thông báo người nộp thuế không hoạt động tại địa chỉ đã đăng ký (doanh nghiệp bỏ trốn). Hóa đơn bị coi là sử dụng không hợp pháp hóa đơn theo Nghị định 254/2026/NĐ-CP, 100% rủi ro gian lận thuế.',
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
    statutoryBasis: 'Khoản 2 Điều 6 Thông tư 20/2026/TT-BTC (thay thế Thông tư 78/2014/TT-BTC, Thông tư 96/2015/TT-BTC)',
  }));

  return calculateCitScheduleB4(accountingProfitBeforeTax, items);
}

/**
 * Evaluates the updated non-cash payment rule under VAT Law No. 48/2024/QH15 (effective 01/07/2025)
 * where the mandatory non-cash payment threshold is lowered to >= 5,000,000 VND.
 */
export function evaluateNonCashRuleVatLaw2024(
  totalAmount: number,
  paymentMethod: string
): NonCashCheckResult {
  const isCash = isCashPaymentMethod(paymentMethod);
  const isViolated = totalAmount >= NON_CASH_THRESHOLD_VAT_LAW_2024 && isCash;

  if (isViolated) {
    return {
      isViolated: true,
      vatCreditable: false,
      citDeductible: false,
      statutoryBasis: STATUTORY_BASIS_VAT_LAW_2024,
      explanationVi:
        'Theo Luật Thuế GTGT số 48/2024/QH15 (hiệu lực từ 01/07/2025) và Nghị định hướng dẫn, hóa đơn mua hàng hóa, dịch vụ từ 5.000.000 VNĐ trở lên thanh toán bằng tiền mặt vi phạm điều kiện thanh toán không dùng tiền mặt. Không được khấu trừ thuế GTGT đầu vào (TK 133).',
      totalAmount,
      paymentMethod,
      threshold: NON_CASH_THRESHOLD_VAT_LAW_2024,
    };
  }

  return {
    isViolated: false,
    vatCreditable: true,
    citDeductible: true,
    statutoryBasis: STATUTORY_BASIS_VAT_LAW_2024,
    explanationVi:
      totalAmount >= NON_CASH_THRESHOLD_VAT_LAW_2024
        ? 'Hóa đơn từ 5.000.000 VNĐ trở lên đã thanh toán không dùng tiền mặt theo đúng quy định của Luật Thuế GTGT số 48/2024/QH15.'
        : 'Hóa đơn dưới 5.000.000 VNĐ đáp ứng điều kiện theo ngưỡng mới của Luật Thuế GTGT 2024.',
    totalAmount,
    paymentMethod,
    threshold: NON_CASH_THRESHOLD_VAT_LAW_2024,
  };
}

export interface FctCalculationInput {
  contractAmount: number;
  contractType: 'NET' | 'GROSS';
  citRate?: number; // Default 0.05 (5% for general services/cloud) or 0.10 (10% for royalty/copyright)
  vatRate?: number; // Default 0.05 (5% for services) or 0 (exempt software license)
}

export interface FctCalculationResult {
  contractAmount: number;
  contractType: 'NET' | 'GROSS';
  citTaxableTurnover: number;
  citRate: number;
  citAmount: number;
  vatTaxableTurnover: number;
  vatRate: number;
  vatAmount: number;
  totalFctPayable: number;
  statutoryBasis: string;
}

/**
 * Calculates Foreign Contractor Tax (Thuế nhà thầu nước ngoài - FCT) under Circular 89/2026/TT-BTC
 * (effective 01/07/2026, replacing Circular 103/2014/TT-BTC; revenue-based % rates unchanged).
 * Supports both GROSS contracts (tax withheld from payment to vendor) and NET contracts (gross-up calculation).
 */
export function calculateForeignContractorTax(input: FctCalculationInput): FctCalculationResult {
  const amount = Math.max(0, Number(input.contractAmount) || 0);
  const citRate = input.citRate !== undefined ? input.citRate : 0.05;
  const vatRate = input.vatRate !== undefined ? input.vatRate : 0.05;

  if (input.contractType === 'GROSS') {
    const vatTaxableTurnover = amount;
    const vatAmount = Math.round(vatTaxableTurnover * vatRate);
    const citTaxableTurnover = amount - vatAmount;
    const citAmount = Math.round(citTaxableTurnover * citRate);

    return {
      contractAmount: amount,
      contractType: 'GROSS',
      citTaxableTurnover,
      citRate,
      citAmount,
      vatTaxableTurnover,
      vatRate,
      vatAmount,
      totalFctPayable: citAmount + vatAmount,
      statutoryBasis: STATUTORY_BASIS_FCT_89_2026,
    };
  }

  // NET Contract: Gross-up CIT first, then Gross-up VAT (Điều 12 & Điều 13 Thông tư 89/2026/TT-BTC, thay TT 103/2014 từ 01/07/2026)
  const citTaxableTurnover = Math.round(amount / (1 - citRate));
  const citAmount = Math.round(citTaxableTurnover * citRate);
  const vatTaxableTurnover = vatRate > 0 ? Math.round(citTaxableTurnover / (1 - vatRate)) : citTaxableTurnover;
  const vatAmount = Math.round(vatTaxableTurnover * vatRate);

  return {
    contractAmount: amount,
    contractType: 'NET',
    citTaxableTurnover,
    citRate,
    citAmount,
    vatTaxableTurnover,
    vatRate,
    vatAmount,
    totalFctPayable: citAmount + vatAmount,
    statutoryBasis: STATUTORY_BASIS_FCT_89_2026,
  };
}

// =========================================================================
// 6. PERSONAL INCOME TAX (PIT) DEDUCTION GUARDRAIL
//    Nghị quyết 110/2025/UBTVQH15 (giảm trừ gia cảnh, áp dụng từ kỳ tính thuế 2026)
//    Thủ tục kê khai TNCN: Luật Thuế TNCN số 109/2025/QH15, NĐ 253/2026/NĐ-CP
//    và Thông tư 87/2026/TT-BTC (hiệu lực 01/07/2026, thay TT 111/2013)
// =========================================================================

/** Mức giảm trừ gia cảnh cho bản thân theo pháp luật cũ (Luật Thuế TNCN số 04/2007/QH12, sửa đổi bởi Luật số 71/2014/QH13): 11.000.000 VNĐ/tháng - áp dụng cho kỳ tính thuế TRƯỚC 2026 */
export const PIT_SELF_DEDUCTION_PREV_LAW = 11_000_000;

/** Mức giảm trừ gia cảnh cho bản thân theo NQ 110/2025/UBTVQH15 (hiệu lực 2026-01-01, áp dụng CẢ NĂM 2026): 15.500.000 VNĐ/tháng */
export const PIT_SELF_DEDUCTION_2025_LAW = 15_500_000;

/** Mức giảm trừ gia cảnh cho mỗi người phụ thuộc theo NQ 110/2025/UBTVQH15 (hiệu lực 2026-01-01, áp dụng CẢ NĂM 2026): 6.200.000 VNĐ/tháng */
export const PIT_DEPENDENT_DEDUCTION_2025_LAW = 6_200_000;

export const STATUTORY_BASIS_PIT_LAW_2025 =
  'Nghị quyết 110/2025/UBTVQH15 (hiệu lực 2026-01-01, áp dụng từ kỳ tính thuế 2026): giảm trừ gia cảnh 15,5 triệu đồng/tháng cho bản thân (186 triệu đồng/năm) và 6,2 triệu đồng/tháng cho mỗi người phụ thuộc';

export type ApplicablePitLaw = 'LAW_04_2007' | 'LAW_109_2025';

export interface PitDeductionCheckResult {
  monthlyGrossSalary: number;
  dependents: number;
  applicableLaw: ApplicablePitLaw;
  selfDeduction: number;
  dependentDeduction: number;
  totalMonthlyDeduction: number;
  totalAnnualDeduction: number;
  taxableMonthlyIncome: number;
  statutoryBasis: string;
  explanationVi: string;
}

/**
 * Evaluates the personal-income-tax family deductions (giảm trừ gia cảnh) applicable
 * to a monthly gross salary, depending on the tax period.
 *
 * - From 2026-01-01 (kỳ tính thuế 2026 trở đi): Nghị quyết 110/2025/UBTVQH15
 *   → 15.500.000 VNĐ/tháng cho bản thân + 6.200.000 VNĐ/tháng cho mỗi người phụ thuộc,
 *     áp dụng CHO CẢ NĂM 2026 (retroactive toàn kỳ, không chia đôi năm).
 * - Before 2026-01-01 (kỳ tính thuế 2025 và trước đó): Luật Thuế TNCN số 04/2007/QH12
 *   (sửa đổi bởi Luật số 71/2014/QH13) → 11.000.000 VNĐ/tháng cho bản thân
 *   + 4.400.000 VNĐ/tháng cho mỗi người phụ thuộc.
 */
export function evaluatePitDeduction(
  monthlyGrossSalary: number,
  dependents: number = 0,
  asOfDate: string = '2026-01-01'
): PitDeductionCheckResult {
  const gross = Math.max(0, Number(monthlyGrossSalary) || 0);
  const dependentCount = Math.max(0, Math.floor(Number(dependents) || 0));

  const NEW_LAW_EFFECTIVE_DATE = '2026-01-01';
  const isNewLaw = asOfDate >= NEW_LAW_EFFECTIVE_DATE;

  const selfDeduction = isNewLaw ? PIT_SELF_DEDUCTION_2025_LAW : PIT_SELF_DEDUCTION_PREV_LAW;
  const dependentDeductionPerPerson = isNewLaw ? PIT_DEPENDENT_DEDUCTION_2025_LAW : 4_400_000;
  const dependentDeduction = dependentDeductionPerPerson * dependentCount;

  const totalMonthlyDeduction = selfDeduction + dependentDeduction;
  const totalAnnualDeduction = totalMonthlyDeduction * 12;
  const taxableMonthlyIncome = Math.max(0, gross - totalMonthlyDeduction);

  const applicableLaw: ApplicablePitLaw = isNewLaw ? 'LAW_109_2025' : 'LAW_04_2007';
  const statutoryBasis = isNewLaw
    ? STATUTORY_BASIS_PIT_LAW_2025
    : 'Luật Thuế TNCN số 04/2007/QH12 (sửa đổi bởi Luật số 71/2014/QH13)';

  const explanationVi = isNewLaw
    ? `Theo Nghị quyết 110/2025/UBTVQH15 (hiệu lực từ 2026-01-01, áp dụng từ kỳ tính thuế 2026), mức giảm trừ gia cảnh cho bản thân là 15.500.000 VNĐ/tháng và 6.200.000 VNĐ/tháng cho mỗi người phụ thuộc, áp dụng cho CẢ NĂM 2026 (toàn bộ kỳ tính thuế, không chia làm hai nửa năm). Áp dụng cho ngày ${asOfDate}: giảm trừ bản thân 15.500.000 VNĐ + ${dependentCount} người phụ thuộc x 6.200.000 VNĐ = tổng ${totalMonthlyDeduction.toLocaleString('vi-VN')} VNĐ/tháng. Thu nhập tính thuế tháng = max(0, ${gross.toLocaleString('vi-VN')} - ${totalMonthlyDeduction.toLocaleString('vi-VN')}) = ${taxableMonthlyIncome.toLocaleString('vi-VN')} VNĐ. Lưu ý: trước 2026-01-01 (kỳ tính thuế 2025 trở về trước) áp dụng mức cũ 11.000.000 VNĐ (bản thân) và 4.400.000 VNĐ/người phụ thuộc theo Luật Thuế TNCN số 04/2007/QH12 (sửa đổi bởi Luật số 71/2014/QH13).`
    : `Trước ngày 2026-01-01 (kỳ tính thuế 2025 trở về trước), áp dụng mức giảm trừ gia cảnh theo Luật Thuế TNCN số 04/2007/QH12 (sửa đổi bởi Luật số 71/2014/QH13): 11.000.000 VNĐ/tháng cho bản thân và 4.400.000 VNĐ/tháng cho mỗi người phụ thuộc. Áp dụng cho ngày ${asOfDate}: giảm trừ bản thân 11.000.000 VNĐ + ${dependentCount} người phụ thuộc x 4.400.000 VNĐ = tổng ${totalMonthlyDeduction.toLocaleString('vi-VN')} VNĐ/tháng. Thu nhập tính thuế tháng = max(0, ${gross.toLocaleString('vi-VN')} - ${totalMonthlyDeduction.toLocaleString('vi-VN')}) = ${taxableMonthlyIncome.toLocaleString('vi-VN')} VNĐ. Lưu ý: từ 2026-01-01, mức mới theo Nghị quyết 110/2025/UBTVQH15 là 15.500.000 VNĐ (bản thân) và 6.200.000 VNĐ/người phụ thuộc, áp dụng cho cả năm 2026.`;

  return {
    monthlyGrossSalary: gross,
    dependents: dependentCount,
    applicableLaw,
    selfDeduction,
    dependentDeduction,
    totalMonthlyDeduction,
    totalAnnualDeduction,
    taxableMonthlyIncome,
    statutoryBasis,
    explanationVi,
  };
}

// =========================================================================
// 7. SME 30% CIT/PIT REDUCTION GUARDRAIL (Kỳ tính thuế 2026-2027)
//    NĐ 398/2026/NĐ-CP (chi tiết NQ 43/2026/QH16)
// =========================================================================

/** Ngưỡng doanh thu năm: DN/hộ KD/cá nhân kinh doanh có doanh thu năm <= 10 tỷ đồng được giảm 30% số thuế phải nộp */
export const SME_TAX_REDUCTION_REVENUE_THRESHOLD = 10_000_000_000;

/** Mức giảm: 30% số thuế TNCN/TNDN phải nộp (TNDN tính trên số thuế SAU ưu đãi) */
export const SME_TAX_REDUCTION_RATE = 0.30;

/** Các kỳ tính thuế được áp dụng: 2026 và 2027 */
export const SME_TAX_REDUCTION_ELIGIBLE_YEARS = [2026, 2027] as const;

export const STATUTORY_BASIS_SME_TAX_REDUCTION =
  'NĐ 398/2026/NĐ-CP, hiệu lực 2026-10-29, áp dụng kỳ tính thuế 2026-2027 (chi tiết NQ 43/2026/QH16): giảm 30% số thuế TNCN/TNDN phải nộp cho doanh nghiệp, hộ kinh doanh và cá nhân kinh doanh có doanh thu năm không vượt quá 10 tỷ đồng';

export type SmeTaxReductionStatus =
  | 'ELIGIBLE'
  | 'REVENUE_EXCEEDED'
  | 'YEAR_NOT_APPLICABLE';

export interface SmeTaxReductionResult {
  annualRevenue: number;
  taxYear: number;
  status: SmeTaxReductionStatus;
  isEligible: boolean;
  eligibleYears: readonly number[];
  revenueThreshold: number;
  reductionRate: number;
  declarationFormVi: string;
  statutoryBasis: string;
  explanationVi: string;
}

/**
 * Evaluates the 30% CIT/PIT reduction for small & medium taxpayers under NĐ 398/2026/NĐ-CP.
 *
 * Rules:
 * - Kỳ tính thuế phải là 2026 hoặc 2027; ngoài các năm này guardrail trả YEAR_NOT_APPLICABLE.
 * - Doanh thu năm <= 10 tỷ đồng → ELIGIBLE: giảm 30% số thuế phải nộp
 *   (TNDN tính trên số thuế sau ưu đãi; kê khai Mẫu 01/02 NĐ 398/2026).
 * - Doanh thu năm vượt ngưỡng → REVENUE_EXCEEDED: mất quyền giảm, phải nộp bổ sung
 *   số thuế đã giảm theo Mẫu 03 NĐ 398/2026.
 *
 * @param annualRevenue Doanh thu năm của doanh nghiệp/hộ KD/cá nhân kinh doanh (VNĐ)
 * @param taxYear Kỳ tính thuế (năm dương lịch)
 */
export function evaluateSmeTaxReduction(
  annualRevenue: number,
  taxYear: number
): SmeTaxReductionResult {
  const revenue = Math.max(0, Number(annualRevenue) || 0);
  const year = Math.floor(Number(taxYear) || 0);

  if (!SME_TAX_REDUCTION_ELIGIBLE_YEARS.includes(year as 2026 | 2027)) {
    return {
      annualRevenue: revenue,
      taxYear: year,
      status: 'YEAR_NOT_APPLICABLE',
      isEligible: false,
      eligibleYears: SME_TAX_REDUCTION_ELIGIBLE_YEARS,
      revenueThreshold: SME_TAX_REDUCTION_REVENUE_THRESHOLD,
      reductionRate: SME_TAX_REDUCTION_RATE,
      declarationFormVi: '',
      statutoryBasis: STATUTORY_BASIS_SME_TAX_REDUCTION,
      explanationVi: `NĐ 398/2026/NĐ-CP chỉ áp dụng cho kỳ tính thuế 2026 và 2027. Kỳ tính thuế ${year} không thuộc diện áp dụng nên không được giảm 30% số thuế TNCN/TNDN phải nộp.`,
    };
  }

  if (revenue > SME_TAX_REDUCTION_REVENUE_THRESHOLD) {
    return {
      annualRevenue: revenue,
      taxYear: year,
      status: 'REVENUE_EXCEEDED',
      isEligible: false,
      eligibleYears: SME_TAX_REDUCTION_ELIGIBLE_YEARS,
      revenueThreshold: SME_TAX_REDUCTION_REVENUE_THRESHOLD,
      reductionRate: SME_TAX_REDUCTION_RATE,
      declarationFormVi: 'Mẫu 03 NĐ 398/2026/NĐ-CP',
      statutoryBasis: STATUTORY_BASIS_SME_TAX_REDUCTION,
      explanationVi: `CẢNH BÁO: Doanh thu năm ${year} là ${revenue.toLocaleString('vi-VN')} VNĐ, vượt ngưỡng 10.000.000.000 VNĐ quy định tại NĐ 398/2026/NĐ-CP → doanh nghiệp/hộ kinh doanh MẤT quyền giảm 30% số thuế TNCN/TNDN phải nộp và phải NỘP BỔ SUNG toàn bộ số thuế đã giảm theo Mẫu 03 NĐ 398/2026/NĐ-CP.`,
    };
  }

  return {
    annualRevenue: revenue,
    taxYear: year,
    status: 'ELIGIBLE',
    isEligible: true,
    eligibleYears: SME_TAX_REDUCTION_ELIGIBLE_YEARS,
    revenueThreshold: SME_TAX_REDUCTION_REVENUE_THRESHOLD,
    reductionRate: SME_TAX_REDUCTION_RATE,
    declarationFormVi: 'Mẫu 01/Mẫu 02 NĐ 398/2026/NĐ-CP',
    statutoryBasis: STATUTORY_BASIS_SME_TAX_REDUCTION,
    explanationVi: `Doanh thu năm ${year} là ${revenue.toLocaleString('vi-VN')} VNĐ, không vượt ngưỡng 10.000.000.000 VNĐ → được GIẢM 30% số thuế TNCN/TNDN phải nộp theo NĐ 398/2026/NĐ-CP (kỳ tính thuế 2026-2027; TNDN tính trên số thuế sau ưu đãi). Kê khai theo Mẫu 01/Mẫu 02 NĐ 398/2026/NĐ-CP.`,
  };
}

// =========================================================================
// 8. VAT 2% REDUCTION WINDOW GUARDRAIL (8% chỉ đến 31/12/2026)
//    NĐ 174/2025/NĐ-CP
// =========================================================================

/** Thuế suất GTGT giảm 2%: 8% (hộ KD phân phối/handmade hàng hóa: 0,8%) */
export const VAT_REDUCED_RATE = 0.08;

/** Thuế suất GTGT tiêu chuẩn khi hết cửa sổ giảm 2%: 10% (hộ KD hàng hóa: 1%) */
export const VAT_STANDARD_RATE = 0.10;

export const VAT_REDUCED_RATE_VALID_UNTIL = '2026-12-31';

export const STATUTORY_BASIS_VAT_RATE_REDUCTION =
  'NĐ 174/2025/NĐ-CP, áp dụng 2025-07-01 đến 2026-12-31: giảm 2% thuế suất GTGT (10% → 8%; hộ kinh doanh phân phối/handmade hàng hóa 1% → 0,8%)';

export interface VatReductionWindowResult {
  asOfDate: string;
  isWithinReductionWindow: boolean;
  applicableRate: number;
  householdBusinessGoodsRate: number;
  warningVi: string | null;
  statutoryBasis: string;
}

/**
 * Evaluates whether the 2% VAT reduction (8% rate) is still applicable at a given date.
 *
 * - NĐ 174/2025/NĐ-CP áp dụng từ 2025-07-01 đến 2026-12-31: thuế suất 8%
 *   (hộ KD phân phối/handmade hàng hóa 0,8%).
 * - Từ 2027-01-01: hết giảm 2%, quay về 10% (hộ KD hàng hóa 1%).
 */
export function evaluateVatReductionWindow(asOfDate: string): VatReductionWindowResult {
  const REDUCTION_START = '2025-07-01';
  const REDUCTION_END = VAT_REDUCED_RATE_VALID_UNTIL; // '2026-12-31'
  const withinWindow = asOfDate >= REDUCTION_START && asOfDate <= REDUCTION_END;

  if (withinWindow) {
    return {
      asOfDate,
      isWithinReductionWindow: true,
      applicableRate: VAT_REDUCED_RATE,
      householdBusinessGoodsRate: 0.008,
      warningVi: null,
      statutoryBasis: STATUTORY_BASIS_VAT_RATE_REDUCTION,
    };
  }

  const warningVi =
    asOfDate > REDUCTION_END
      ? `CẢNH BÁO CHUYỂN GIAI ĐOẠN: Từ 2027-01-01, NĐ 174/2025/NĐ-CP hết hiệu lực (chỉ áp dụng đến 2026-12-31), thuế suất GTGT quay về 10% (hộ kinh doanh phân phối/handmade hàng hóa từ 0,8% về 1%). Hóa đơn xuất từ 01/01/2027 KHÔNG được áp dụng thuế suất 8%.`
      : 'NĐ 174/2025/NĐ-CP chỉ có hiệu lực từ 2025-07-01; trước thời điểm này thuế suất GTGT tiêu chuẩn 10%.';

  return {
    asOfDate,
    isWithinReductionWindow: false,
    applicableRate: VAT_STANDARD_RATE,
    householdBusinessGoodsRate: 0.01,
    warningVi,
    statutoryBasis: STATUTORY_BASIS_VAT_RATE_REDUCTION,
  };
}
