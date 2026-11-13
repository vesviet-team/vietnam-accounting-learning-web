/**
 * E-Commerce Tax Compliance Engine
 * Decree 117/2025/NĐ-CP (effective 01/07/2025) & Decree 68/2026/NĐ-CP (amends 117/2025, effective 01/07/2026)
 *
 * Covers:
 * 1. E-commerce platform (Sàn TMĐT) tax withholding & remittance obligations
 * 2. Household/individual business tax obligations on e-commerce platforms
 * 3. Electronic tax portal for e-commerce (Cổng thuế điện tử TMĐT)
 * 4. Cross-border e-commerce tax implications
 */

export type EcommercePlatformType = 'SHOPEE' | 'LAZADA' | 'TIKTOK_SHOP' | 'GRAB' | 'GOOGLE_PLAY' | 'APP_STORE' | 'OTHER';
export type SellerType = 'HOUSEHOLD_BUSINESS' | 'INDIVIDUAL_BUSINESS' | 'ENTERPRISE';
export type TaxWithholdingStatus = 'PLATFORM_WITHHELD' | 'SELF_DECLARED' | 'MIXED';

export interface EcommerceTransaction {
  platform: EcommercePlatformType;
  sellerType: SellerType;
  sellerTaxCode?: string;
  sellerName: string;
  grossRevenue: number; // Doanh thu gộm trước khi trừ phí sàn
  platformFee: number; // Phí sàn TMĐT
  netRevenue: number; // Doanh thu ròng = grossRevenue - platformFee
  vatRate: number; // 0, 5, 8, 10
  vatAmount: number;
  pitRate?: number; // TNCN rate for household/individual
  pitAmount?: number;
  transactionDate: string;
  invoiceNumber?: string; // Hóa đơn điện tử do sàn/cá nhân cấp
}

export interface EcommerceTaxObligation {
  period: string; // 'MM/YYYY' or 'QX/YYYY'
  platform: EcommercePlatformType;
  sellerTaxCode?: string;
  sellerName: string;
  sellerType: SellerType;

  // Revenue breakdown
  totalGrossRevenue: number;
  totalPlatformFee: number;
  totalNetRevenue: number;

  // Tax withheld & remitted by platform (NĐ 117/2025)
  vatWithheldByPlatform: number;
  pitWithheldByPlatform: number;
  totalTaxRemittedByPlatform: number;

  // Self-declared tax obligations (for revenue outside platform withholding)
  vatSelfDeclared: number;
  pitSelfDeclared: number;
  citSelfDeclared: number; // Only for enterprises

  // Compliance status
  isPlatformCompliant: boolean;
  discrepancies: string[];
  statutoryBasis: string;
}

export const STATUTORY_BASIS_ECOMMERCE_TAX =
  'Nghị định 117/2025/NĐ-CP (hiệu lực 01/07/2025) & Nghị định 68/2026/NĐ-CP (sửa đổi, hiệu lực 01/07/2026) - Quản lý thuế hoạt động TMĐT';

/**
 * Calculates tax obligations for a household/individual seller on an e-commerce platform.
 *
 * NĐ 117/2025/NĐ-CP Key Rules:
 * 1. Platform MUST withhold, declare & remit VAT & PIT for sellers on their platform
 * 2. Sellers do NOT self-declare revenue that platform has already withheld tax for
 * 3. Platform remits via "Cổng thuế điện tử TMĐT" (GDT e-commerce tax portal)
 * 4. Sellers must still register tax, reconcile platform data, and declare OUTSIDE-platform revenue
 * 5. NĐ 68/2026 amends NĐ 117/2025 - updated foreign platform list, data exchange requirements
 */
