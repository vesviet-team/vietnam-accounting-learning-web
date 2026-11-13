/**
 * Tax Compliance & Regulatory Guardrails Service
 * Vietnam Accounting Platform (Circular 200 & Circular 133)
 *
 * Implements:
 * 1. Non-Cash Payment Threshold Check (>= 20M VND) under Circular 219/2013/TT-BTC & Circular 96/2015/TT-BTC
 * 2. Vendor Tax Status Evaluation (Status 00 Active vs 03 Suspended vs 04 Runaway) under Decree 254/2026/ND-CP
 * 3. CIT Schedule B4 (Chỉ tiêu B4 - Chi phí không được trừ) calculation & CIT Tax Adjustment Engine
 */

export const NON_CASH_PAYMENT_THRESHOLD = 20_000_000;
export const NON_CASH_THRESHOLD_VAT_LAW_2024 = 5_000_000;
export const STANDARD_CIT_RATE = 0.20;

export const STATUTORY_BASIS_NON_CASH =
  'Khoản 1 Điều 6 Thông tư 78/2014/TT-BTC, sửa đổi bởi Điều 4 Thông tư 96/2015/TT-BTC và Khoản 2 Điều 15 Thông tư 219/2013/TT-BTC';

export const STATUTORY_BASIS_VAT_LAW_2024 =
  'Điểm b Khoản 2 Điều 14 Luật Thuế giá trị gia tăng số 48/2024/QH15 (hiệu lực từ 01/07/2025) và Nghị định hướng dẫn thi hành';

export const STATUTORY_BASIS_FCT_103 =
  'Điều 12 và Điều 13 Thông tư 103/2014/TT-BTC hướng dẫn thực hiện nghĩa vụ thuế áp dụng đối với tổ chức, cá nhân nước ngoài kinh doanh tại Việt Nam (Thuế nhà thầu - FCT)';

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
    statutoryBasis: 'Khoản 2 Điều 6 Thông tư 78/2014/TT-BTC & Thông tư 96/2015/TT-BTC',
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
 * Calculates Foreign Contractor Tax (Thuế nhà thầu nước ngoài - FCT) under Circular 103/2014/TT-BTC.
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
      statutoryBasis: STATUTORY_BASIS_FCT_103,
    };
  }

  // NET Contract: Gross-up CIT first, then Gross-up VAT (Điều 12 & Điều 13 Thông tư 103/2014/TT-BTC)
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
    statutoryBasis: STATUTORY_BASIS_FCT_103,
  };
}

// =========================================================================
// 6. PERSONAL INCOME TAX (PIT) DEDUCTION GUARDRAIL
//    Luật Thuế TNCN số 109/2025/QH15 & Nghị định 253/2026/NĐ-CP
// =========================================================================

/** Mức giảm trừ gia cảnh cho bản thân theo pháp luật cũ (Luật Thuế TNCN số 04/2007/QH12, sửa đổi bởi Luật số 71/2014/QH13): 11.000.000 VNĐ/tháng */
export const PIT_SELF_DEDUCTION_PREV_LAW = 11_000_000;

/** Mức giảm trừ gia cảnh cho bản thân theo Luật Thuế TNCN số 109/2025/QH15 & Nghị định 253/2026/NĐ-CP (hiệu lực 01/07/2026): 15.500.000 VNĐ/tháng */
export const PIT_SELF_DEDUCTION_2025_LAW = 15_500_000;

/** Mức giảm trừ gia cảnh cho mỗi người phụ thuộc theo Luật Thuế TNCN số 109/2025/QH15 & Nghị định 253/2026/NĐ-CP (hiệu lực 01/07/2026): 6.200.000 VNĐ/tháng */
export const PIT_DEPENDENT_DEDUCTION_2025_LAW = 6_200_000;

export const STATUTORY_BASIS_PIT_LAW_2025 =
  'Luật Thuế TNCN số 109/2025/QH15 và Nghị định 253/2026/NĐ-CP (hiệu lực 01/07/2026)';

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
 * to a monthly gross salary, depending on the effective date.
 *
 * - From 01/07/2026: Luật Thuế TNCN số 109/2025/QH15 + Nghị định 253/2026/NĐ-CP
 *   → 15.500.000 VNĐ/tháng cho bản thân + 6.200.000 VNĐ/tháng cho mỗi người phụ thuộc.
 * - Before 01/07/2026: Luật Thuế TNCN số 04/2007/QH12 (sửa đổi bởi Luật số 71/2014/QH13)
 *   → 11.000.000 VNĐ/tháng cho bản thân + 4.400.000 VNĐ/tháng cho mỗi người phụ thuộc.
 */
export function evaluatePitDeduction(
  monthlyGrossSalary: number,
  dependents: number = 0,
  asOfDate: string = '2026-07-01'
): PitDeductionCheckResult {
  const gross = Math.max(0, Number(monthlyGrossSalary) || 0);
  const dependentCount = Math.max(0, Math.floor(Number(dependents) || 0));

  const NEW_LAW_EFFECTIVE_DATE = '2026-07-01';
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
    ? `Theo Luật Thuế TNCN số 109/2025/QH15 và Nghị định 253/2026/NĐ-CP (hiệu lực từ 01/07/2026), mức giảm trừ gia cảnh cho bản thân là 15.500.000 VNĐ/tháng và 6.200.000 VNĐ/tháng cho mỗi người phụ thuộc. Áp dụng cho ngày ${asOfDate}: giảm trừ bản thân 15.500.000 VNĐ + ${dependentCount} người phụ thuộc x 6.200.000 VNĐ = tổng ${totalMonthlyDeduction.toLocaleString('vi-VN')} VNĐ/tháng. Thu nhập tính thuế tháng = max(0, ${gross.toLocaleString('vi-VN')} - ${totalMonthlyDeduction.toLocaleString('vi-VN')}) = ${taxableMonthlyIncome.toLocaleString('vi-VN')} VNĐ. Lưu ý: trước 01/07/2026 áp dụng mức cũ 11.000.000 VNĐ (bản thân) và 4.400.000 VNĐ/người phụ thuộc theo Luật Thuế TNCN số 04/2007/QH12 (sửa đổi bởi Luật số 71/2014/QH13).`
    : `Trước ngày 01/07/2026, áp dụng mức giảm trừ gia cảnh theo Luật Thuế TNCN số 04/2007/QH12 (sửa đổi bởi Luật số 71/2014/QH13): 11.000.000 VNĐ/tháng cho bản thân và 4.400.000 VNĐ/tháng cho mỗi người phụ thuộc. Áp dụng cho ngày ${asOfDate}: giảm trừ bản thân 11.000.000 VNĐ + ${dependentCount} người phụ thuộc x 4.400.000 VNĐ = tổng ${totalMonthlyDeduction.toLocaleString('vi-VN')} VNĐ/tháng. Thu nhập tính thuế tháng = max(0, ${gross.toLocaleString('vi-VN')} - ${totalMonthlyDeduction.toLocaleString('vi-VN')}) = ${taxableMonthlyIncome.toLocaleString('vi-VN')} VNĐ. Lưu ý: từ 01/07/2026, mức mới theo Luật Thuế TNCN số 109/2025/QH15 và Nghị định 253/2026/NĐ-CP là 15.500.000 VNĐ (bản thân) và 6.200.000 VNĐ/người phụ thuộc.`;

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