export function calculateEcommerceSellerTaxObligation(
  transactions: EcommerceTransaction[],
  period: string,
  sellerInfo: { taxCode?: string; name: string; type: SellerType; registeredVatRate?: number }
): EcommerceTaxObligation {
  const platformTransactions = transactions.filter((t) => t.sellerType === 'HOUSEHOLD_BUSINESS' || t.sellerType === 'INDIVIDUAL_BUSINESS');
  const enterpriseTransactions = transactions.filter((t) => t.sellerType === 'ENTERPRISE');

  const totalGrossRevenue = platformTransactions.reduce((sum, t) => sum + t.grossRevenue, 0);
  const totalPlatformFee = platformTransactions.reduce((sum, t) => sum + t.platformFee, 0);
  const totalNetRevenue = platformTransactions.reduce((sum, t) => sum + t.netRevenue, 0);

  // Platform withholds VAT & PIT
  const vatWithheldByPlatform = platformTransactions.reduce((sum, t) => sum + t.vatAmount, 0);
  const pitWithheldByPlatform = platformTransactions.reduce((sum, t) => sum + (t.pitAmount || 0), 0);
  const totalTaxRemittedByPlatform = vatWithheldByPlatform + pitWithheldByPlatform;

  // Check compliance
  const discrepancies: string[] = [];
  if (totalGrossRevenue > 1_000_000_000 && !sellerInfo.taxCode) {
    discrepancies.push('Hộ kinh doanh doanh thu > 1 tỷ VNĐ/năm bắt buộc đăng ký mã số thuế (NĐ 117/2025)');
  }
  if (totalGrossRevenue > 100_000_000 && sellerInfo.type === 'HOUSEHOLD_BUSINESS' && !sellerInfo.taxCode) {
    discrepancies.push('Hộ kinh doanh doanh thu > 100 triệu VNĐ/năm khuyến khích đăng ký MST');
  }

  // Check invoice compliance
  const transactionsWithoutInvoice = platformTransactions.filter((t) => !t.invoiceNumber);
  if (transactionsWithoutInvoice.length > 0) {
    discrepancies.push(`${transactionsWithoutInvoice.length} giao dịch thiếu số hóa đơn điện tử - rủi ro không khấu trừ được thuế GTGT`);
  }

  // Enterprise transactions: self-declare CIT
  const citSelfDeclared = enterpriseTransactions.reduce((sum, t) => sum + t.netRevenue * 0.2, 0); // Simplified 20% CIT

  return {
    period,
    platform: platformTransactions[0]?.platform || 'OTHER',
    sellerTaxCode: sellerInfo.taxCode,
    sellerName: sellerInfo.name,
    sellerType: sellerInfo.type,
    totalGrossRevenue,
    totalPlatformFee,
    totalNetRevenue,
    vatWithheldByPlatform,
    pitWithheldByPlatform,
    totalTaxRemittedByPlatform,
    vatSelfDeclared: 0, // Platform handles VAT for household/individual
    pitSelfDeclared: 0, // Platform handles PIT for household/individual
    citSelfDeclared,
    isPlatformCompliant: discrepancies.length === 0,
    discrepancies,
    statutoryBasis: STATUTORY_BASIS_ECOMMERCE_TAX,
  };
}

/**
 * Calculates platform's tax remittance obligation (NĐ 117/2025).
 * Platform must file monthly/quarterly via "Cổng thuế điện tử TMĐT".
 */
export interface PlatformTaxRemittance {
  platform: EcommercePlatformType;
  period: string; // 'MM/YYYY'
  totalSellers: number;
  totalGrossRevenue: number;
  totalVatRemitted: number;
  totalPitRemitted: number;
  totalTaxRemitted: number;
  filingDeadline: string; // Last day of following month
  portalUrl: string; // 'https://thuedientu.gdt.gov.vn/TMDT' (Cổng thuế điện tử TMĐT)
  statutoryBasis: string;
}

export function calculatePlatformTaxRemittance(
  allTransactions: EcommerceTransaction[],
  platform: EcommercePlatformType,
  period: string
): PlatformTaxRemittance {
  const platformTxns = allTransactions.filter((t) => t.platform === platform);
  const totalSellers = new Set(platformTxns.map((t) => t.sellerName)).size;
  const totalGrossRevenue = platformTxns.reduce((sum, t) => sum + t.grossRevenue, 0);
  const totalVatRemitted = platformTxns.reduce((sum, t) => sum + t.vatAmount, 0);
  const totalPitRemitted = platformTxns.reduce((sum, t) => sum + (t.pitAmount || 0), 0);
  const totalTaxRemitted = totalVatRemitted + totalPitRemitted;

  // Filing deadline: Last day of following month
  const [month, year] = period.split('/').map(Number);
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const filingDeadline = `${lastDay.toString().padStart(2, '0')}/${nextMonth.toString().padStart(2, '0')}/${nextYear}`;

  return {
    platform,
    period,
    totalSellers,
    totalGrossRevenue,
    totalVatRemitted,
    totalPitRemitted,
    totalTaxRemitted,
    filingDeadline,
    portalUrl: 'https://thuedientu.gdt.gov.vn/TMDT', // Cổng thuế điện tử TMĐT
    statutoryBasis: STATUTORY_BASIS_ECOMMERCE_TAX,
  };
}

/**
 * Validates if a transaction has sufficient invoice data for tax compliance.
 * NĐ 117/2025 requires e-invoices from platform or individual seller.
 */
export function validateEcommerceInvoiceCompliance(
  transaction: EcommerceTransaction
): { compliant: boolean; issues: string[]; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' } {
  const issues: string[] = [];

  if (!transaction.invoiceNumber) {
    issues.push('Thiếu số hóa đơn điện tử - không khấu trừ được thuế GTGT đầu vào');
  }

  if (transaction.sellerType === 'HOUSEHOLD_BUSINESS' && !transaction.sellerTaxCode) {
    issues.push('Hộ kinh doanh chưa cung cấp mã số thuế - rủi ro không đủ điều kiện khấu trừ');
  }

  if (transaction.vatRate === 0 && transaction.grossRevenue > 100_000_000) {
    issues.push('Doanh thu lớn nhưng thuế suất 0% - cần kiểm tra xem có thuộc diện miễn thuế hay không');
  }

  const compliant = issues.length === 0;
  const riskLevel = issues.length === 0 ? 'LOW' : issues.length <= 2 ? 'MEDIUM' : 'HIGH';

  return { compliant, issues, riskLevel };
}

/**
 * Reconciles seller's declared revenue with platform's reported data.
 * Required for annual tax finalization (Quyết toán thuế cuối năm).
 */
export function reconcileSellerWithPlatform(
  sellerDeclaredRevenue: number,
  platformReportedRevenue: number
): {
  reconciled: boolean;
  variance: number;
  variancePercent: number;
  adjustmentNeeded: 'NONE' | 'ADDITIONAL_DECLARATION' | 'REFUND_CLAIM';
  explanationVi: string;
} {
  const variance = sellerDeclaredRevenue - platformReportedRevenue;

  // Edge case: platform reports 0 but seller declares revenue = major discrepancy
  if (platformReportedRevenue === 0 && sellerDeclaredRevenue > 0) {
    return {
      reconciled: false,
      variance,
      variancePercent: 100, // Treat as 100% variance
      adjustmentNeeded: 'ADDITIONAL_DECLARATION',
      explanationVi: `Dữ liệu sàn TMĐT báo cáo 0 VNĐ doanh thu nhưng người bán tự khai báo ${new Intl.NumberFormat('vi-VN').format(sellerDeclaredRevenue)} VNĐ. Cần đối chiếu toàn bộ nguồn doanh thu và kê khai bổ sung đầy đủ.`,
    };
  }

  const variancePercent = (Math.abs(variance) / platformReportedRevenue) * 100;

  let adjustmentNeeded: 'NONE' | 'ADDITIONAL_DECLARATION' | 'REFUND_CLAIM' = 'NONE';
  let explanationVi = '';

  if (variance > 0 && variancePercent > 5) {
    adjustmentNeeded = 'ADDITIONAL_DECLARATION';
    explanationVi = `Doanh thu tự khai báo (${new Intl.NumberFormat('vi-VN').format(sellerDeclaredRevenue)}) cao hơn dữ liệu sàn (${new Intl.NumberFormat('vi-VN').format(platformReportedRevenue)}) ${variancePercent.toFixed(1)}%. Cần kê khai bổ sung phần chênh lệch ra khỏi sàn TMĐT.`;
  } else if (variance < 0 && variancePercent > 5) {
    adjustmentNeeded = 'REFUND_CLAIM';
    explanationVi = `Doanh thu tự khai báo thấp hơn dữ liệu sàn ${variancePercent.toFixed(1)}%. Cần đối chiếu lại: có thể sàn báo cáo sai hoặc người bán quên kê khai phần doanh thu.`;
  } else {
    explanationVi = `Doanh thu tự khai báo khớp với dữ liệu sàn TMĐT (chênh lệch ${variancePercent.toFixed(1)}% trong ngưỡng cho phép).`;
  }

  return {
    reconciled: variancePercent <= 5,
    variance,
    variancePercent,
    adjustmentNeeded,
    explanationVi,
  };
}